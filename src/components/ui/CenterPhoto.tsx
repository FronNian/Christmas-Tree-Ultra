/**
 * 居中照片展示组件
 * 用于时间轴模式中展示照片
 */
import React, { useEffect, useState } from 'react';

interface CenterPhotoProps {
  src: string;
  visible: boolean;
  duration?: number; // 用于动画
}

export const CenterPhoto: React.FC<CenterPhotoProps> = ({ 
  src, 
  visible,
  // duration 用于未来动画扩展
  duration: _duration = 3000 
}) => {
  void _duration; // 标记为已使用
  const [show, setShow] = useState(false);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (visible) {
      setShow(true);
      // 淡入
      requestAnimationFrame(() => {
        setOpacity(1);
      });
    } else {
      // 淡出
      setOpacity(0);
      const timer = setTimeout(() => setShow(false), 500);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!show || !src) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        pointerEvents: 'none',
        opacity,
        transition: 'opacity 0.5s ease-in-out'
      }}
    >
      {/* 背景模糊 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(10px)'
        }}
      />
      
      {/* 照片容器 - 拍立得风格 */}
      <div
        style={{
          position: 'relative',
          background: '#fff',
          padding: '12px 12px 40px 12px',
          borderRadius: '4px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 100px rgba(255, 215, 0, 0.3)',
          transform: `rotate(${Math.random() * 6 - 3}deg)`,
          animation: 'photoFloat 3s ease-in-out infinite'
        }}
      >
        <img
          src={src}
          alt="Photo"
          style={{
            maxWidth: 'min(80vw, 400px)',
            maxHeight: 'min(60vh, 400px)',
            objectFit: 'contain',
            display: 'block',
            borderRadius: '2px'
          }}
        />
        
        {/* 装饰性文字 */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: "'Dancing Script', cursive",
            fontSize: '14px',
            color: '#666',
            whiteSpace: 'nowrap'
          }}
        >
          ❤️ Merry Christmas ❤️
        </div>
      </div>

      <style>{`
        @keyframes photoFloat {
          0%, 100% { transform: translateY(0) rotate(${Math.random() * 6 - 3}deg); }
          50% { transform: translateY(-10px) rotate(${Math.random() * 6 - 3}deg); }
        }
      `}</style>
    </div>
  );
};
