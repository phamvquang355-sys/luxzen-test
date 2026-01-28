import React, { useState } from 'react';
import { SketchConverterProps } from '../types';
import * as geminiService from '../services/geminiService';
import { Spinner } from './Spinner';
import { ImageUpload } from './common/ImageUpload';
import { ImageComparator } from './ImageComparator';
import { OptionSelector } from './OptionSelector';
import ImagePreviewModal from './common/ImagePreviewModal';

const styleOptions = [
    { value: 'pencil', label: 'Bút chì (Classic)' },
    { value: 'architectural', label: 'Kiến trúc (Line Art)' },
    { value: 'charcoal', label: 'Than củi (Artistic)' },
    { value: 'watercolor', label: 'Màu nước (Luxury)' },
];

export const SketchConverter: React.FC<SketchConverterProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits }) => {
    const { sourceImage, isLoading, error, resultImage, sketchStyle } = state;
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    
    // Thiết lập mức giá cố định 10 Credits cho mô hình Gemini 2.5 Flash
    const FLASH_COST = 10;

    const handleGenerate = async () => {
        if (onDeductCredits && userCredits < FLASH_COST) {
             onStateChange({ error: `Số dư không đủ. Cần ${FLASH_COST} Credits để sử dụng Gemini 2.5 Flash.` });
             return;
        }

        if (!sourceImage) {
            onStateChange({ error: 'Vui lòng tải lên ảnh phối cảnh hoặc ảnh chụp không gian.' });
            return;
        }

        onStateChange({ isLoading: true, error: null, resultImage: null });
        setStatusMessage('Gemini 2.5 Flash đang phân tích...');

        try {
            if (onDeductCredits) {
                await onDeductCredits(FLASH_COST, `Sketch Converter (Gemini 2.5 Flash) - Style: ${sketchStyle}`);
            }

            const resultUrl = await geminiService.generateSketch(
                sourceImage.base64,
                sourceImage.mimeType,
                sketchStyle,
                '1K'
            );

            onStateChange({ resultImage: resultUrl });
            
        } catch (err: any) {
            onStateChange({ error: "Không thể tạo bản phác thảo. Vui lòng thử lại sau." });
            console.error(err);
        } finally {
            onStateChange({ isLoading: false });
            setStatusMessage(null);
        }
    };

    const handleDownload = async () => {
        if (!resultImage) return;
        setIsDownloading(true);
        // Simple download trigger
        const link = document.createElement('a');
        link.href = resultImage;
        link.download = `sketch-flash-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsDownloading(false);
    };

    return (
        <div className="flex flex-col gap-8 p-4">
            {previewImage && <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />}
            
            <div className="flex flex-col">
                <h2 className="text-3xl font-serif font-bold text-luxury-900">Sketch Converter Pro</h2>
                <p className="text-luxury-500 italic">Powered by Gemini 2.5 Image Flash • Hiệu suất cao • Kết quả tức thì</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Panel Điều khiển */}
                <div className="lg:col-span-4 space-y-6 bg-white p-6 rounded-2xl shadow-xl border border-luxury-100">
                    <ImageUpload 
                        onFileSelect={(f) => onStateChange({ sourceImage: f, resultImage: null })} 
                        previewUrl={sourceImage?.objectURL || null} 
                    />
                    
                    <OptionSelector 
                        id="style" 
                        label="Phong cách Sketch" 
                        options={styleOptions} 
                        value={sketchStyle} 
                        onChange={(v) => onStateChange({ sketchStyle: v as any })} 
                        variant="grid"
                    />

                    <button 
                        onClick={handleGenerate} 
                        disabled={isLoading || !sourceImage || userCredits < FLASH_COST} 
                        className={`w-full py-4 rounded-xl font-bold text-white transition-all shadow-lg active:scale-95 ${
                            isLoading ? 'bg-luxury-300' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                        }`}
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-2">
                                <Spinner /> {statusMessage}
                            </div>
                        ) : `Bắt đầu Render 3D Realism (10 Credits)`}
                    </button>
                    
                    {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs border border-red-100">{error}</div>}
                </div>

                {/* Panel Hiển thị */}
                <div className="lg:col-span-8 bg-zinc-50 rounded-2xl border-2 border-dashed border-luxury-200 overflow-hidden relative min-h-[500px]">
                    {resultImage && sourceImage ? (
                        <div className="h-full flex flex-col p-4">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-xs font-bold uppercase tracking-wider text-luxury-400 bg-white px-3 py-1 rounded-full shadow-sm">Kết quả Flash</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setPreviewImage(resultImage)} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 text-gray-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                    </button>
                                    <button 
                                        onClick={handleDownload} 
                                        disabled={isDownloading}
                                        className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold flex items-center gap-2"
                                    >
                                        {isDownloading ? <Spinner /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                                        Tải ảnh
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 rounded-xl overflow-hidden bg-white shadow-2xl">
                                <ImageComparator originalImage={sourceImage.objectURL || ''} generatedImage={resultImage} />
                            </div>
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-luxury-300">
                            {isLoading ? (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="relative">
                                        <div className="absolute inset-0 rounded-full blur-xl bg-purple-400/30 animate-pulse"></div>
                                        <Spinner />
                                    </div>
                                    <p className="font-medium animate-pulse">{statusMessage}</p>
                                </div>
                            ) : (
                                <>
                                    <div className="text-5xl mb-4 opacity-50">✨</div>
                                    <p className="font-serif italic text-lg text-luxury-400">Chọn ảnh phối cảnh để bắt đầu trải nghiệm Flash</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};