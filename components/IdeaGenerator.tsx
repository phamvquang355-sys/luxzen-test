import React, { useState, useRef } from 'react';
import { FileData, IdeaAsset, IdeaGeneratorProps } from '../types';
import { ImageUpload } from './common/ImageUpload';
import { Spinner } from './Spinner';
import { ImageComparator } from './ImageComparator';
import * as geminiService from '../services/geminiService';

export const IdeaGenerator: React.FC<IdeaGeneratorProps> = ({ state, onStateChange, userCredits, onDeductCredits, onReset }) => {
  const { sourceSketch, assets, isLoading, resultImage, error } = state;
  const [activePin, setActivePin] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<string>("Đang xử lý..."); // Local state for status messages
  const imgRef = useRef<HTMLImageElement>(null);

  // 1. Xử lý tải ảnh phác thảo gốc
  const handleSketchUpload = (file: FileData) => {
    onStateChange({ sourceSketch: file, assets: [], resultImage: null, error: null });
  };

  // 2. Click vào ảnh để thêm điểm neo (Pin)
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current || resultImage) return;

    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newAsset: IdeaAsset = {
      id: Date.now().toString(),
      x,
      y,
      image: null,
      label: `Vật thể ${assets.length + 1}`
    };

    onStateChange({ assets: [...assets, newAsset] });
    setActivePin(newAsset.id); // Mở ngay phần tải ảnh cho điểm vừa chấm
  };

  // 3. Cập nhật ảnh vật thể cho một điểm neo
  const updateAssetImage = (id: string, file: FileData) => {
    onStateChange({
      assets: assets.map(a => a.id === id ? { ...a, image: file } : a)
    });
  };

  const removeAsset = (id: string) => {
    onStateChange({ assets: assets.filter(a => a.id !== id) });
    if (activePin === id) setActivePin(null);
  };

  const handleGenerate = async () => {
      const COST = 40;
      if (userCredits < COST) {
          onStateChange({ error: `Bạn cần ${COST} Credits để thực hiện.` });
          return;
      }
      if (!sourceSketch) return;
      
      onStateChange({ isLoading: true, error: null });
      setLoadingStatus("Đang khởi tạo...");

      try {
          if (onDeductCredits) await onDeductCredits(COST, "Idea Generation Render");
          
          const result = await geminiService.generateIdeaRender(
              sourceSketch, 
              assets, 
              (status) => setLoadingStatus(status)
          );
          onStateChange({ resultImage: result });
      } catch (e) {
          onStateChange({ error: "Có lỗi xảy ra khi tạo ảnh. Vui lòng thử lại." });
      } finally {
          onStateChange({ isLoading: false });
      }
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-zinc-50 min-h-screen rounded-2xl">
      <div className="flex flex-col">
          <h2 className="text-3xl font-serif font-bold text-luxury-900">Idea Generator</h2>
          <p className="text-luxury-500 italic">Biến ý tưởng thành hiện thực: Ghim vật thể lên phác thảo & Render</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full">
        {/* CỘT TRÁI: KHÔNG GIAN PHÁC THẢO */}
        <div className="flex-1 space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-200 h-full min-h-[500px] flex flex-col">
            <h3 className="text-lg font-serif font-bold text-zinc-800 mb-4 flex items-center gap-2 border-b pb-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
              1. Thiết lập mặt bằng ý tưởng
            </h3>
            
            {!sourceSketch ? (
              <div className="flex-grow flex flex-col justify-center">
                  <ImageUpload 
                    onFileSelect={handleSketchUpload} 
                    previewUrl={null}
                    placeholder="Tải ảnh phác thảo tay của bạn" 
                  />
              </div>
            ) : (
                resultImage ? (
                    <div className="flex-grow relative rounded-xl overflow-hidden border-2 border-purple-100 h-[600px]">
                        <ImageComparator originalImage={sourceSketch.objectURL || ''} generatedImage={resultImage} />
                    </div>
                ) : (
                    <div className="relative group cursor-crosshair overflow-hidden rounded-xl border-2 border-purple-100 bg-zinc-100 flex-grow" style={{ minHeight: '500px' }}>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <img 
                            ref={imgRef}
                            src={sourceSketch.objectURL} 
                            className="max-w-full max-h-full object-contain pointer-events-auto"
                            alt="Sketch"
                            onClick={handleImageClick}
                            />
                        </div>
                        
                        {/* Hiển thị các điểm neo đã chấm */}
                        {assets.map((asset, idx) => (
                        <div 
                            key={asset.id}
                            className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110 z-20`}
                            style={{ left: `${asset.x}%`, top: `${asset.y}%` }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setActivePin(asset.id);
                            }}
                        >
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full shadow-lg border-2 border-white transition-colors ${activePin === asset.id ? 'bg-purple-600 scale-125' : (asset.image ? 'bg-green-500' : 'bg-red-500 animate-pulse')}`}>
                                {asset.image ? (
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                ) : (
                                    <span className="text-white text-xs font-bold">{idx + 1}</span>
                                )}
                            </div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none">
                                {asset.label}
                            </div>
                        </div>
                        ))}

                        {!isLoading && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg pointer-events-none opacity-80">
                                Click vào ảnh để thêm vật thể
                            </div>
                        )}
                        
                        {isLoading && (
                             <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                                <Spinner />
                                <p className="mt-4 text-purple-800 font-bold animate-pulse">{loadingStatus}</p>
                             </div>
                        )}
                    </div>
              )
            )}
            
             {/* Action Buttons when Result is available */}
             {resultImage && (
                <div className="flex gap-4 mt-4 justify-center">
                    <button 
                        onClick={() => {
                            const link = document.createElement('a');
                            link.href = resultImage;
                            link.download = 'idea-render.png';
                            link.click();
                        }}
                        className="px-6 py-2 bg-zinc-900 text-white rounded-lg font-bold hover:bg-zinc-800"
                    >
                        Tải Ảnh
                    </button>
                    <button 
                        onClick={() => onStateChange({ resultImage: null })}
                        className="px-6 py-2 border border-zinc-300 rounded-lg font-bold hover:bg-zinc-50"
                    >
                        Chỉnh sửa tiếp
                    </button>
                    <button 
                        onClick={onReset}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700"
                    >
                        Tạo Mới
                    </button>
                </div>
            )}
            {error && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 text-center">{error}</div>}
          </div>
        </div>

        {/* CỘT PHẢI: QUẢN LÝ VẬT THỂ (ASSETS) */}
        <div className="w-full lg:w-96 space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-200 sticky top-6 h-full max-h-[calc(100vh-100px)] flex flex-col">
            <h3 className="text-md font-bold text-zinc-800 mb-4 border-b pb-2">Danh sách vật thể ({assets.length})</h3>
            
            <div className="space-y-3 overflow-y-auto pr-2 flex-grow custom-scrollbar">
              {assets.length === 0 && (
                <div className="text-sm text-zinc-400 italic text-center py-12 border-2 border-dashed border-zinc-100 rounded-xl">
                    <p>Chưa có vật thể nào.</p>
                    <p className="text-xs mt-2">Click vào ảnh phác thảo bên trái để bắt đầu.</p>
                </div>
              )}

              {assets.map((asset, idx) => (
                <div 
                    key={asset.id} 
                    className={`p-3 rounded-xl border transition-all duration-200 ${activePin === asset.id ? 'border-purple-500 bg-purple-50 shadow-md transform scale-[1.02]' : 'border-zinc-100 bg-zinc-50 hover:border-purple-200'}`}
                    onClick={() => setActivePin(asset.id)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 w-full">
                        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-bold ${asset.image ? 'bg-green-500' : 'bg-zinc-400'}`}>
                            {idx + 1}
                        </span>
                        <input 
                        className="bg-transparent font-bold text-sm outline-none text-zinc-700 w-full focus:text-purple-700 focus:border-b border-purple-300"
                        value={asset.label}
                        onChange={(e) => {
                            const val = e.target.value;
                            onStateChange({
                                assets: assets.map(a => a.id === asset.id ? {...a, label: val} : a)
                            });
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Đặt tên vật thể..."
                        />
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); removeAsset(asset.id); }} 
                        className="text-zinc-400 hover:text-red-500 transition-colors p-1"
                        title="Xóa vật thể"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                    </button>
                  </div>

                  {activePin === asset.id ? (
                      <div className="mt-2 animate-in fade-in slide-in-from-top-2">
                        <ImageUpload 
                            onFileSelect={(file) => updateAssetImage(asset.id, file)} 
                            compact 
                            placeholder="Tải ảnh vật thể mẫu (PNG/JPG)"
                            previewUrl={asset.image?.objectURL || null}
                        />
                        <div className="text-[10px] text-zinc-400 mt-2 text-center bg-white/50 py-1 rounded">
                             Vị trí: {Math.round(asset.x)}%, {Math.round(asset.y)}%
                        </div>
                    </div>
                  ) : (
                      <div className="flex gap-2 mt-1 ml-8">
                        {asset.image ? (
                             <img src={asset.image.objectURL} className="w-10 h-10 object-cover rounded-md border border-zinc-200" alt="thumb" />
                        ) : (
                            <div className="w-10 h-10 bg-zinc-200 rounded-md flex items-center justify-center text-[10px] text-zinc-400 border border-dashed border-zinc-300">
                                Trống
                            </div>
                        )}
                        <p className="text-xs text-zinc-500 line-clamp-2 flex-1 pt-1">
                            {asset.image ? "Đã có ảnh tham chiếu." : "Chưa có ảnh, AI sẽ tự tạo dựa trên tên."}
                        </p>
                      </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-100 bg-white">
                <button 
                onClick={handleGenerate}
                disabled={isLoading || !sourceSketch}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100"
                >
                {isLoading ? <Spinner /> : "BẮT ĐẦU DIỄN HỌA (40 Credits)"}
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};