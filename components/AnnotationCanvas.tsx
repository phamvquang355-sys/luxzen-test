import React, { useRef, useEffect, useState } from 'react';

interface Props {
  image: string;
  onSave: (base64: string) => void;
  onCancel: () => void;
  originalImageWidth: number;
  originalImageHeight: number;
}

type Tool = 'brush' | 'arrow' | 'text';

interface TextInputState {
  x: number;
  y: number;
  value: string;
}

export const AnnotationCanvas: React.FC<Props> = ({ 
  image, 
  onSave, 
  onCancel, 
  originalImageWidth, 
  originalImageHeight 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null); // Ref để focus chính xác
  
  const [currentTool, setCurrentTool] = useState<Tool>('brush');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [textInput, setTextInput] = useState<TextInputState | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const tempCanvas = tempCanvasRef.current;
    if (!canvas || !tempCanvas) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image;
    img.onload = () => {
      [canvas, tempCanvas].forEach(c => {
        c.width = img.width;
        c.height = img.height;
      });
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const padding = 40;
        const initialScale = Math.min((window.innerWidth - padding) / img.width, (window.innerHeight - 150) / img.height, 1);
        setScale(initialScale);
      }
    };
  }, [image]);

  // Tự động focus khi mở ô nhập chữ
  useEffect(() => {
    if (textInput && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [textInput]);

  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height
    };
  };

  const drawArrowHead = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
    const headlen = 30 / scale;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const handleTextSubmit = () => {
    if (!textInput || !textInput.value.trim()) {
      setTextInput(null);
      return;
    }
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      // FIX: Cỡ chữ tỉ lệ thuận với độ phân giải ảnh (khoảng 3% chiều rộng)
      const dynamicFontSize = Math.max(30, Math.floor(canvasRef.current!.width * 0.03));
      ctx.font = `bold ${dynamicFontSize}px Arial`;
      ctx.fillStyle = "#FF0000";
      ctx.strokeStyle = "white";
      ctx.lineWidth = Math.max(2, dynamicFontSize / 10);
      ctx.textBaseline = 'top'; 

      ctx.strokeText(textInput.value, textInput.x, textInput.y);
      ctx.fillText(textInput.value, textInput.x, textInput.y);
    }
    setTextInput(null);
  };

  const startDrawing = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (currentTool === 'text') {
      const pos = getMousePos(e);
      // FIX: Sử dụng setTimeout để tránh xung đột với onBlur của input cũ khi click ra ngoài để tạo text mới
      setTimeout(() => {
        setTextInput({ x: pos.x, y: pos.y, value: '' });
      }, 0);
      return;
    }

    if (textInput) {
      handleTextSubmit();
      return;
    }

    setIsDrawing(true);
    setStartPos(getMousePos(e));
  };

  const drawing = (e: React.MouseEvent) => {
    if (isPanning) {
        setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
        return;
    }

    if (!isDrawing) return;
    const pos = getMousePos(e);
    const canvas = canvasRef.current;
    const tempCanvas = tempCanvasRef.current;
    const ctx = currentTool === 'brush' ? canvas?.getContext('2d') : tempCanvas?.getContext('2d');
    
    if (!ctx || !tempCanvas) return;

    if (currentTool === 'brush') {
      ctx.strokeStyle = "#FF0000";
      ctx.lineWidth = 5 / scale;
      ctx.lineCap = 'round';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else if (currentTool === 'arrow') {
      // Xóa preview cũ trên tempCanvas
      ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      ctx.strokeStyle = "#FF0000";
      ctx.lineWidth = 6 / scale;
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      drawArrowHead(ctx, startPos.x, startPos.y, pos.x, pos.y);
    }
  };

  const stopDrawing = (e: React.MouseEvent) => {
    if (isPanning) {
        setIsPanning(false);
        return;
    }

    if (currentTool === 'arrow' && isDrawing) {
      const pos = getMousePos(e);
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = "#FF0000";
        ctx.lineWidth = 6 / scale;
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        drawArrowHead(ctx, startPos.x, startPos.y, pos.x, pos.y);
      }
      // Xóa tempCanvas sau khi đã vẽ chính thức
      tempCanvasRef.current?.getContext('2d')?.clearRect(0, 0, tempCanvasRef.current.width, tempCanvasRef.current.height);
    }
    setIsDrawing(false);
    canvasRef.current?.getContext('2d')?.beginPath();
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const direction = e.deltaY > 0 ? -1 : 1;
    setScale(prev => Math.min(Math.max(prev + direction * 0.1, 0.1), 5));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center overflow-hidden">
      {/* TOOLBAR */}
      <div className="absolute top-6 flex gap-4 bg-zinc-900/90 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-2xl z-50">
        {(['brush', 'arrow', 'text'] as Tool[]).map(tool => (
          <button 
            key={tool}
            onClick={() => { setCurrentTool(tool); setTextInput(null); }}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${currentTool === tool ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'text-zinc-400 hover:bg-white/5'}`}
          >
            {tool === 'brush' ? '✏️ Nét vẽ' : tool === 'arrow' ? '↗️ Mũi tên' : '💬 Chữ'}
          </button>
        ))}
        <div className="w-[1px] bg-white/10 mx-2" />
        <button onClick={onCancel} className="px-4 py-2 text-white/50 hover:text-white">Hủy</button>
        <button 
          onClick={() => { if (textInput) handleTextSubmit(); onSave(canvasRef.current?.toDataURL('image/jpeg', 0.9).split(',')[1] || '') }}
          className="px-6 py-2 bg-white text-black rounded-xl font-bold hover:bg-zinc-200"
        >
          Lưu & Gửi AI
        </button>
      </div>

      {/* EDITOR AREA */}
      <div className="w-full h-full flex items-center justify-center cursor-crosshair" onWheel={handleWheel}>
        <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transition: isPanning ? 'none' : 'transform 0.1s' }} className="relative">
          <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={drawing} onMouseUp={stopDrawing} className="shadow-2xl bg-black block" />
          <canvas ref={tempCanvasRef} className="absolute inset-0 pointer-events-none" />
          
          {textInput && (
            <input
              ref={textInputRef}
              value={textInput.value}
              onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
              onBlur={handleTextSubmit}
              onMouseDown={(e) => e.stopPropagation()} // FIX: Ngăn tạo thêm input mới khi nhấn vào chính nó
              style={{
                position: 'absolute',
                left: textInput.x,
                top: textInput.y,
                font: `bold ${Math.max(30, Math.floor((canvasRef.current?.width || 0) * 0.03))}px Arial`,
                color: '#FF0000',
                textShadow: '0 0 4px white, 0 0 4px white',
                background: 'transparent',
                border: '1px dashed rgba(255,255,255,0.5)',
                outline: 'none',
                minWidth: '200px',
                zIndex: 20
              }}
              placeholder="Nhập ghi chú..."
            />
          )}
        </div>
      </div>
    </div>
  );
};