import React, { useState, useRef } from 'react';
import { FileData, IdeaAsset, IdeaGeneratorProps } from '../types';
import { ImageUpload } from './common/ImageUpload';
import { Spinner } from './Spinner';
import { ImageComparator } from './ImageComparator';
import * as geminiService from '../services/geminiService';

export const IdeaGenerator: React.FC<IdeaGeneratorProps> = ({ state, onStateChange, userCredits, onDeductCredits, onReset }) => {
  const { sourceSketch, assets, isLoading, resultImage, error } = state;
  const [activePin, setActivePin] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<string>("Đang xử lý...");
  const [tempPinPosition, setTempPinPosition] = useState<{x: number, y: number} | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // 1. Xử lý tải ảnh phác thảo gốc
  const handleSketchUpload = (file: FileData) => {
    onStateChange({ sourceSketch: file, assets: [], resultImage: null, error: null });
  };

  // 2. Click vào ảnh để mở Modal upload ảnh Moodboard
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current || resultImage) return;

    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setTempPinPosition({ x, y });
    setShowUploadModal(true);
  };

  // 3. Xử lý khi người dùng chọn xong ảnh moodboard trong Modal
  const handleMoodboardImageSelect = (file: FileData) => {
      if (!tempPinPosition) return;

      const newAsset: IdeaAsset = {
          id: Date.now().toString(),
          x: tempPinPosition.x,
          y: tempPinPosition.y,
          image: file,
          label: `Moodboard Ref ${assets.length + 1}`
      };

      onStateChange({
          assets: [...assets, newAsset]
      });
      setActivePin(newAsset.id);
      
      // Reset Modal state
      setShowUploadModal(false);
      setTempPinPosition(null);
  };

  // 4. Cập nhật ảnh vật thể cho một điểm neo (nếu muốn thay đổi sau khi tạo)
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
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-zinc-50 min-h-screen rounded-2xl relative">
      
      {/* Modal Upload Ảnh Moodboard */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-serif font-bold text-xl text-luxury-900">Ghim ảnh Moodboard</h3>
                    <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
                <p className="text-sm text-luxury-500 mb-6">Tải lên ảnh mẫu vật liệu hoặc đồ vật trang trí cho vị trí này trên phác thảo.</p>
                
                <ImageUpload 
                    onFileSelect={handleMoodboardImageSelect}
                    previewUrl={null}
                    placeholder="Chọn ảnh tham chiếu (JPG/PNG)"
                    maxWidth={512}
                    quality={0.8}
                />
                
                <button 
                    onClick={() => setShowUploadModal(false)} 
                    className="w-full mt-4 py-3 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-colors"
                >
                    Hủy Bỏ
                </button>
            </div>
        </div>
      )}

      <div className="flex flex-col">
          <h2 className="text-3xl font-serif font-bold text-luxury-900">Idea Generator</h2>
          <p className="text-luxury-500 italic">Moodboard Mode: Ghim ảnh vật liệu lên phác thảo để AI kết hợp.</p>
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
                        
                        {/* Hiển thị các điểm ghim đã có */}
                        {assets.map((asset, idx) => (
                        <div 
                            key={asset.id}
                            className={`absolute w-10 h-10 -ml-5 -mt-5 border-2 border-white rounded-full overflow-hidden shadow-lg hover:scale-125 transition-transform z-20 cursor-pointer ${activePin === asset.id ? 'ring-4 ring-purple-400' : ''}`}
                            style={{ left: `${asset.x}%`, top: `${asset.y}%` }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setActivePin(asset.id);
                            }}
                        >
                            {asset.image ? (
                                <img src={asset.image.objectURL} className="w-full h-full object-cover" alt="pin" />
                            ) : (
                                <div className="w-full h-full bg-red-500 flex items-center justify-center text-white font-bold text-xs">
                                    ?
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white font-bold text-xs pointer-events-none">
                                {idx + 1}
                            </div>
                        </div>
                        ))}

                        {!isLoading && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg pointer-events-none opacity-80">
                                Click vào vị trí bất kỳ để ghim ảnh Moodboard
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
            <h3 className="text-md font-bold text-zinc-800 mb-4 border-b pb-2">Danh sách Moodboard ({assets.length})</h3>
            
            <div className="space-y-3 overflow-y-auto pr-2 flex-grow custom-scrollbar">
              {assets.length === 0 && (
                <div className="text-sm text-zinc-400 italic text-center py-12 border-2 border-dashed border-zinc-100 rounded-xl">
                    <p>Chưa có ghim nào.</p>
                    <p className="text-xs mt-2">Click vào ảnh phác thảo bên trái để thêm ảnh tham chiếu.</p>
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
                        <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-bold bg-purple-600">
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
                            placeholder="Thay đổi ảnh"
                            previewUrl={asset.image?.objectURL || null}
                        />
                        <div className="text-[10px] text-zinc-400 mt-2 text-center bg-white/50 py-1 rounded">
                             Vị trí: {Math.round(asset.x)}%, {Math.round(asset.y)}%
                        </div>
                    </div>
                  ) : (
                      <div className="flex gap-2 mt-1 ml-8">
                        {asset.image && (
                             <img src={asset.image.objectURL} className="w-10 h-10 object-cover rounded-md border border-zinc-200" alt="thumb" />
                        )}
                        <p className="text-xs text-zinc-500 line-clamp-2 flex-1 pt-1">
                            {asset.image ? "Đã có ảnh tham chiếu." : "Chưa có ảnh."}
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
                {isLoading ? <Spinner /> : "RENDER MOODBOARD (40 Credits)"}
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};