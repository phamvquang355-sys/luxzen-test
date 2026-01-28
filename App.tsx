import React, { useState } from 'react';
import { AppState, FileData, RenderOptions, UpscaleState, Tool, Resolution, AdvancedEditState, EditMode, SketchConverterState, SketchStyle, IdeaGeneratorState } from './types';
import { WEDDING_CATEGORIES, WEDDING_STYLES, COLOR_PALETTES, SURFACE_MATERIALS, TEXTILE_MATERIALS, TEXTILE_COLORS, PHOTOGRAPHY_PRESETS } from './constants';
import { generateWeddingRender } from './services/geminiService';
import { OptionSelector } from './components/OptionSelector';
import { RenderImageUpload } from './components/RenderImageUpload';
import { ImageComparator } from './components/ImageComparator';
import Upscale from './components/Upscale';
import AdvancedEdit from './components/AdvancedEdit';
import { SketchConverter } from './components/SketchConverter';
import { IdeaGenerator } from './components/IdeaGenerator'; 
import { RatingSystem } from './components/common/RatingSystem'; // Import RatingSystem

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<Tool>(Tool.RENDER);
  const [userCredits, setUserCredits] = useState<number>(100);

  // State for Render tab
  const [sourceImage, setSourceImage] = useState<FileData | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [currentRenderId, setCurrentRenderId] = useState<string | null>(null); // New: Store Render ID for rating
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [renderOptions, setRenderOptions] = useState<RenderOptions>({
    category: WEDDING_CATEGORIES[0].value,
    style: WEDDING_STYLES[0].value,
    colorPalette: COLOR_PALETTES[0].value,
    surfaceMaterial: SURFACE_MATERIALS[0].value,
    textileMaterial: TEXTILE_MATERIALS[0].value,
    textileColor1: TEXTILE_COLORS[0].value, 
    textileColor2: TEXTILE_COLORS[0].value,
    additionalPrompt: '',
    hiddenAIContext: '',
    isAutoFocus: true, 
    cameraPreset: 'CINEMATIC' 
  });

  // State for Upscale tab
  const [upscaleState, setUpscaleState] = useState<UpscaleState>({
    sourceImage: null,
    isLoading: false,
    error: null,
    upscaledImages: [],
    resolution: '1K' as Resolution,
  });

  // State for Advanced Edit tab
  const [advancedEditState, setAdvancedEditState] = useState<AdvancedEditState>({
    sourceImage: null,
    editMode: 'NOTE' as EditMode,
    refObject: null,
    annotatedBase64: null,
    clickPoint: null,
    detectedPoints: [],
    resultImage: null,
    isLoading: false,
    error: null,
    isAnnotating: false,
  });

  // State for Sketch Converter tab
  const [sketchState, setSketchState] = useState<SketchConverterState>({
    sourceImage: null,
    resultImage: null,
    isLoading: false,
    error: null,
    sketchStyle: 'pencil' as SketchStyle,
    resolution: '1K' as Resolution,
  });

  // State for Idea Generator tab
  const [ideaState, setIdeaState] = useState<IdeaGeneratorState>({
    sourceSketch: null,
    assets: [],
    isLoading: false,
    error: null,
    resultImage: null,
  });

  const handleOptionChange = <K extends keyof RenderOptions>(key: K, value: RenderOptions[K]) => {
    setRenderOptions(prev => ({ ...prev, [key]: value }));
  };
  
  const handleAutoPrompt = (prompt: string) => {
    setRenderOptions(prev => ({ ...prev, hiddenAIContext: prompt }));
    console.log("Hidden AI Context updated silently.");
  };

  const handleGenerate = async () => {
    if (!sourceImage) return;

    setAppState(AppState.GENERATING);
    try {
      // Updated to receive object with imageUrl and renderId
      const result = await generateWeddingRender(sourceImage, renderOptions);
      setGeneratedImage(result.imageUrl);
      setCurrentRenderId(result.renderId); // Store ID for rating
      setAppState(AppState.SUCCESS);
    } catch (error) {
      console.error(error);
      setAppState(AppState.ERROR);
      alert("Đã xảy ra lỗi khi tạo ảnh. Vui lòng kiểm tra khóa API và thử lại.");
    }
  };

  const createFileDataFromDataURL = (dataUrl: string): FileData => {
    const parts = dataUrl.split(';base64,');
    const mimeType = parts[0].replace('data:', '');
    const base64 = parts[1];
    return {
      base64,
      mimeType,
      objectURL: dataUrl 
    };
  };

  const handleSourceImageUpload = (data: FileData) => {
    setSourceImage(data);
    setGeneratedImage(null); 
    setCurrentRenderId(null);
    setAppState(AppState.IDLE); 
  };

  const handleUpscaleStateChange = (newState: Partial<UpscaleState>) => {
    setUpscaleState(prev => ({ ...prev, ...newState }));
  };

  const resetUpscaleTab = () => {
    setUpscaleState({
      sourceImage: null,
      isLoading: false,
      error: null,
      upscaledImages: [],
      resolution: '1K' as Resolution,
    });
  };

  const handleAdvancedEditStateChange = (newState: Partial<AdvancedEditState>) => {
    setAdvancedEditState(prev => ({ ...prev, ...newState }));
  };

  const resetAdvancedEditTab = () => {
    setAdvancedEditState({
      sourceImage: null,
      editMode: 'NOTE',
      refObject: null,
      annotatedBase64: null,
      clickPoint: null,
      detectedPoints: [],
      resultImage: null,
      isLoading: false,
      error: null,
      isAnnotating: false,
    });
  };

  const handleSketchStateChange = (newState: Partial<SketchConverterState>) => {
    setSketchState(prev => ({ ...prev, ...newState }));
  };

  const resetSketchTab = () => {
    setSketchState({
      sourceImage: null,
      resultImage: null,
      isLoading: false,
      error: null,
      sketchStyle: 'pencil',
      resolution: '1K',
    });
  };

  const handleIdeaStateChange = (newState: Partial<IdeaGeneratorState>) => {
    setIdeaState(prev => ({ ...prev, ...newState }));
  };

  const resetIdeaTab = () => {
    setIdeaState({
      sourceSketch: null,
      assets: [],
      isLoading: false,
      error: null,
      resultImage: null,
    });
  };

  const handleDeductCredits = async (cost: number, description: string) => {
    setUserCredits(prev => prev - cost);
    console.log(`Credits deducted: ${cost}. Remaining: ${userCredits - cost}. Action: ${description}`);
  };

  const handleRewardCredits = (amount: number) => {
    setUserCredits(prev => prev + amount);
  }

  const handleTransferToUpscale = () => {
    if (generatedImage) {
      setActiveTool(Tool.UPSCALE);
      setUpscaleState(prev => ({ 
        ...prev, 
        sourceImage: createFileDataFromDataURL(generatedImage),
        upscaledImages: [], 
        error: null,
        isLoading: false,
      }));
    }
  };

  const handleTransferToAdvancedEdit = () => {
    if (generatedImage) {
      setActiveTool(Tool.ADVANCED_EDIT);
      setAdvancedEditState(prev => ({ 
        ...prev, 
        sourceImage: createFileDataFromDataURL(generatedImage),
        resultImage: null, 
        error: null,
        isLoading: false,
        editMode: 'NOTE', 
        refObject: null,
        annotatedBase64: null,
        clickPoint: null,
        detectedPoints: [],
        isAnnotating: false,
      }));
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-luxury-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="h-8 w-8 text-accent-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <h1 className="text-2xl font-bold text-luxury-900 tracking-tight">
              Luxe<span className="text-accent-600 font-serif italic">Render</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTool(Tool.RENDER)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap
                ${activeTool === Tool.RENDER ? 'bg-luxury-800 text-white' : 'text-luxury-600 hover:bg-luxury-100'}
              `}
            >
              Render 3D
            </button>
            <button
              onClick={() => setActiveTool(Tool.IDEA_GENERATOR)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap flex items-center gap-1
                ${activeTool === Tool.IDEA_GENERATOR ? 'bg-luxury-800 text-white' : 'text-luxury-600 hover:bg-luxury-100'}
              `}
            >
               <span>💡</span> Ý Tưởng
            </button>
            <button
              onClick={() => setActiveTool(Tool.UPSCALE)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap
                ${activeTool === Tool.UPSCALE ? 'bg-luxury-800 text-white' : 'text-luxury-600 hover:bg-luxury-100'}
              `}
            >
              Nâng Cấp AI
            </button>
            <button
              onClick={() => setActiveTool(Tool.ADVANCED_EDIT)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap
                ${activeTool === Tool.ADVANCED_EDIT ? 'bg-luxury-800 text-white' : 'text-luxury-600 hover:bg-luxury-100'}
              `}
            >
              Chỉnh Sửa AI
            </button>
            <button
              onClick={() => setActiveTool(Tool.SKETCH_CONVERTER)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap
                ${activeTool === Tool.SKETCH_CONVERTER ? 'bg-luxury-800 text-white' : 'text-luxury-600 hover:bg-luxury-100'}
              `}
            >
              Phác Thảo
            </button>
            <span className="text-sm font-semibold text-luxury-800 ml-2 whitespace-nowrap">Credits: {userCredits}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {activeTool === Tool.RENDER && (
          <div className="flex flex-col lg:flex-row gap-8 items-start h-full">
            
            {/* LEFT: Controls */}
            <div className="w-full lg:w-1/3 space-y-8 bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-luxury-100">
              <div>
                <h2 className="text-xl font-serif font-bold text-luxury-900 mb-4">Thông Số Thiết Kế</h2>
                <div className="space-y-6">
                  
                  {/* 1. Upload */}
                  <div className="space-y-2">
                      <label className="block text-sm font-semibold text-luxury-800 uppercase tracking-wider">
                        Ảnh Gốc
                      </label>
                      <RenderImageUpload 
                        onImageUpload={handleSourceImageUpload} 
                        currentImage={sourceImage}
                        onAutoPromptGenerated={handleAutoPrompt}
                      />
                  </div>

                  {/* 2. Options */}
                  <OptionSelector
                    label="Hạng Mục"
                    options={WEDDING_CATEGORIES}
                    value={renderOptions.category}
                    onChange={(v) => handleOptionChange('category', v)}
                  />

                  <OptionSelector
                    label="Phong Cách"
                    options={WEDDING_STYLES}
                    value={renderOptions.style}
                    onChange={(v) => handleOptionChange('style', v)}
                  />

                  <OptionSelector
                    label="Bảng Màu"
                    options={COLOR_PALETTES}
                    value={renderOptions.colorPalette}
                    onChange={(v) => handleOptionChange('colorPalette', v)}
                  />

                  <OptionSelector
                    label="Vật Liệu Bề Mặt"
                    options={SURFACE_MATERIALS}
                    value={renderOptions.surfaceMaterial}
                    onChange={(v) => handleOptionChange('surfaceMaterial', v)}
                  />

                  <OptionSelector
                    label="Vật Liệu Vải"
                    options={TEXTILE_MATERIALS}
                    value={renderOptions.textileMaterial}
                    onChange={(v) => handleOptionChange('textileMaterial', v)}
                  />

                  {renderOptions.textileMaterial !== 'none' && (
                    <>
                      <OptionSelector
                        label="Màu Sắc Chính (Vải)"
                        options={TEXTILE_COLORS}
                        value={renderOptions.textileColor1}
                        onChange={(v) => handleOptionChange('textileColor1', v)}
                      />
                      <OptionSelector
                        label="Màu Sắc Phụ (Vải)"
                        options={TEXTILE_COLORS}
                        value={renderOptions.textileColor2}
                        onChange={(v) => handleOptionChange('textileColor2', v)}
                      />
                    </>
                  )}

                  <div className="p-4 bg-luxury-50 rounded-xl border border-luxury-200 mt-4">
                      <h3 className="text-sm font-bold text-luxury-900 uppercase tracking-wider mb-4">Nâng cấp Render Nhiếp Ảnh</h3>
                      <div className="flex items-center justify-between mb-4">
                          <div>
                              <span className="font-semibold block text-sm text-luxury-800">AI Auto-Focus</span>
                              <small className="text-xs text-luxury-500">AI tự xác định điểm lấy nét đẹp nhất</small>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                  type="checkbox" 
                                  className="sr-only peer" 
                                  checked={renderOptions.isAutoFocus}
                                  onChange={() => handleOptionChange('isAutoFocus', !renderOptions.isAutoFocus)}
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                      </div>

                      <div className="mb-2">
                          <OptionSelector
                              label="Chế độ Ống kính (Lens Style)"
                              options={Object.entries(PHOTOGRAPHY_PRESETS).map(([key, val]) => ({
                                  value: key,
                                  label: val.label,
                                  description: val.description
                              }))}
                              value={renderOptions.cameraPreset}
                              onChange={(v) => handleOptionChange('cameraPreset', v)}
                              variant="grid"
                          />
                      </div>
                  </div>

                  <div className="space-y-2">
                      <label className="block text-sm font-semibold text-luxury-800 uppercase tracking-wider">
                        Chi Tiết Cụ Thể
                      </label>
                      <textarea 
                        className="w-full p-3 bg-luxury-50 border border-luxury-200 rounded-lg text-luxury-900 focus:ring-2 focus:ring-accent-500 focus:border-transparent outline-none transition-all resize-none text-sm"
                        rows={3}
                        placeholder="Ví dụ: Thêm đèn chùm pha lê, đảm bảo lối đi có hiệu ứng phản chiếu, bỏ khăn phủ ghế..."
                        value={renderOptions.additionalPrompt}
                        onChange={(e) => handleOptionChange('additionalPrompt', e.target.value)}
                      />
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={!sourceImage || appState === AppState.GENERATING}
                    className={`w-full py-4 px-6 rounded-lg font-bold text-white tracking-widest shadow-lg transition-all transform hover:-translate-y-0.5
                      ${!sourceImage || appState === AppState.GENERATING 
                          ? 'bg-luxury-300 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-accent-600 to-accent-500 hover:from-accent-500 hover:to-accent-400 shadow-accent-200/50'
                        }
                    `}
                  >
                    {appState === AppState.GENERATING ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        ĐANG TẠO RENDER...
                      </span>
                    ) : 'HIỆN THỰC HÓA KHÔNG GIAN'}
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: Display */}
            <div className="w-full lg:w-2/3 min-h-[600px] flex flex-col">
                <div className="bg-white rounded-2xl shadow-xl border border-luxury-100 p-2 relative overflow-hidden flex-grow">
                    {appState === AppState.IDLE && !sourceImage && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-luxury-300 bg-luxury-50/50">
                            <svg className="w-24 h-24 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-lg font-serif italic">Tuyệt tác của bạn bắt đầu từ đây.</p>
                            <p className="text-sm">Tải lên một bản phác thảo để bắt đầu tạo render.</p>
                        </div>
                    )}

                    {appState === AppState.IDLE && sourceImage && (
                        <div className="w-full h-full flex items-center justify-center bg-black rounded-xl overflow-hidden">
                            <img src={sourceImage.objectURL} alt="Nguồn" className="max-w-full max-h-[600px] object-contain" />
                        </div>
                    )}

                    {appState === AppState.GENERATING && (
                        <div className="absolute inset-0 z-20 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center">
                            <div className="relative w-32 h-32">
                            <div className="absolute top-0 left-0 w-full h-full border-4 border-luxury-200 rounded-full animate-ping opacity-75"></div>
                            <div className="absolute top-0 left-0 w-full h-full border-4 border-accent-500 rounded-full animate-spin border-t-transparent"></div>
                            </div>
                            <h3 className="mt-8 text-xl font-serif font-bold text-luxury-800">Đang Xây Dựng Cảnh 3D...</h3>
                            <p className="text-luxury-600 mt-2">Đang áp dụng vật liệu, ánh sáng và sắp xếp hoa.</p>
                        </div>
                    )}

                    {appState === AppState.SUCCESS && generatedImage && sourceImage?.objectURL && (
                        <div className="h-full flex flex-col gap-4">
                            <ImageComparator 
                            originalImage={sourceImage.objectURL || ''} 
                            generatedImage={generatedImage} 
                            />
                            <div className="flex justify-center gap-4 py-2">
                            <a 
                                href={generatedImage} 
                                download="wedding-render-8k.png"
                                className="px-6 py-2 bg-luxury-900 text-white rounded-full text-sm font-bold hover:bg-luxury-800 transition-colors shadow-md flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                Tải Render
                            </a>
                            <button 
                                onClick={handleTransferToUpscale}
                                className="px-6 py-2 bg-purple-600 text-white rounded-full text-sm font-bold hover:bg-purple-700 transition-colors shadow-md flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101M12 12l-2 2" /></svg>
                                Nâng Cấp AI
                            </button>
                            <button 
                                onClick={handleTransferToAdvancedEdit}
                                className="px-6 py-2 bg-blue-600 text-white rounded-full text-sm font-bold hover:bg-blue-700 transition-colors shadow-md flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                Chỉnh Sửa AI
                            </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Rating System Area */}
                {appState === AppState.SUCCESS && currentRenderId && (
                    <RatingSystem 
                        renderId={currentRenderId} 
                        onRated={() => setCurrentRenderId(null)} // Hide after rated
                        onReward={handleRewardCredits}
                    />
                )}
            </div>
          </div>
        )}

        {activeTool === Tool.IDEA_GENERATOR && (
            <IdeaGenerator
                state={ideaState}
                onStateChange={handleIdeaStateChange}
                userCredits={userCredits}
                onDeductCredits={handleDeductCredits}
                onReset={resetIdeaTab}
            />
        )}

        {activeTool === Tool.UPSCALE && (
          <Upscale 
            state={upscaleState}
            onStateChange={handleUpscaleStateChange}
            userCredits={userCredits}
            onDeductCredits={handleDeductCredits}
            onReset={resetUpscaleTab}
          />
        )}

        {activeTool === Tool.ADVANCED_EDIT && (
          <AdvancedEdit 
            state={advancedEditState}
            onStateChange={handleAdvancedEditStateChange}
            userCredits={userCredits}
            onDeductCredits={handleDeductCredits}
            onReset={resetAdvancedEditTab}
          />
        )}

        {activeTool === Tool.SKETCH_CONVERTER && (
            <SketchConverter 
                state={sketchState} 
                onStateChange={handleSketchStateChange}
                userCredits={userCredits}
                onDeductCredits={handleDeductCredits}
                onReset={resetSketchTab}
            />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-luxury-100 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-luxury-400 text-sm">
          <p>© 2024 LuxeRender. Được hỗ trợ bởi Google Gemini AI.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;