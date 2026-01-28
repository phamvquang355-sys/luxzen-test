import React, { useState, useRef, useEffect } from 'react';
import { FileData, AdvancedEditProps, EditMode, ClickPoint } from '../types';
import * as geminiService from '../services/geminiService';
import { Spinner } from './Spinner';
import { ImageUpload } from './common/ImageUpload';
import { ImageComparator } from './ImageComparator';
import { AnnotationCanvas } from './AnnotationCanvas';
import { PointSelectorModal } from './PointSelectorModal'; // Import the new modal

const AI_EDIT_COST = 35; // Credits for Advanced AI editing
const DETECTION_COST = 5; // Credits for detecting similar objects (still defined here for cost management, but logic moved)

const AdvancedEdit: React.FC<AdvancedEditProps> = ({ state, onStateChange, userCredits, onDeductCredits, onReset }) => {
    const { sourceImage, editMode, refObject, annotatedBase64, clickPoint, detectedPoints, resultImage, isLoading, error, isAnnotating, additionalPrompt } = state;
    const [isPointSelectionModalOpen, setIsPointSelectionModalOpen] = useState(false); // New state for modal

    const handleFileSelect = (data: FileData) => {
        onStateChange({ sourceImage: data, annotatedBase64: null, resultImage: null, error: null, clickPoint: null, refObject: null, isAnnotating: false, detectedPoints: [] });
    };

    const handleRefObjectSelect = (data: FileData) => {
        onStateChange({ refObject: data, resultImage: null, error: null });
    };

    const handleSetEditMode = (mode: EditMode) => {
        // Fix: Removed 'isPointSelectionModalOpen' as it's a local state and not part of AdvancedEditState
        onStateChange({ editMode: mode, annotatedBase64: null, clickPoint: null, resultImage: null, error: null, refObject: null, detectedPoints: [] });
        setIsPointSelectionModalOpen(false); // Manually set local state
    };

    const handleStartAnnotation = () => {
        if (!sourceImage) {
            onStateChange({ error: "Vui lòng tải ảnh gốc lên trước." });
            return;
        }
        onStateChange({ isAnnotating: true, error: null });
    };

    const handleSaveAnnotation = (b64: string) => {
        onStateChange({ annotatedBase64: b64, isAnnotating: false });
    };

    const handleCancelAnnotation = () => {
        onStateChange({ isAnnotating: false });
    };

    // Removed handleClickPoint as it's now handled by the modal

    // Callback from PointSelectorModal
    const handleSavePointSelection = (point: ClickPoint, newDetectedPoints: ClickPoint[]) => {
        onStateChange({ 
            clickPoint: point, 
            detectedPoints: newDetectedPoints, 
            resultImage: null, 
            error: null 
        });
        setIsPointSelectionModalOpen(false);
    };

    const handleGenerate = async () => {
        if (!sourceImage) {
            onStateChange({ error: "Vui lòng tải ảnh gốc lên." });
            return;
        }

        if (editMode === 'NOTE' && !annotatedBase64) {
            onStateChange({ error: "Vui lòng hoàn tất chú thích trước." });
            return;
        }

        if (editMode === 'SWAP' && (!refObject || !clickPoint)) {
            onStateChange({ error: "Vui lòng tải ảnh mẫu và chọn điểm thay thế." });
            return;
        }

        if (userCredits < AI_EDIT_COST) {
            onStateChange({ error: `Bạn cần ${AI_EDIT_COST} Credits để thực hiện.` });
            return;
        }

        onStateChange({ isLoading: true, error: null });

        try {
            await onDeductCredits?.(AI_EDIT_COST, `Advanced Edit (${editMode})`);

            let result = '';
            if (editMode === 'NOTE' && annotatedBase64) {
                result = await geminiService.generateAdvancedEdit(
                    sourceImage.base64,
                    sourceImage.mimeType,
                    'NOTE',
                    { base64: annotatedBase64, mimeType: 'image/jpeg' }, // AnnotationCanvas exports JPEG
                    undefined,
                    additionalPrompt
                );
            } else if (editMode === 'SWAP' && refObject && clickPoint) {
                // If detectedPoints exist, use them for batch swap. Otherwise, use the single clickPoint.
                const targetPointsForSwap = detectedPoints.length > 0 ? detectedPoints : [clickPoint];
                
                result = await geminiService.generateAdvancedEdit(
                    sourceImage.base64,
                    sourceImage.mimeType,
                    'SWAP',
                    { base64: refObject.base64, mimeType: refObject.mimeType },
                    targetPointsForSwap // Pass the array of target points
                );
            }
            onStateChange({ resultImage: result });
        } catch (err: any) {
            onStateChange({ error: "Quá trình chỉnh sửa gặp sự cố. Vui lòng thử lại sau." });
            console.error("Advanced Edit Error:", err);
        } finally {
            onStateChange({ isLoading: false });
        }
    };

    const resetCurrentTab = () => {
        onReset();
    };

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 bg-zinc-900/10 rounded-2xl shadow-inner">
            <h2 className="text-3xl font-serif font-bold text-luxury-900 mb-4">
                Chỉnh Sửa Nâng Cao AI
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* PANEL ĐIỀU KHIỂN */}
                <div className="lg:col-span-4 space-y-6 bg-white p-6 rounded-2xl shadow-xl border border-luxury-100">
                    <h3 className="text-xl font-serif font-bold text-luxury-900 mb-4">Đầu Vào & Cài Đặt</h3>

                    {/* 1. Tải ảnh gốc */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-luxury-800 uppercase tracking-wider">
                            1. Tải Ảnh Gốc (Cảnh Chính)
                        </label>
                        <ImageUpload 
                            onFileSelect={handleFileSelect} 
                            previewUrl={sourceImage?.objectURL || null}
                            maxWidth={1280} // Optimal for detail preservation
                            quality={0.9}
                        />
                    </div>
                    
                    {sourceImage && (
                        <div className="mt-6 space-y-4">
                            <label className="block text-sm font-semibold text-luxury-800 uppercase tracking-wider">
                                2. Chọn Kiểu Chỉnh Sửa
                            </label>
                            <div className="flex gap-2 p-1 bg-luxury-50 rounded-lg">
                                <button 
                                    onClick={() => handleSetEditMode('NOTE')}
                                    className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${editMode === 'NOTE' ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg' : 'bg-white text-luxury-800 hover:bg-luxury-100'}`}
                                >
                                    VẼ GHI CHÚ ✍️
                                </button>
                                <button 
                                    onClick={() => handleSetEditMode('SWAP')}
                                    className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${editMode === 'SWAP' ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg' : 'bg-white text-luxury-800 hover:bg-luxury-100'}`}
                                >
                                    THAY THẾ VẬT THỂ 🪑
                                </button>
                            </div>
                        </div>
                    )}

                    {editMode === 'NOTE' && sourceImage && (
                        <div className="mt-6 animate-in fade-in slide-in-from-top-4 space-y-4">
                            <label className="block text-xs font-bold text-luxury-900 uppercase tracking-widest">
                                3. Ghi chú trực quan & Văn bản
                            </label>
                            
                            {!annotatedBase64 && !isAnnotating && (
                                <button
                                    onClick={handleStartAnnotation}
                                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md"
                                >
                                    BẮT ĐẦU CHÚ THÍCH
                                </button>
                            )}

                            {(annotatedBase64 || isAnnotating) && (
                                <button
                                    onClick={handleStartAnnotation}
                                    className={`w-full py-3 rounded-lg font-bold transition-all shadow-md flex items-center justify-center gap-2 ${annotatedBase64 ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}
                                >
                                    {annotatedBase64 ? '✅ ĐÃ VẼ GHI CHÚ' : '✍️ ĐANG VẼ...'}
                                </button>
                            )}

                             {/* Textarea for additional prompts */}
                            <div className="space-y-2 mt-4">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Mô tả chi tiết yêu cầu</label>
                                <textarea
                                    value={additionalPrompt || ''}
                                    onChange={(e) => onStateChange({ additionalPrompt: e.target.value })}
                                    placeholder="Ví dụ: Thay bình hoa cũ bằng bình hoa pha lê, thêm ánh sáng vàng ấm..."
                                    className="w-full p-3 bg-luxury-50 border border-luxury-200 rounded-xl focus:ring-2 focus:ring-accent-400 outline-none text-slate-700 text-sm h-32 resize-none"
                                />
                            </div>
                        </div>
                    )}
                    
                    {editMode === 'SWAP' && sourceImage && (
                        <div className="mt-6 animate-in fade-in slide-in-from-top-4 space-y-4">
                            <label className="block text-sm font-semibold text-luxury-800 uppercase tracking-wider">
                                3. Tải Mẫu Vật Thể Mới
                            </label>
                            <ImageUpload 
                                onFileSelect={handleRefObjectSelect} 
                                previewUrl={refObject?.objectURL || null}
                                maxWidth={512} // Smaller for reference object
                                quality={0.8}
                            />
                            
                            <label className="block text-sm font-semibold text-luxury-800 uppercase tracking-wider mt-4">
                                4. Chọn Vị Trí Thay Thế Trên Ảnh Gốc
                            </label>
                            <button
                                onClick={() => setIsPointSelectionModalOpen(true)}
                                className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md"
                                disabled={isLoading}
                            >
                                {clickPoint ? "Thay Đổi Vị Trí Đã Chọn" : "Chọn Vị Trí Thay Thế"}
                                {clickPoint && <span className="ml-2 text-white/80">({Math.round(clickPoint.x)}%, {Math.round(clickPoint.y)}%)</span>}
                            </button>
                            {clickPoint && (
                                <p className="text-xs text-luxury-600 mt-2 text-center">
                                    Đã chọn điểm. {detectedPoints.length > 0 ? `Đã tìm thấy ${detectedPoints.length} vật thể tương tự.` : ''}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex justify-between items-center p-3 bg-luxury-50 rounded-lg border border-luxury-100 mt-6">
                        <span className="text-sm text-luxury-800">Phí chỉnh sửa: <b className="text-accent-600">{AI_EDIT_COST} Credits</b></span>
                        <span className="text-sm text-luxury-500">Số dư: {userCredits}</span>
                    </div>

                    <button 
                        onClick={handleGenerate}
                        disabled={isLoading || !sourceImage || (editMode === 'NOTE' && !annotatedBase64) || (editMode === 'SWAP' && (!refObject || !clickPoint))}
                        className={`w-full py-4 px-6 rounded-lg font-bold text-white tracking-widest shadow-lg transition-all transform hover:-translate-y-0.5
                            ${isLoading || !sourceImage || (editMode === 'NOTE' && !annotatedBase64) || (editMode === 'SWAP' && (!refObject || !clickPoint))
                                ? 'bg-luxury-300 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-accent-600 to-accent-500 hover:from-accent-500 hover:to-accent-400 shadow-accent-200/50'
                            }
                        `}
                    >
                        {isLoading ? <Spinner /> : "BẮT ĐẦU CHỈNH SỬA ✨"}
                    </button>
                    {error && <p className="text-red-500 text-xs text-center mt-2">{error}</p>}
                    
                    {resultImage && (
                        <div className="flex justify-center gap-4 py-2 mt-4">
                            <a 
                                href={resultImage} 
                                download="ai-edited-image.png"
                                className="px-6 py-2 bg-luxury-900 text-white rounded-full text-sm font-bold hover:bg-luxury-800 transition-colors shadow-md flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                Tải Ảnh Chỉnh Sửa
                            </a>
                            <button 
                                onClick={resetCurrentTab}
                                className="px-6 py-2 bg-white text-luxury-800 border border-luxury-300 rounded-full text-sm font-bold hover:bg-luxury-50 transition-colors"
                            >
                                Chỉnh Sửa Mới
                            </button>
                        </div>
                    )}
                </div>

                {/* KHU VỰC HIỂN THỊ CHÍNH */}
                <div className="lg:col-span-8 h-full min-h-[600px] bg-white rounded-2xl shadow-xl border border-luxury-100 p-2 relative overflow-hidden">
                    {!sourceImage && (
                        <div className="flex flex-col items-center justify-center h-full text-luxury-300 bg-luxury-50/50">
                            <div className="text-5xl mb-4">✨</div>
                            <p className="text-lg font-serif italic">Đang đợi ảnh thiết kế của bạn...</p>
                        </div>
                    )}

                    {sourceImage && !resultImage && (
                        <div className="relative w-full h-full">
                            {editMode === 'NOTE' && (annotatedBase64 || !isAnnotating) && ( // Show source or annotated image
                                <div className="w-full h-full flex items-center justify-center bg-black rounded-xl overflow-hidden">
                                    <img src={annotatedBase64 ? `data:image/jpeg;base64,${annotatedBase64}` : sourceImage.objectURL} alt="Nguồn để chú thích" className="max-w-full max-h-[600px] object-contain" />
                                </div>
                            )}
                            {editMode === 'SWAP' && (
                                <div className="relative w-full h-full flex items-center justify-center bg-black rounded-xl overflow-hidden">
                                    <img 
                                        src={sourceImage.objectURL} 
                                        alt="Nguồn để thay thế"
                                        className="max-w-full max-h-[600px] object-contain"
                                    />
                                    {clickPoint && (
                                        <div className="absolute w-6 h-6 bg-accent-500/50 border-2 border-white rounded-full animate-pulse"
                                             style={{ left: `${clickPoint.x}%`, top: `${clickPoint.y}%`, transform: 'translate(-50%, -50%)' }} />
                                    )}
                                    {detectedPoints.map((point, index) => (
                                        <div 
                                            key={`detected-${index}`}
                                            className="absolute w-4 h-4 bg-red-500/50 border-1 border-white rounded-full"
                                            style={{ left: `${point.x}%`, top: `${point.y}%`, transform: 'translate(-50%, -50%)' }} 
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {resultImage && sourceImage && (
                        <div className="h-full">
                            <ImageComparator originalImage={sourceImage.objectURL || ''} generatedImage={resultImage} />
                        </div>
                    )}

                    {isLoading && (
                        <div className="absolute inset-0 z-20 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center">
                            <div className="relative w-32 h-32">
                                <div className="absolute top-0 left-0 w-full h-full border-4 border-luxury-200 rounded-full animate-ping opacity-75"></div>
                                <div className="absolute top-0 left-0 w-full h-full border-4 border-accent-500 rounded-full animate-spin border-t-transparent"></div>
                            </div>
                            <h3 className="mt-8 text-xl font-serif font-bold text-luxury-800">AI Đang chỉnh sửa ảnh...</h3>
                            <p className="text-luxury-600 mt-2">Đang áp dụng các thay đổi được đánh dấu.</p>
                        </div>
                    )}
                </div>
            </div>
            {isAnnotating && sourceImage && (
                <AnnotationCanvas 
                    image={sourceImage.objectURL || ''} 
                    onSave={handleSaveAnnotation} 
                    onCancel={handleCancelAnnotation} 
                    originalImageWidth={sourceImage.width || 1} // Pass native image dimensions
                    originalImageHeight={sourceImage.height || 1} // Pass native image dimensions
                />
            )}
            {isPointSelectionModalOpen && sourceImage && (
                <PointSelectorModal
                    isOpen={isPointSelectionModalOpen}
                    onClose={() => setIsPointSelectionModalOpen(false)}
                    imageSrc={sourceImage.objectURL || ''}
                    base64Image={sourceImage.base64}
                    mimeType={sourceImage.mimeType}
                    onSavePointAndDetections={handleSavePointSelection}
                    onDeductCredits={onDeductCredits}
                    userCredits={userCredits}
                    originalImageWidth={sourceImage.width || 1} // Pass native image dimensions
                    originalImageHeight={sourceImage.height || 1} // Pass native image dimensions
                />
            )}
        </div>
    );
};

export default AdvancedEdit;