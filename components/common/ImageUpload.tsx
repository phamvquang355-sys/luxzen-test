import React, { useRef, useState } from 'react';
import { FileData } from '../../types';
import { resizeAndCompressImage } from '../../services/geminiService';

interface CommonImageUploadProps {
  onFileSelect: (data: FileData) => void;
  previewUrl: string | null;
  maxWidth?: number;
  quality?: number;
  compact?: boolean; // New prop for smaller UI
  placeholder?: string; // New prop for custom text
}

export const ImageUpload: React.FC<CommonImageUploadProps> = ({ 
  onFileSelect, 
  previewUrl, 
  maxWidth = 1024, 
  quality = 0.8,
  compact = false,
  placeholder = "Tải ảnh lên"
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Vui lòng tải lên một tệp hình ảnh hợp lệ.");
      return;
    }

    try {
      const objectURL = URL.createObjectURL(file);
      // Updated to receive width and height from resizeAndCompressImage
      const { base64: optimizedBase64, mimeType: optimizedMimeType, width, height } = await resizeAndCompressImage(file, maxWidth, quality);
      
      onFileSelect({
        file,
        base64: optimizedBase64,
        mimeType: optimizedMimeType, // Use optimized mimeType
        objectURL,
        width, // Pass width
        height // Pass height
      });
    } catch (e) {
      console.error("Lỗi xử lý tệp", e);
      alert("Không thể xử lý hình ảnh để tải lên.");
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
      className={`relative group border-2 border-dashed rounded-xl transition-all duration-300 overflow-hidden cursor-pointer
        ${isDragging ? 'border-purple-500 bg-purple-900/10' : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400'}
        ${compact ? 'h-32' : (previewUrl ? 'h-64' : 'h-48')}
      `}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])} 
        className="hidden" 
        accept="image/*"
      />

      {previewUrl ? (
        <div className="w-full h-full relative">
          <img 
            src={previewUrl} 
            alt="Uploaded" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-white text-xs font-medium flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Thay Đổi
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-zinc-500 p-2 text-center">
           <svg xmlns="http://www.w3.org/2000/svg" className={`${compact ? 'h-6 w-6' : 'h-10 w-10'} mb-2 text-zinc-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
           </svg>
           <p className={`font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>{placeholder}</p>
           {!compact && <p className="text-xs text-zinc-400 mt-1">hoặc kéo thả</p>}
        </div>
      )}
    </div>
  );
};