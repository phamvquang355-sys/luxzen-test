import React, { useRef, useState } from 'react';
import { FileData } from '../types';
import { resizeAndCompressImage, generatePromptFromImageAndText } from '../services/geminiService'; 
import { Spinner } from './Spinner'; // Giả định bạn đã có component này

interface RenderImageUploadProps {
  onImageUpload: (data: FileData) => void;
  onAutoPromptGenerated?: (prompt: string) => void; // Thêm callback để trả về prompt tự động
  currentImage: FileData | null;
}

export const RenderImageUpload: React.FC<RenderImageUploadProps> = ({ 
  onImageUpload, 
  onAutoPromptGenerated,
  currentImage 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false); // Trạng thái AI đang "đọc" ảnh

  const handleFileChange = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Vui lòng tải lên một tệp hình ảnh hợp lệ.");
      return;
    }

    try {
      setIsAnalyzing(true);
      const objectURL = URL.createObjectURL(file);

      // 1. Tối ưu hóa ảnh để gửi API
      // Updated to receive width and height from resizeAndCompressImage
      const { base64: optimizedBase64, mimeType: optimizedMimeType, width, height } = await resizeAndCompressImage(file, 1024, 0.8);
      
      const fileData: FileData = {
        file,
        base64: optimizedBase64,
        mimeType: optimizedMimeType,
        objectURL,
        width, // Store width
        height // Store height
      };

      // 2. Trả ảnh về cho component cha
      onImageUpload(fileData);

      // 3. TÍNH NĂNG TRAO QUYỀN: AI tự động phân tích không gian sự kiện
      if (onAutoPromptGenerated) {
        // Gửi lệnh đặc thù cho ngành Wedding/Event (Updated for Hidden Context)
        const instruction = "Phân tích kiến trúc không gian này về màu sắc, ánh sáng và vật liệu gốc. Viết ngắn gọn dưới dạng prompt kỹ thuật.";
        const autoPrompt = await generatePromptFromImageAndText(fileData, instruction);
        onAutoPromptGenerated(autoPrompt);
      }

    } catch (e) {
      console.error("Lỗi xử lý tệp", e);
      alert("Không thể xử lý hình ảnh.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  return (
    <div 
      className={`relative group border-2 border-dashed rounded-2xl transition-all duration-500 overflow-hidden cursor-pointer
        ${isDragging ? 'border-purple-500 bg-purple-50' : 'border-zinc-200 bg-white hover:border-purple-300'}
        ${currentImage ? 'h-72' : 'h-48'}
      `}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => !isAnalyzing && fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])} 
        className="hidden" 
        accept="image/*"
      />

      {currentImage?.objectURL ? (
        <div className="w-full h-full relative">
          <img 
            src={currentImage.objectURL} 
            alt="Event Space" 
            className="w-full h-full object-cover"
          />
          
          {/* Overlay khi AI đang phân tích */}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20">
              <Spinner />
              <p className="mt-3 text-sm font-medium animate-pulse">AI đang phân tích ngầm kiến trúc...</p>
            </div>
          )}

          {/* Nút Magic để kích hoạt lại phân tích (Trao quyền chủ động) */}
          {!isAnalyzing && (
            <div className="absolute top-4 right-4 z-10">
              <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                <SparklesIcon /> Analyzed
              </div>
            </div>
          )}

          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <p className="text-white bg-black/50 px-4 py-2 rounded-full text-sm font-bold">Thay đổi ảnh không gian</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-zinc-400 p-6 text-center">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
               </svg>
            </div>
            <p className="font-bold text-zinc-800 text-sm">Tải lên ảnh sảnh tiệc hoặc mặt bằng</p>
            <p className="text-xs mt-1">AI sẽ tự động nhận diện kiến trúc và gợi ý concept</p>
        </div>
      )}
    </div>
  );
};

// Icon trang trí
const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);