import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Check, ZoomIn, ZoomOut, Move } from 'lucide-react';

interface AvatarCropperProps {
  imageUrl: string;
  onConfirm: (croppedImage: string) => void;
  onCancel: () => void;
}

// 生成五角星路径
const createStarPath = (ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number, innerR: number) => {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
};

export const AvatarCropper: React.FC<AvatarCropperProps> = ({ imageUrl, onConfirm, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasSize = 300;
  const starOuterR = canvasSize * 0.45;
  const starInnerR = starOuterR * 0.5;

  // 加载图片
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      // 初始缩放让图片填满星星区域
      const minDim = Math.min(img.width, img.height);
      const initialScale = (starOuterR * 2) / minDim;
      setScale(initialScale * 1.2);
    };
    img.src = imageUrl;
  }, [imageUrl, starOuterR]);

  // 绘制预览
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !image) return;

    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // 绘制半透明背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // 创建星星裁剪区域
    ctx.save();
    createStarPath(ctx, canvasSize / 2, canvasSize / 2, starOuterR, starInnerR);
    ctx.clip();

    // 绘制图片
    const imgW = image.width * scale;
    const imgH = image.height * scale;
    const imgX = (canvasSize - imgW) / 2 + offset.x;
    const imgY = (canvasSize - imgH) / 2 + offset.y;
    ctx.drawImage(image, imgX, imgY, imgW, imgH);
    ctx.restore();

    // 绘制星星描边
    createStarPath(ctx, canvasSize / 2, canvasSize / 2, starOuterR, starInnerR);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 绘制外部虚线辅助框
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, canvasSize - 20, canvasSize - 20);
    ctx.setLineDash([]);
  }, [image, scale, offset, starOuterR, starInnerR]);

  useEffect(() => {
    draw();
  }, [draw]);

  // 鼠标/触摸事件
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // 缩放
  const handleZoom = (delta: number) => {
    setScale(prev => Math.max(0.1, Math.min(5, prev + delta)));
  };

  // 确认裁剪
  const handleConfirm = () => {
    if (!image) return;

    // 创建输出 canvas - 输出完整正方形，不做星星裁剪
    // Three.js 的 ShapeGeometry 会自动按星星形状显示
    const outputSize = 512;
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = outputSize;
    outputCanvas.height = outputSize;
    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return;

    // 白色背景（避免透明区域问题）
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, outputSize, outputSize);

    // 绘制图片（按比例缩放，填满整个画布）
    const ratio = outputSize / canvasSize;
    const imgW = image.width * scale * ratio;
    const imgH = image.height * scale * ratio;
    const imgX = (outputSize - imgW) / 2 + offset.x * ratio;
    const imgY = (outputSize - imgH) / 2 + offset.y * ratio;
    ctx.drawImage(image, imgX, imgY, imgW, imgH);

    // 导出
    const dataUrl = outputCanvas.toDataURL('image/jpeg', 0.9);
    onConfirm(dataUrl);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.9)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <h3 style={{ color: '#FFD700', marginBottom: '16px', fontSize: '16px' }}>
        ⭐ 调整头像位置
      </h3>
      
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          borderRadius: '8px',
          touchAction: 'none'
        }}
      />

      <p style={{ color: '#888', fontSize: '12px', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Move size={14} /> 拖动调整位置
      </p>

      {/* 缩放控制 */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '16px', alignItems: 'center' }}>
        <button
          onClick={() => handleZoom(-0.1)}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,215,0,0.3)',
            borderRadius: '8px',
            padding: '10px',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ZoomOut size={20} />
        </button>
        
        <input
          type="range"
          min="0.1"
          max="3"
          step="0.05"
          value={scale}
          onChange={e => setScale(Number(e.target.value))}
          style={{ width: '120px', accentColor: '#FFD700' }}
        />
        
        <button
          onClick={() => handleZoom(0.1)}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,215,0,0.3)',
            borderRadius: '8px',
            padding: '10px',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ZoomIn size={20} />
        </button>
      </div>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
        <button
          onClick={onCancel}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '8px',
            padding: '12px 24px',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px'
          }}
        >
          <X size={18} /> 取消
        </button>
        
        <button
          onClick={handleConfirm}
          style={{
            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            color: '#000',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          <Check size={18} /> 确认
        </button>
      </div>
    </div>
  );
};
