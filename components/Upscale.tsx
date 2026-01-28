import React from 'react';
import { FileData, UpscaleState, UpscaleProps } from '../types';
import { Spinner } from './Spinner';
import { ImageUpload } from './common/ImageUpload';
import { ImageComparator } from './ImageComparator'; // Reuse existing ImageComparator
import { ResolutionSelector } from './common/ResolutionSelector'; // Add this import
import * as geminiService from '../services/geminiService'; // Import geminiService

// --- MAIN COMPONENT ---
const Upscale: React.FC<UpscaleProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits, onReset }) => {
    const { sourceImage, isLoading, error, upscaledImages, resolution } = state;

    const handleUpscale = async () => {
        const cost = resolution === '4K' ? 30 : 20; // Corrected cost logic
        if (userCredits < cost) {
            onStateChange({ error: `Bạn cần thêm ${cost - userCredits} Credits.` });
            return;
        }

        if (!sourceImage || !sourceImage.base64 || !sourceImage.mimeType) {
            onStateChange({ error: "Vui lòng tải ảnh gốc lên để nâng cấp." });
            return;
        }
        onStateChange({ isLoading: true, error: null });

        try {
            await onDeductCredits?.(cost, `Strict Upscale ${resolution}`);

            // PROMPT CHIẾN THUẬT: Tập trung vào "Faithful Reconstruction" (Tái tạo trung thực)
            const strictPrompt = `
                TASK: HIGH-FIDELITY PHOTOREALISTIC UPSCALING.
                ENHANCE the provided image to a hyper-realistic, high-definition 8k render.
                STRICTLY preserve ALL existing structural elements, details, colors, textures, and lighting.
                Focus on refining surface realism, adding subtle nuances to materials like fabrics, metals, and florals, and deepening volumetric lighting effects without altering the original composition or aesthetic.
                The goal is to elevate visual fidelity, not to re-interpret or hallucinate new elements for the design.
                Output Style: 8k photorealistic, cinematic quality.
            `;

            const result = await geminiService.generateHighQualityImage(
                strictPrompt, 
                resolution, 
                { // Pass the sourceImage details directly
                  mimeType: sourceImage.mimeType, 
                  base64: sourceImage.base64,
                  width: sourceImage.width,
                  height: sourceImage.height
                }
            );

            onStateChange({ upscaledImages: [result[0]] });
        } catch (err: any) {
            onStateChange({ error: "Quá trình nâng cấp gặp sự cố. Vui lòng thử lại sau." });
            console.error(err);
        } finally {
            onStateChange({ isLoading: false });
        }
    };

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 bg-zinc-900/10 rounded-2xl shadow-inner">
            <h2 className="text-3xl font-serif font-bold text-luxury-900 mb-4">
                Nâng Cấp Hình Ảnh AI
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Panel Điều khiển */}
                <div className="lg:col-span-4 space-y-6 bg-white p-6 rounded-2xl shadow-xl border border-luxury-100">
                    <ImageUpload 
                        onFileSelect={(data) => onStateChange({ sourceImage: data, upscaledImages: [] })} 
                        previewUrl={sourceImage?.objectURL || null} 
                        maxWidth={1280} // Max width for internal processing for consistency
                        quality={0.9} // Quality for internal processing for consistency
                    />
                    
                    <div className="space-y-4">
                        <label className="block text-sm font-semibold text-luxury-800 uppercase tracking-wider">
                          Độ phân giải đầu ra
                        </label>
                        <ResolutionSelector value={resolution} onChange={(val) => onStateChange({ resolution: val })} />
                    </div>

                    <div className="flex justify-between items-center p-3 bg-luxury-50 rounded-lg border border-luxury-100">
                        <span className="text-sm text-luxury-800">Phí: <b className="text-accent-600">{resolution === '4K' ? 30 : 20} Credits</b></span>
                        <span className="text-sm text-luxury-500">Số dư: {userCredits}</span>
                    </div>

                    <button 
                        onClick={handleUpscale}
                        disabled={isLoading || !sourceImage}
                        className={`w-full py-4 px-6 rounded-lg font-bold text-white tracking-widest shadow-lg transition-all transform hover:-translate-y-0.5
                            ${isLoading || !sourceImage 
                                ? 'bg-luxury-300 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 shadow-purple-200/50'
                              }
                        `}
                    >
                        {isLoading ? <Spinner /> : `NÂNG CẤP ( -${resolution === '4K' ? 30 : 20} CREDITS )`}
                    </button>
                    {error && <p className="text-red-500 text-xs text-center mt-2">{error}</p>}
                </div>

                {/* Khu vực Hiển thị Kết quả */}
                <div className="lg:col-span-8 h-[600px] bg-white rounded-2xl shadow-xl border border-luxury-100 p-2 relative overflow-hidden">
                    {upscaledImages.length > 0 && sourceImage ? (
                        <div className="h-full flex flex-col gap-4">
                            <ImageComparator 
                                originalImage={sourceImage.objectURL || ''} 
                                generatedImage={upscaledImages[0]} 
                            />
                            <div className="flex justify-center gap-4 py-2">
                                <a 
                                    href={upscaledImages[0]} 
                                    download={`upscaled-image-${resolution}.png`}
                                    className="px-6 py-2 bg-luxury-900 text-white rounded-full text-sm font-bold hover:bg-luxury-800 transition-colors shadow-md flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                    Tải Ảnh Nâng Cấp
                                </a>
                                <button 
                                    onClick={onReset}
                                    className="px-6 py-2 bg-white text-luxury-800 border border-luxury-300 rounded-full text-sm font-bold hover:bg-luxury-50 transition-colors"
                                >
                                    Nâng Cấp Mới
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full border-2 border-dashed border-luxury-300 rounded-xl flex flex-col items-center justify-center text-luxury-500 bg-luxury-50/50">
                            {isLoading ? <Spinner /> : (
                                <>
                                    <div className="text-5xl mb-4">✨</div>
                                    <p className="text-lg font-serif italic">Kết quả so sánh sẽ hiển thị tại đây</p>
                                    <p className="text-sm text-luxury-400">Tăng cường hình ảnh của bạn với chất lượng AI.</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Upscale;