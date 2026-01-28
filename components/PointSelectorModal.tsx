import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ClickPoint } from '../types';
import * as geminiService from '../services/geminiService';
import { Spinner } from './Spinner';

interface PointSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageSrc: string;
    base64Image: string;
    mimeType: string;
    onSavePointAndDetections: (point: ClickPoint, detectedPoints: ClickPoint[]) => void;
    onDeductCredits?: (cost: number, description: string) => Promise<void>;
    userCredits: number;
    originalImageWidth: number;
    originalImageHeight: number;
}

const DETECTION_COST = 5;

export const PointSelectorModal: React.FC<PointSelectorModalProps> = ({
    isOpen, onClose, imageSrc, base64Image, mimeType,
    onSavePointAndDetections, onDeductCredits, userCredits,
    originalImageWidth, originalImageHeight,
}) => {
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [scale, setScale] = useState(1);
    const [minScale, setMinScale] = useState(0.1);
    const [translation, setTranslation] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const [selectedPoint, setSelectedPoint] = useState<ClickPoint | null>(null);
    const [detectedPoints, setDetectedPoints] = useState<ClickPoint[]>([]);
    const [isDetecting, setIsDetecting] = useState(false);
    const [detectionError, setDetectionError] = useState<string | null>(null);

    const resetState = useCallback(() => {
        setSelectedPoint(null);
        setDetectedPoints([]);
        setIsDetecting(false);
        setDetectionError(null);
    }, []);

    useEffect(() => {
        if (!isOpen) {
            resetState();
        } else if (containerRef.current && originalImageWidth) {
            // Tự động tính toán tỷ lệ để ảnh vừa khít khung hình lúc mở
            const container = containerRef.current;
            const sX = container.clientWidth / originalImageWidth;
            const sY = container.clientHeight / originalImageHeight;
            const fitScale = Math.min(sX, sY, 1);
            
            setScale(fitScale);
            setMinScale(fitScale * 0.5); // Cho phép thu nhỏ thêm một chút
            setTranslation({
                x: (container.clientWidth - originalImageWidth * fitScale) / 2,
                y: (container.clientHeight - originalImageHeight * fitScale) / 2
            });
        }
    }, [isOpen, resetState, originalImageWidth, originalImageHeight]);

    const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - containerRect.left;
        const mouseY = e.clientY - containerRect.top;

        // Tăng giới hạn zoom tối đa lên 20x
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const newScale = Math.min(Math.max(scale * zoomFactor, minScale), 20);

        // Zoom tập trung vào vị trí con trỏ chuột
        const newTx = mouseX - (mouseX - translation.x) * (newScale / scale);
        const newTy = mouseY - (mouseY - translation.y) * (newScale / scale);

        setScale(newScale);
        setTranslation({ x: newTx, y: newTy });
    }, [scale, translation, minScale]);

    const handleClick = (e: React.MouseEvent) => {
        if (isDragging || !imgRef.current) return;
        
        const rect = imgRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setSelectedPoint({ x: Math.max(0, Math.min(x, 100)), y: Math.max(0, Math.min(y, 100)) });
        setDetectedPoints([]);
    };

    const handleFindSimilar = async () => {
        if (!selectedPoint || isDetecting) return;

        if (userCredits < DETECTION_COST) {
            setDetectionError(`Bạn cần ${DETECTION_COST} Credits để nhận diện vật thể.`);
            return;
        }

        setIsDetecting(true);
        setDetectionError(null);
        setDetectedPoints([]);

        try {
            await onDeductCredits?.(DETECTION_COST, `Detect Similar Objects`);

            const detectionPrompt = `
                TASK: OBJECT DETECTION.
                Analyze the objects in the provided wedding scene image.
                I have selected an object at the approximate center of X:${selectedPoint.x}%, Y:${selectedPoint.y}%.
                Identify and return the precise percentage coordinates (x, y) for the center of ALL other identical or highly similar objects (e.g., chairs of the same model, identical floral arrangements, specific decor items) in the entire image.
                Ensure all coordinates are percentages (0-100).
                Return ONLY a JSON list of objects: [{"x": percentage, "y": percentage}, ...]
            `;

            const points = await geminiService.detectSimilarObjects(base64Image, mimeType, detectionPrompt);
            setDetectedPoints(points);
        } catch (err: any) {
            setDetectionError("Lỗi nhận diện vật thể tương đồng. Vui lòng thử lại sau.");
            console.error("Detect Similar Objects Error:", err);
        } finally {
            setIsDetecting(false);
        }
    };

    const handleConfirm = () => {
        if (selectedPoint) onSavePointAndDetections(selectedPoint, detectedPoints);
        onClose();
    };

    if (!isOpen) return null;

    // Viewport style chứa cả ảnh và marker
    const viewportStyle: React.CSSProperties = {
        position: 'absolute',
        width: originalImageWidth,
        height: originalImageHeight,
        transform: `translate(${translation.x}px, ${translation.y}px) scale(${scale})`,
        transformOrigin: '0 0',
        cursor: isDragging ? 'grabbing' : 'crosshair'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-luxury-100 flex items-center justify-between bg-white z-20">
                    <h3 className="text-xl font-serif font-bold text-luxury-900">Chọn Vị Trí Thay Thế (Zoom: {Math.round(scale * 100)}%)</h3>
                    <button onClick={onClose} className="text-luxury-600 hover:text-luxury-900"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                </div>

                <div 
                    ref={containerRef}
                    className="flex-grow relative overflow-hidden bg-zinc-900"
                    onWheel={handleWheel}
                    onMouseDown={(e) => { setIsDragging(true); setDragStart({ x: e.clientX - translation.x, y: e.clientY - translation.y }); }}
                    onMouseMove={(e) => { if (isDragging) setTranslation({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); }}
                    onMouseUp={() => setIsDragging(false)}
                    onMouseLeave={() => setIsDragging(false)}
                >
                    {/* Viewport: Khóa ảnh và marker vào cùng một khung biến đổi */}
                    <div style={viewportStyle}>
                        <img
                            ref={imgRef}
                            src={imageSrc}
                            alt="Point Selection"
                            className="w-full h-full block pointer-events-auto"
                            onClick={handleClick}
                            onMouseDown={(e) => e.stopPropagation()}
                            draggable={false}
                        />
                        
                        {/* Selected Marker: Tỷ lệ luôn khớp nhờ nằm trong viewport */}
                        {selectedPoint && (
                            <div className="absolute w-8 h-8 bg-accent-500/80 border-2 border-white rounded-full animate-pulse shadow-lg"
                                style={{ 
                                    left: `${selectedPoint.x}%`, 
                                    top: `${selectedPoint.y}%`, 
                                    transform: `translate(-50%, -50%) scale(${1 / scale})`, // Chống méo khi zoom
                                    transformOrigin: 'center'
                                }} 
                            />
                        )}

                        {detectedPoints.map((point, index) => (
                            <div key={index} className="absolute w-6 h-6 bg-red-500/80 border-2 border-white rounded-full shadow-md"
                                style={{ 
                                    left: `${point.x}%`, 
                                    top: `${point.y}%`, 
                                    transform: `translate(-50%, -50%) scale(${1 / scale})` 
                                }} 
                            />
                        ))}
                    </div>

                    {isDetecting && <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10"><Spinner /> <span className="ml-2 text-white">Đang nhận diện...</span></div>}
                    
                    {detectionError && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white text-sm px-4 py-2 rounded-lg shadow-md z-10">
                            {detectionError}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 z-20">
                    {selectedPoint && (
                        <button
                            onClick={handleFindSimilar}
                            disabled={isDetecting || userCredits < DETECTION_COST}
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isDetecting ? <Spinner /> : 'Tìm Vật Thể Tương Tự'}
                            {detectedPoints.length > 0 && ` (${detectedPoints.length})`}
                        </button>
                    )}
                    <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold">Hủy</button>
                    <button onClick={handleConfirm} disabled={!selectedPoint} className="px-10 py-2 bg-accent-600 text-white rounded-lg font-bold disabled:opacity-50">Xác Nhận</button>
                </div>
            </div>
        </div>
    );
};