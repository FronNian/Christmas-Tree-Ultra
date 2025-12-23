/**
 * 照片管理弹窗组件
 * 用于查看、新增、删除照片
 */
import React, { useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { fileToBase64 } from '../../utils/helpers';

interface PhotoManagerProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const PhotoManager: React.FC<PhotoManagerProps> = ({
  photos,
  onChange,
  isOpen,
  onClose
}) => {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  const MAX_PHOTO_MB = 50;

  // 估算 base64 图片大小（MB）
  const estimateBase64SizeMB = (base64: string): number => {
    if (!base64) return 0;
    const commaIndex = base64.indexOf(',');
    const data = commaIndex >= 0 ? base64.slice(commaIndex + 1) : base64;
    const padding = (data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0);
    const bytes = (data.length * 3) / 4 - padding;
    return bytes / (1024 * 1024);
  };

  const photoSizesMB = useMemo(
    () => photos.map(p => estimateBase64SizeMB(p)),
    [photos]
  );

  const totalSizeMB = useMemo(
    () => photoSizesMB.reduce((sum, v) => sum + v, 0),
    [photoSizesMB]
  );

  const totalSizeLabel = `${totalSizeMB.toFixed(1)} MB / ${MAX_PHOTO_MB} MB`;
  const sizeRatio = Math.min(1, totalSizeMB / MAX_PHOTO_MB);

  // 添加照片
  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setSizeError(null);
    setUploadErrors([]);

    const errors: string[] = [];
    const newPhotos: string[] = [];
    let currentSize = totalSizeMB;

    // 先检查 MIME 类型
    const fileArray = Array.from(files);
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      
      // 1. 检查文件类型
      if (!file.type.startsWith('image/')) {
        errors.push(`「${file.name}」不是图片文件`);
        continue;
      }

      // 2. 检查文件大小（考虑 base64 编码会增加约 33% 的大小）
      const fileSizeMB = file.size / (1024 * 1024);
      const estimatedBase64SizeMB = fileSizeMB * 1.33; // base64 编码后大约增加 33%
      
      if (currentSize + estimatedBase64SizeMB > MAX_PHOTO_MB) {
        const errorMsg = `已达到 ${currentSize.toFixed(1)} MB，添加「${file.name}」（约 ${estimatedBase64SizeMB.toFixed(1)} MB）会超过 ${MAX_PHOTO_MB} MB 限制。请删除部分照片或使用图片压缩工具（如 https://imagestool.com/zh_CN/compress-images）压缩后再试。`;
        setSizeError(errorMsg);
        errors.push(errorMsg);
        break; // 停止处理后续文件
      }

      // 3. 尝试转换并验证图片
      try {
        const base64 = await fileToBase64(file);
        const actualSizeMB = estimateBase64SizeMB(base64);
        
        // 再次检查实际大小（防止估算偏差）
        if (currentSize + actualSizeMB > MAX_PHOTO_MB) {
          const errorMsg = `「${file.name}」实际大小（${actualSizeMB.toFixed(1)} MB）超过限制，无法添加。请使用图片压缩工具（如 https://imagestool.com/zh_CN/compress-images）压缩后再试。`;
          setSizeError(errorMsg);
          errors.push(errorMsg);
          break;
        }
        
        newPhotos.push(base64);
        currentSize += actualSizeMB;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '未知错误';
        errors.push(`「${file.name}」: ${errorMsg}`);
        console.error('Failed to load photo:', file.name, err);
      }
    }

    // 显示成功和错误信息
    if (newPhotos.length > 0) {
      onChange([...photos, ...newPhotos]);
    }

    // 显示错误提示
    if (errors.length > 0) {
      setUploadErrors(errors);
    }

    // 重置 input，确保下次可以选择相同文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 删除照片
  const handleDelete = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onChange(newPhotos);
  };

  // 拖拽排序
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newPhotos = [...photos];
    const [removed] = newPhotos.splice(dragIndex, 1);
    newPhotos.splice(index, 0, removed);
    onChange(newPhotos);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        boxSizing: 'border-box'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '500px',
          maxHeight: 'min(calc(100vh - 32px), calc(100dvh - 32px))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '18px' }}>🖼️</span>
            <span style={{ color: '#fff', fontSize: '16px', fontWeight: 500 }}>
              照片管理
            </span>
            <span
              style={{
                background: 'rgba(255, 215, 0, 0.2)',
                color: '#FFD700',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '12px'
              }}
            >
              {photos.length} 张
            </span>
            <span
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                color: sizeRatio >= 0.9 ? '#ff7777' : '#9EFFE0',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '11px'
              }}
            >
              共 {totalSizeLabel}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
              fontSize: '18px'
            }}
          >
            ✕
          </button>
        </div>

        {/* 照片列表 */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '12px'
          }}
        >
          {photos.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#888'
              }}
            >
              <div style={{ fontSize: '48px', opacity: 0.3, marginBottom: '12px' }}>🖼️</div>
              <p style={{ margin: 0, fontSize: '14px' }}>还没有照片</p>
              <p style={{ margin: '8px 0 0', fontSize: '12px' }}>
                点击下方按钮添加照片
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {photos.map((photo, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px',
                    background:
                      dragOverIndex === index
                        ? 'rgba(255, 215, 0, 0.2)'
                        : 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    border:
                      dragOverIndex === index
                        ? '1px dashed #FFD700'
                        : '1px solid transparent',
                    opacity: dragIndex === index ? 0.5 : 1,
                    cursor: 'grab',
                    transition: 'all 0.2s'
                  }}
                >
                  {/* 拖拽手柄 */}
                  <span style={{ color: '#666', flexShrink: 0, fontSize: '14px' }}>⋮⋮</span>

                  {/* 缩略图 */}
                  <img
                    src={photo}
                    alt={`照片 ${index + 1}`}
                    style={{
                      width: '48px',
                      height: '48px',
                      objectFit: 'cover',
                      borderRadius: '4px',
                      flexShrink: 0
                    }}
                  />

                  {/* 名称 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: 500
                      }}
                    >
                      照片 {index + 1}
                    </div>
                    <div style={{ color: '#888', fontSize: '11px', display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                      <span>故事线中显示为「照片 {index + 1}」</span>
                      <span style={{ color: '#9EFFE0' }}>
                        ~{photoSizesMB[index].toFixed(2)} MB
                      </span>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewIndex(index);
                      }}
                      title="预览"
                      style={{
                        background: 'rgba(33, 150, 243, 0.2)',
                        border: '1px solid rgba(33, 150, 243, 0.4)',
                        borderRadius: '4px',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#2196F3',
                        fontSize: '12px'
                      }}
                    >
                      👁
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(index);
                      }}
                      title="删除"
                      style={{
                        background: 'rgba(244, 67, 54, 0.2)',
                        border: '1px solid rgba(244, 67, 54, 0.4)',
                        borderRadius: '4px',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#F44336',
                        fontSize: '12px'
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部添加按钮 */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(255, 215, 0, 0.15)',
              border: '1px dashed rgba(255, 215, 0, 0.5)',
              borderRadius: '8px',
              color: '#FFD700',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '16px' }}>➕</span>
            添加照片
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleAddPhotos}
            style={{ display: 'none' }}
          />
          <p
            style={{
              margin: '8px 0 0',
              fontSize: '11px',
              color: '#666',
              textAlign: 'center'
            }}
          >
            支持拖拽排序 · 照片顺序对应故事线中的「照片 1」「照片 2」... · 总大小上限 {MAX_PHOTO_MB} MB
          </p>
          {/* 错误提示 */}
          {(sizeError || uploadErrors.length > 0) && (
            <div
              style={{
                margin: '8px 0 0',
                padding: '8px 12px',
                background: 'rgba(255, 119, 119, 0.15)',
                border: '1px solid rgba(255, 119, 119, 0.3)',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#ff7777',
                lineHeight: '1.5'
              }}
            >
              {sizeError && (
                <div style={{ marginBottom: uploadErrors.length > 0 ? '6px' : 0 }}>
                  {sizeError.split('（如 ').map((part, i) => {
                    if (i === 0) return <span key={i}>{part}</span>;
                    const [link, rest] = part.split('）');
                    return (
                      <React.Fragment key={i}>
                        （如{' '}
                        <a
                          href="https://imagestool.com/zh_CN/compress-images"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#9EFFE0', textDecoration: 'underline' }}
                        >
                          {link}
                        </a>
                        ）{rest}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
              {uploadErrors.length > 0 && (
                <div>
                  <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                    {uploadErrors.length === 1 
                      ? '上传失败：' 
                      : `${uploadErrors.length} 个文件上传失败：`}
                  </div>
                  {uploadErrors.slice(0, 3).map((error, i) => (
                    <div key={i} style={{ marginTop: i > 0 ? '4px' : 0 }}>
                      {error.split('（如 ').map((part, j) => {
                        if (j === 0) return <span key={j}>{part}</span>;
                        const [link, rest] = part.split('）');
                        return (
                          <React.Fragment key={j}>
                            （如{' '}
                            <a
                              href="https://imagestool.com/zh_CN/compress-images"
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#9EFFE0', textDecoration: 'underline' }}
                            >
                              {link}
                            </a>
                            ）{rest}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  ))}
                  {uploadErrors.length > 3 && (
                    <div style={{ marginTop: '4px', opacity: 0.8 }}>
                      ...还有 {uploadErrors.length - 3} 个文件失败
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 照片预览弹窗 */}
      {previewIndex !== null && photos[previewIndex] && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
            padding: '16px'
          }}
          onClick={() => setPreviewIndex(null)}
        >
          <button
            onClick={() => setPreviewIndex(null)}
            style={{
              position: 'absolute',
              top: 'max(16px, env(safe-area-inset-top, 16px))',
              right: 'max(16px, env(safe-area-inset-right, 16px))',
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
              fontSize: '20px',
              zIndex: 10002
            }}
          >
            ✕
          </button>
          <img
            src={photos[previewIndex]}
            alt={`照片 ${previewIndex + 1}`}
            style={{
              maxWidth: 'min(90vw, 800px)',
              maxHeight: 'calc(100vh - 120px)',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <div
            style={{
              marginTop: '12px',
              color: '#fff',
              fontSize: '14px'
            }}
          >
            照片 {previewIndex + 1}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
