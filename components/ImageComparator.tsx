import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ImageComparatorProps {
  originalImage: string; // Bản phác thảo (Sketch)
  generatedImage: string; // Bản Render 3D
}

export const ImageComparator: React.FC<ImageComparatorProps> = ({ originalImage, generatedImage }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = (x / rect.width) * 100;
      setSliderPosition(percentage);
    }
  }, []);

  const onMouseDown = () => { isDragging.current = true; };
  const onMouseUp = () => { isDragging.current = false; };
  
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging.current) {
      handleMove(e.clientX);
    }
  }, [handleMove]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (isDragging.current) {
      handleMove(e.touches[0].clientX);
    }
  }, [handleMove]);

  useEffect(() => {
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('touchmove', onTouchMove);
    };
  }, [onMouseMove, onTouchMove]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[600px] rounded-2xl overflow-hidden shadow-2xl select-none bg-zinc-950 group"
    >
      {/* 1. LỚP NỀN: Generated Image (Ảnh Sau - 3D Render) */}
      <img 
        src={generatedImage} 
        alt="Render 3D" 
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
      />
      
      <div className="absolute top-6 right-6 bg-black/40 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] z-10 border border-white/10">
        RENDER 3D
      </div>

      {/* 2. LỚP PHỦ: Original Image (Ảnh Trước - Sketch) */}
      {/* Sử dụng clipPath để cắt ảnh mà không làm thay đổi kích thước/vị trí ảnh */}
      <img 
        src={originalImage} 
        alt="Phác Thảo" 
        className="absolute inset-0 w-full h-full object-contain pointer-events-none z-0"
        style={{ 
          clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` 
        }}
      />
      
      <div 
        className="absolute top-6 left-6 bg-white/90 backdrop-blur-md text-zinc-900 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] z-10 shadow-lg"
        style={{ opacity: sliderPosition > 10 ? 1 : 0 }} // Ẩn nhãn nếu thanh trượt quá gần lề
      >
        PHÁC THẢO
      </div>

      {/* 3. THANH TRƯỢT (SLIDER HANDLE) */}
      <div 
        className="absolute inset-y-0 w-1 bg-white cursor-ew-resize z-20 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={onMouseDown}
        onTouchStart={onMouseDown}
      >
        {/* Nút nắm kéo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-2xl flex items-center justify-center border-[3px] border-white active:scale-90 transition-transform">
           <div className="flex gap-1">
              <div className="w-0.5 h-4 bg-zinc-300 rounded-full"></div>
              <div className="w-0.5 h-4 bg-zinc-300 rounded-full"></div>
           </div>
           
           {/* Mũi tên chỉ hướng */}
           <div className="absolute -left-6 text-white text-xs font-bold drop-shadow-md animate-pulse">
              ◀
           </div>
           <div className="absolute -right-6 text-white text-xs font-bold drop-shadow-md animate-pulse">
              ▶
           </div>
        </div>
      </div>

      {/* Overlay hướng dẫn khi di chuột vào (Tùy chọn) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <p className="text-white/60 text-[10px] tracking-widest uppercase bg-black/20 backdrop-blur-sm px-4 py-1 rounded-full">
          Kéo để so sánh chi tiết
        </p>
      </div>
    </div>
  );
};