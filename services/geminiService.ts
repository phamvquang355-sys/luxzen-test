import { GoogleGenAI, Type } from "@google/genai";
import { FileData, RenderOptions, Resolution, EditMode, ClickPoint, SketchStyle, IdeaAsset, LearningContext } from "../types"; 
import { PHOTOGRAPHY_PRESETS, STRUCTURE_FIDELITY_PROMPT, REALISM_MODIFIERS } from "../constants";
import { supabase } from "../supabaseClient";

const WEDDING_MATERIALS_KEYWORDS = {
  // These are now examples or fallbacks, as actual values will come from options
  florals: "high-density fresh white hydrangeas and roses, hanging wisteria, lush greenery",
  lighting: "cinematic volumetric lighting, warm amber ambient glow, professional stage spotlights, Tyndall effect"
};

// --- RETRY HELPER FOR 503 ERRORS ---
const callWithRetry = async <T>(fn: () => Promise<T>, retries = 5, delay = 3000): Promise<T> => {
    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (e: any) {
            lastError = e;
            const msg = e?.message || JSON.stringify(e);
            
            // Check for common overload signals, including nested error objects
            const isLoadError = 
                msg.includes('overloaded') || 
                msg.includes('503') || 
                e?.status === 503 || 
                e?.code === 503 || 
                e?.error?.code === 503 || 
                e?.error?.status === 'UNAVAILABLE';
            
            if (isLoadError && i < retries - 1) {
                console.warn(`Gemini Model overloaded (Attempt ${i + 1}/${retries}). Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff (3s -> 6s -> 12s -> 24s -> 48s)
                continue;
            }
            throw e;
        }
    }
    throw lastError;
};

// --- LEARNING SYSTEM FUNCTIONS (RLHF) ---

/**
 * Lấy dữ liệu học tập từ Database (RLHF Retrieval)
 */
const getLearningContext = async (category: string, style: string): Promise<LearningContext> => {
    try {
        // 1. Lấy Top 3 Master Prompt 5 sao (Dữ liệu tích cực)
        const { data: positive } = await supabase
            .from('render_history')
            .select('master_prompt')
            .eq('category', category)
            .eq('style', style)
            .eq('rating', 5)
            .order('created_at', { ascending: false })
            .limit(3);

        // 2. Lấy các Tags bị chê nhiều nhất (Dữ liệu tiêu cực)
        const { data: negative } = await supabase
            .from('render_history')
            .select('feedback_tags')
            .eq('category', category)
            .lt('rating', 3) // Lấy từ 1-2 sao
            .not('feedback_tags', 'is', null)
            .limit(10);

        // Flatten tags and find unique ones
        const allNegativeTags = negative?.flatMap(n => n.feedback_tags || []) || [];
        // Simple distinct
        const commonComplaints = Array.from(new Set(allNegativeTags));

        return {
            examples: positive?.map(p => p.master_prompt).join('\n--- EXAMPLE ---\n') || "",
            constraints: commonComplaints.slice(0, 5).join(', ')
        };
    } catch (e) {
        console.warn("Could not fetch learning context from Supabase", e);
        return { examples: "", constraints: "" };
    }
};

/**
 * Lưu lịch sử render ban đầu
 */
export const saveRenderHistory = async (options: RenderOptions, masterPrompt: string): Promise<string | null> => {
    try {
        const { data, error } = await supabase
            .from('render_history')
            .insert([
                {
                    category: options.category,
                    style: options.style,
                    master_prompt: masterPrompt,
                    rating: null // Chưa đánh giá
                }
            ])
            .select()
            .single();

        if (error) throw error;
        return data.id;
    } catch (e) {
        console.error("Failed to save render history", e);
        return null;
    }
};

/**
 * Cập nhật đánh giá và tags
 */
export const submitFeedback = async (renderId: string, rating: number, tags: string[]) => {
    const { error } = await supabase
        .from('render_history')
        .update({ 
            rating: rating, 
            feedback_tags: tags 
        })
        .eq('id', renderId);
    
    if (error) throw error;
};


// --- EXISTING UTILS ---

/**
 * Resize and compress an image to optimize for upload speed and API cost.
 */
export const resizeAndCompressImage = (
  file: File, 
  maxWidth: number = 1024, 
  quality: number = 0.8
): Promise<{ base64: string; mimeType: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height *= maxWidth / width;
            width = maxWidth;
          } else {
            width *= maxWidth / height;
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error("Could not get 2D rendering context for canvas."));
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({ 
          base64: dataUrl.split(',')[1], 
          mimeType: 'image/jpeg',
          width: width,
          height: height
        }); 
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const getEmpowermentPrompt = (selections: RenderOptions): string => {
  const autoInstructions: string[] = [];
  if (selections.category === 'none') {
    autoInstructions.push("- PHÂN TÍCH CẤU TRÚC GỐC: Nhận diện chính xác vị trí các vật thể hiện hữu. Tuyệt đối không thêm thắt các khối kiến trúc làm thay đổi bố cục gốc.");
  }
  if (selections.style === 'none') {
    autoInstructions.push("- TRÍCH XUẤT PHONG CÁCH: Phân tích các đường nét kiến trúc sẵn có trong ảnh (ví dụ: phào chỉ cổ điển, nét thẳng hiện đại) để render vật liệu đồng nhất với ngôn ngữ đó.");
  }
  if (selections.colorPalette === 'none') {
    autoInstructions.push("- BẢO TỒN BẢNG MÀU (STRICT COLOR MATCH): Thực hiện lấy mẫu màu trực tiếp từ hình ảnh gốc.");
  }
  if (selections.surfaceMaterial === 'none') {
    autoInstructions.push("- NÂNG CẤP VẬT LIỆU THỰC TẾ: Xác định vật liệu hiện có và làm nét vân bề mặt.");
  }
  if (selections.textileMaterial === 'none') {
    autoInstructions.push("- TỐI ƯU VẬT LIỆU VẢI: Phân tích các loại vải hiện có và nâng cấp chúng lên chất liệu cao cấp.");
  }
  if (selections.textileMaterial !== 'none' && selections.textileColor1 === 'none') {
    autoInstructions.push("- TỐI ƯU MÀU SẮC CHÍNH VẢI: AI sẽ chọn màu sắc chính hài hòa.");
  }
  if (selections.textileMaterial !== 'none' && selections.textileColor2 === 'none') {
    autoInstructions.push("- TỐI ƯU MÀU SẮC PHỤ VẢI: AI sẽ chọn màu sắc phụ hài hòa.");
  }

  if (autoInstructions.length === 0) return "";
  return `
--- CHẾ ĐỘ AI TUÂN THỦ TỐI ĐA (STRICT ADHERENCE MODE) ---
Nhiệm vụ của bạn là 'Diễn họa phục hồi'. Hãy coi hình ảnh gốc là tiêu chuẩn vàng về màu sắc và vật liệu:
${autoInstructions.join('\n')}
MỤC TIÊU: Tạo ra bản render 8k siêu thực nhưng khi đặt cạnh ảnh gốc, người xem phải thấy sự đồng nhất 100% về màu sắc và linh hồn của vật liệu.
-------------------------------------------------------
  `;
};

export const generatePromptFromImageAndText = async (
  image: FileData, 
  instruction: string
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await callWithRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: instruction },
          { inlineData: { mimeType: image.mimeType, data: image.base64 } }
        ]
      },
      config: { temperature: 0.4 }
    }));
    return response.text || "Không thể phân tích ảnh.";
  } catch (error) {
    console.error("Auto-Prompt Generation Error:", error);
    throw error;
  }
};

export const generateRenderPrompt = (
  basePrompt: string, 
  style: string, 
  isAutoFocus: boolean,
  presetKey: string
) => {
  const preset = PHOTOGRAPHY_PRESETS[presetKey as keyof typeof PHOTOGRAPHY_PRESETS] || PHOTOGRAPHY_PRESETS.CINEMATIC;
  
  const focusPrompt = isAutoFocus 
    ? "AI AUTOMATIC FOCUS: Identify the most prominent decorative element and apply a sharp photographic focus to it, creating a natural depth of field."
    : "MANUAL FOCUS: Keep the sharpness consistent across the designated focal area.";

  return `
    IMAGE TYPE: Wedding Design Render.
    CORE INSTRUCTION: ${STRUCTURE_FIDELITY_PROMPT}
    
    SUBJECT DESCRIPTION: ${basePrompt}.
    VISUAL STYLE: ${style}.
    PHOTOGRAPHY SETTINGS: ${preset.prompt}.
    FOCUS CONTROL: ${focusPrompt}.
    
    QUALITY STANDARDS: ${REALISM_MODIFIERS}.
    
    FINAL NOTE: Ensure the materials like glass, silk, and flowers look authentic under the specified lighting.
  `;
};

// --- UPDATED MAIN RENDER FUNCTION WITH LEARNING ---

export const generateWeddingRender = async (
  sourceImage: FileData,
  options: RenderOptions
): Promise<{ imageUrl: string, renderId: string | null }> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please set REACT_APP_GEMINI_API_KEY or process.env.API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // STEP 0: RETRIEVE LEARNING CONTEXT (RLHF)
  console.log("Step 0: Retrieving AI Learning Context from Supabase...");
  const learning = await getLearningContext(options.category, options.style);
  
  const empowermentPrompt = getEmpowermentPrompt(options);

  // STEP 1: PROMPT CONSTRUCTION
  let masterPrompt = "";

  // Construct textile material and color string
  let textileDetails = '';
  if (options.textileMaterial !== 'none') {
    textileDetails += options.textileMaterial;
    if (options.textileColor1 !== 'none' && options.textileColor2 !== 'none') {
      textileDetails += ` in a primary color of ${options.textileColor1} and a secondary color of ${options.textileColor2}`;
    } else if (options.textileColor1 !== 'none') {
      textileDetails += ` in ${options.textileColor1}`;
    } else if (options.textileColor2 !== 'none') {
      textileDetails += ` with accents of ${options.textileColor2}`;
    }
  } else {
    textileDetails = 'appropriate luxury fabrics and draping based on context';
  }

  const baseDescription = `
    Analyze this wedding sketch/3D base.
    CONTEXT: ${options.category !== 'none' ? options.category : 'wedding event space'}.
    STYLE: ${options.style !== 'none' ? options.style : 'high-end luxury wedding'}.
    PALETTE: ${options.colorPalette !== 'none' ? options.colorPalette : 'harmonious elegant palette'}.
    MATERIALS: ${options.surfaceMaterial !== 'none' ? options.surfaceMaterial : 'appropriate luxury materials based on context'} for flooring and prominent surfaces.
    TEXTILE MATERIALS: ${textileDetails}.
    FLORALS: ${WEDDING_MATERIALS_KEYWORDS.florals}.
    LIGHTING: ${WEDDING_MATERIALS_KEYWORDS.lighting}.
    USER DETAILS: ${options.additionalPrompt}.
    ${empowermentPrompt}
  `;

  // Inject Learning Context into the Analysis Prompt
  const learningPromptInjection = `
    [INTERNAL KNOWLEDGE BASE - DO NOT REVEAL]:
    I have analyzed past successful renders for this style (${options.style}) and category (${options.category}).
    
    SUCCESSFUL PATTERNS (EMULATE THESE):
    ${learning.examples ? learning.examples : "No specific patterns yet."}
    
    KNOWN MISTAKES (STRICTLY AVOID):
    ${learning.constraints ? `Avoid these specific issues complained by users: ${learning.constraints}` : "No specific constraints."}
  `;

  if (options.hiddenAIContext) {
      console.log("Step 1: Using Mixed Prompt Strategy (Hidden Context Available)...");
      masterPrompt = generateRenderPrompt(
          `${baseDescription}\n${learningPromptInjection}\nCONTEXTUAL ANALYSIS FROM SOURCE: ${options.hiddenAIContext}`,
          options.style,
          options.isAutoFocus,
          options.cameraPreset
      );
  } else {
      console.log("Step 1: Analyzing structure with Gemini Flash (Fallback)...");
      const analysisPrompt = `
        ${baseDescription}
        ${learningPromptInjection}
        1. Identify the exact perspective: (e.g., eye-level, wide angle).
        2. Identify structural anchors: (e.g., center aisle, stage placement, ceiling height).
        3. Generate a comprehensive description of the scene that can be used to re-render it photorealistically.
        
        Return ONLY the description.
      `;

      try {
          const reasoningResponse = await callWithRetry(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { text: analysisPrompt },
                    { inlineData: { mimeType: sourceImage.mimeType, data: sourceImage.base64 } }
                ]
            },
            config: { temperature: 0.2 }
          }));
          
          const sceneDescription = reasoningResponse.text || baseDescription;
          masterPrompt = generateRenderPrompt(
              sceneDescription,
              options.style,
              options.isAutoFocus,
              options.cameraPreset
          );
          
      } catch (e) {
          console.warn("Reasoning step failed, falling back to basic prompt", e);
          masterPrompt = generateRenderPrompt(
              baseDescription,
              options.style,
              options.isAutoFocus,
              options.cameraPreset
          );
      }
  }

  // STEP 2: RENDERING
  console.log("Step 2: Rendering with Gemini Pro Image...");
  try {
    const renderResponse = await callWithRetry(() => ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { text: masterPrompt },
          { inlineData: { mimeType: sourceImage.mimeType, data: sourceImage.base64 } }
        ]
      },
      config: {
        systemInstruction: "You are a specialized 3D Wedding Visualizer. Transform the input sketch into a photorealistic render following the prompt exactly."
      }
    }));

    if (renderResponse.candidates && renderResponse.candidates.length > 0) {
        const content = renderResponse.candidates[0].content;
        
        if (content && content.parts) {
            for (const part of content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    
                    // SAVE HISTORY TO SUPABASE
                    const renderId = await saveRenderHistory(options, masterPrompt);
                    
                    return { imageUrl, renderId };
                }
            }
        }
    }
    
    throw new Error("No image generated in the response.");

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

export const generateHighQualityImage = async (
  prompt: string,
  resolution: Resolution,
  sourceImage: { mimeType: string; base64: string; width?: number; height?: number } 
): Promise<string[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please set REACT_APP_GEMINI_API_KEY or process.env.API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const contentsParts = [];
  contentsParts.push({ inlineData: { mimeType: sourceImage.mimeType, data: sourceImage.base64 } });
  contentsParts.push({ text: prompt });

  const aspectRatio = sourceImage.width && sourceImage.height
    ? (sourceImage.width / sourceImage.height > 1.5 ? "16:9" : (sourceImage.width / sourceImage.height > 1.0 ? "4:3" : (sourceImage.width / sourceImage.height < 0.6 ? "9:16" : "3:4")))
    : "16:9";

  try {
    const response = await callWithRetry(() => ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', 
      contents: { parts: contentsParts },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
          imageSize: resolution,
        },
        systemInstruction: "You are an expert image upscaler."
      },
    }));

    const generatedImageUrls: string[] = [];
    if (response.candidates && response.candidates.length > 0) {
      for (const candidate of response.candidates) {
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
              generatedImageUrls.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
            }
          }
        }
      }
    }
    if (generatedImageUrls.length === 0) {
      throw new Error("No image data returned from generateHighQualityImage.");
    }
    return generatedImageUrls;

  } catch (error) {
    console.error("Gemini High Quality Image Generation Error:", error);
    throw error;
  }
};

export const generateAdvancedEdit = async (
  sourceImageBase64: string,
  sourceImageMimeType: string,
  editMode: EditMode,
  secondaryImageData?: { base64: string; mimeType: string }, 
  targetClickPoints?: ClickPoint[], 
  additionalPrompt?: string 
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [
    { inlineData: { mimeType: sourceImageMimeType, data: sourceImageBase64 } }
  ];
  let systemInstruction = "";
  let userPrompt = "";

  if (editMode === 'NOTE') {
    if (!secondaryImageData) throw new Error("Annotated image required");
    parts.push({ inlineData: { mimeType: secondaryImageData.mimeType, data: secondaryImageData.base64 } });
    const userInstructionText = additionalPrompt ? `USER INSTRUCTIONS: ${additionalPrompt}` : "Follow annotations.";
    userPrompt = `TASK: PHOTOREALISTIC EDITING.\n${userInstructionText}`;
    systemInstruction = "You are an AI image editor.";

  } else if (editMode === 'SWAP') {
    if (!secondaryImageData || !targetClickPoints) throw new Error("Swap data required");
    parts.push({ inlineData: { mimeType: secondaryImageData.mimeType, data: secondaryImageData.base64 } });
    const clickPointsDescription = targetClickPoints.map(p => `(X:${p.x}%, Y:${p.y}%)`).join(', ');
    userPrompt = `TASK: OBJECT REPLACEMENT at ${clickPointsDescription}.`;
    systemInstruction = "AI object replacement specialist.";
  }

  parts.push({ text: userPrompt });

  try {
    const response = await callWithRetry(() => ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', 
      contents: { parts: parts }, 
      config: { systemInstruction }
    }));
    if (response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
       return `data:${response.candidates[0].content.parts[0].inlineData.mimeType};base64,${response.candidates[0].content.parts[0].inlineData.data}`;
    }
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Advanced Edit Error:", error);
    throw error;
  }
};

export const detectSimilarObjects = async (base64: string, mime: string, prompt: string): Promise<ClickPoint[]> => {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await callWithRetry(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { mimeType: mime, data: base64 } }, { text: prompt }] },
            config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } } } } }
        }));
        const jsonStr = response.text?.trim();
        return jsonStr ? JSON.parse(jsonStr) : [];
    } catch (e) {
        throw e;
    }
};

export const generateSketch = async (base64: string, mime: string, style: SketchStyle, res: Resolution): Promise<string> => {
     if (!process.env.API_KEY) throw new Error("API Key missing");
     const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
     try {
         const response = await callWithRetry(() => ai.models.generateContent({
             model: 'gemini-2.5-flash-image',
             contents: { parts: [{ inlineData: { mimeType: mime, data: base64 } }, { text: `High quality ${style} sketch.` }] }
         }));
         if (response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
            return `data:${response.candidates[0].content.parts[0].inlineData.mimeType};base64,${response.candidates[0].content.parts[0].inlineData.data}`;
         }
         throw new Error("No sketch generated");
     } catch (e) {
         throw e;
     }
};

// --- IDEA GENERATOR WITH MULTIMODAL COMPOSITING ---

// Helper: Convert coordinates to semantic descriptions
const getLocationDescription = (x: number, y: number): string => {
    let vertical = "";
    if (y < 35) vertical = "Top/Background";
    else if (y > 65) vertical = "Bottom/Foreground";
    else vertical = "Middle ground";

    let horizontal = "";
    if (x < 35) horizontal = "Left side";
    else if (x > 65) horizontal = "Right side";
    else horizontal = "Center";

    return `${vertical} - ${horizontal} (approx ${x}%, ${y}%)`;
};

export const generateIdeaRender = async (sketch: FileData, assets: IdeaAsset[], onStatus?: (s:string)=>void): Promise<string> => {
     if (!process.env.API_KEY) throw new Error("API Key missing");
     const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
     
     if (onStatus) onStatus("Đang phân tích và chuẩn bị dữ liệu hình ảnh...");

     // 1. Prepare parts for the multimodal request
     // Part 0: The base sketch
     const requestParts: any[] = [
        { inlineData: { mimeType: sketch.mimeType, data: sketch.base64 } }
     ];

     // 2. Build the descriptive prompt mapping assets
     let assetInstructions = "TASK: COMPOSITE RENDERING.\nBASE IMAGE: The first image provided is the 'Base Sketch'.\n\nOBJECT PLACEMENT INSTRUCTIONS:\n";
     
     assets.forEach((asset, index) => {
         // Add asset image to request parts if available
         if (asset.image) {
             requestParts.push({ inlineData: { mimeType: asset.image.mimeType, data: asset.image.base64 } });
             // The asset image index in the parts array is index + 1 (since sketch is 0)
             assetInstructions += `\n[OBJECT ${index + 1}]: Use the image provided in Part #${index + 2} as a visual reference.\n`;
         } else {
             assetInstructions += `\n[OBJECT ${index + 1}]: No visual reference provided, generate based on label: "${asset.label}".\n`;
         }

         const location = getLocationDescription(asset.x, asset.y);
         assetInstructions += `   - IDENTITY: ${asset.label}\n`;
         assetInstructions += `   - LOCATION: Place this object at the ${location} of the scene.\n`;
         assetInstructions += `   - INTEGRATION: Blend it realistically into the environment with correct lighting and perspective matching the Base Sketch.\n`;
     });

     const masterPrompt = `
     ${assetInstructions}

     FINAL RENDERING RULES:
     1. PRESERVE STRUCTURE: Keep the architectural layout of the 'Base Sketch' exactly as is.
     2. REALISM: Render the entire scene as a high-end luxury wedding photograph (8k, cinematic lighting).
     3. MATERIALS: Use the visual references provided for the objects to match their texture and color exactly.
     4. HARMONY: Ensure all placed objects cast correct shadows and reflect the environment lighting.
     `;

     requestParts.push({ text: masterPrompt });

     // 3. Render
     if (onStatus) onStatus("Đang thực hiện Render tổng hợp đa phương thức...");
     
     try {
         const response = await callWithRetry(() => ai.models.generateContent({
            // Using Pro model for best multimodal reasoning and image compositing
            model: 'gemini-3-pro-image-preview', 
            contents: { parts: requestParts },
            config: {
                systemInstruction: "You are a professional 3D Compositor and Architectural Visualizer. Your goal is to take a base sketch and realistically populate it with specific reference objects at specific locations, creating a cohesive, photorealistic final image."
            }
         }));

         if (response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
            return `data:${response.candidates[0].content.parts[0].inlineData.mimeType};base64,${response.candidates[0].content.parts[0].inlineData.data}`;
         }
         throw new Error("Idea render failed: No image data.");
     } catch (e) {
         console.error("Render Error:", e);
         throw e;
     }
};