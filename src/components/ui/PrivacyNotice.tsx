import { useState } from 'react';
import { Shield, X, ChevronDown, ChevronUp } from 'lucide-react';
import { isMobile } from '../../utils/helpers';

interface PrivacyNoticeProps {
  onClose: () => void;
}

export const PrivacyNotice = ({ onClose }: PrivacyNoticeProps) => {
  const mobile = isMobile();
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.85)',
        padding: mobile ? '16px' : '20px',
        boxSizing: 'border-box',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'rgba(20, 20, 20, 0.98)',
          border: '1px solid rgba(255, 215, 0, 0.3)',
          borderRadius: '16px',
          padding: mobile ? '20px' : '28px',
          maxWidth: '480px',
          width: '100%',
          maxHeight: '85vh',
          overflow: 'auto',
          boxSizing: 'border-box',
        }}
      >
        {/* 头部 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px' 
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            color: '#FFD700' 
          }}>
            <Shield size={24} />
            <span style={{ 
              fontSize: mobile ? '16px' : '18px', 
              fontWeight: 'bold'
            }}>
              隐私政策与数据说明
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 核心说明 */}
        <div style={{
          background: 'rgba(255, 215, 0, 0.1)',
          border: '1px solid rgba(255, 215, 0, 0.3)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
        }}>
          <h3 style={{ 
            color: '#FFD700', 
            fontSize: '14px', 
            margin: '0 0 12px 0',
            fontWeight: 'bold'
          }}>
            📌 重要提示
          </h3>
          <ul style={{
            color: '#ddd',
            fontSize: '13px',
            lineHeight: 1.8,
            margin: 0,
            paddingLeft: '20px',
          }}>
            <li>分享数据 <strong style={{ color: '#FFD700' }}>仅保留 7 天</strong>，到期自动删除</li>
            <li>分享链接 <strong style={{ color: '#FF6B6B' }}>任何人都可访问</strong>，请勿上传敏感信息</li>
            <li>您可以随时通过分享按钮 <strong style={{ color: '#4CAF50' }}>删除分享</strong></li>
          </ul>
        </div>

        {/* 详细说明（可展开） */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: '#aaa',
            fontSize: '13px',
            cursor: 'pointer',
            marginBottom: expanded ? '12px' : '0',
          }}
        >
          <span>查看详细隐私政策</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {expanded && (
          <div style={{
            color: '#999',
            fontSize: '12px',
            lineHeight: 1.8,
          }}>
            <section style={{ marginBottom: '16px' }}>
              <h4 style={{ color: '#ddd', margin: '0 0 8px 0', fontSize: '13px' }}>1. 数据收集</h4>
              <p style={{ margin: 0 }}>
                本应用收集您上传的照片、配置信息（标题、音乐选择等）用于生成分享页面。
                我们不会收集您的个人身份信息、设备信息或位置信息。
              </p>
            </section>

            <section style={{ marginBottom: '16px' }}>
              <h4 style={{ color: '#ddd', margin: '0 0 8px 0', fontSize: '13px' }}>2. 数据存储</h4>
              <p style={{ margin: 0 }}>
                • 分享数据存储在 Cloudflare R2 云存储服务<br/>
                • 数据保留期限为 <strong>7 天</strong>，到期后自动删除<br/>
                • 可续期最多 7 次（共 56 天）<br/>
                • 本地配置存储在浏览器 localStorage 中
              </p>
            </section>

            <section style={{ marginBottom: '16px' }}>
              <h4 style={{ color: '#ddd', margin: '0 0 8px 0', fontSize: '13px' }}>3. 数据访问</h4>
              <p style={{ margin: 0 }}>
                • 分享链接为 <strong>公开链接</strong>，任何获得链接的人都可以访问<br/>
                • 请勿上传包含敏感个人信息的照片<br/>
                • 建议仅分享给信任的朋友
              </p>
            </section>

            <section style={{ marginBottom: '16px' }}>
              <h4 style={{ color: '#ddd', margin: '0 0 8px 0', fontSize: '13px' }}>4. 数据删除</h4>
              <p style={{ margin: 0 }}>
                您可以随时删除您创建的分享：<br/>
                • 点击底部「分享」按钮<br/>
                • 在弹出的分享管理窗口中点击「删除分享」<br/>
                • 删除后数据将立即从服务器移除
              </p>
            </section>

            <section>
              <h4 style={{ color: '#ddd', margin: '0 0 8px 0', fontSize: '13px' }}>5. 摄像头权限</h4>
              <p style={{ margin: 0 }}>
                手势识别功能需要摄像头权限，摄像头画面仅在本地处理，
                <strong>不会上传或存储任何视频数据</strong>。
              </p>
            </section>
          </div>
        )}

        {/* 确认按钮 */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: '20px',
            padding: '12px',
            background: '#FFD700',
            border: 'none',
            borderRadius: '8px',
            color: '#000',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          我已了解
        </button>
      </div>
    </div>
  );
};
