import React, { useEffect, useCallback, useState } from 'react';
import { X, Check, Copy, Trash2, RefreshCw, AlertCircle, Lock, Eye, EyeOff } from 'lucide-react';

// 弹窗类型
export type ModalType = 'alert' | 'confirm' | 'share' | 'error';

export interface ModalButton {
  text: string;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
}

export interface ModalProps {
  visible: boolean;
  type?: ModalType;
  title?: string;
  message?: string;
  shareUrl?: string;
  buttons?: ModalButton[];
  onClose: () => void;
  // 分享弹窗专用
  shareInfo?: {
    shareId: string;
    expiresAt: number;
    canEdit: boolean;
    onCopy: () => void;
    onDelete?: () => void;
    onRefresh?: () => void;
    hasPassword?: boolean;  // 是否已设置密码
    password?: string;      // 新设置的密码（用于显示给用户复制）
    onCopyPassword?: () => void;  // 复制密码
  };
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  type = 'alert',
  title,
  message,
  shareUrl,
  buttons,
  onClose,
  shareInfo
}) => {
  // ESC 关闭
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, handleKeyDown]);

  if (!visible) return null;

  // 计算剩余天数（-1 表示永久有效）
  const getRemainingDays = (expiresAt: number) => {
    if (expiresAt === -1) return -1; // 永久有效
    const days = Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
    return days > 0 ? days : 0;
  };

  // 格式化有效期显示
  const formatExpiry = (expiresAt: number) => {
    const days = getRemainingDays(expiresAt);
    if (days === -1) return '永久有效';
    return `还剩 ${days} 天`;
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        {/* 关闭按钮 */}
        <button onClick={onClose} style={closeButtonStyle}>
          <X size={18} />
        </button>

        {/* 标题 */}
        {title && (
          <div style={titleStyle}>
            {type === 'error' && <AlertCircle size={20} style={{ color: '#ff6b6b' }} />}
            {title}
          </div>
        )}

        {/* 消息 */}
        {message && (
          <div style={messageStyle}>
            {message.split(/(https?:\/\/[^\s\)]+)/g).map((part, i) => {
              if (part.match(/^https?:\/\//)) {
                return (
                  <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#9EFFE0', textDecoration: 'underline' }}
                  >
                    {part}
                  </a>
                );
              }
              return <span key={i}>{part}</span>;
            })}
          </div>
        )}

        {/* 分享链接 */}
        {shareUrl && (
          <div style={shareUrlContainerStyle}>
            <input
              type="text"
              value={shareUrl}
              readOnly
              style={shareUrlInputStyle}
              onClick={e => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={shareInfo?.onCopy}
              style={copyButtonStyle}
              title="复制链接"
            >
              <Copy size={16} />
            </button>
          </div>
        )}

        {/* 密码显示区域 */}
        {shareInfo?.password && (
          <PasswordDisplay 
            password={shareInfo.password} 
            onCopy={shareInfo.onCopyPassword}
          />
        )}

        {/* 分享信息 */}
        {shareInfo && (
          <div style={shareInfoStyle}>
            <div style={infoRowStyle}>
              <span style={{ color: '#888' }}>分享 ID:</span>
              <span style={{ color: '#FFD700' }}>{shareInfo.shareId}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={{ color: '#888' }}>有效期:</span>
              <span style={{ 
                color: getRemainingDays(shareInfo.expiresAt) === -1 
                  ? '#4ade80' 
                  : getRemainingDays(shareInfo.expiresAt) <= 1 
                    ? '#ff6b6b' 
                    : '#4ade80' 
              }}>
                {formatExpiry(shareInfo.expiresAt)}
              </span>
            </div>
            {/* 密码保护状态 */}
            <div style={infoRowStyle}>
              <span style={{ color: '#888' }}>密码保护:</span>
              <span style={{ color: shareInfo.hasPassword || shareInfo.password ? '#4ade80' : '#888' }}>
                {shareInfo.hasPassword || shareInfo.password ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Lock size={12} /> 已设置
                  </span>
                ) : '未设置'}
              </span>
            </div>
            
            {shareInfo.canEdit && (
              <div style={actionButtonsStyle}>
                {shareInfo.onRefresh && (
                  <button onClick={shareInfo.onRefresh} style={actionButtonStyle}>
                    <RefreshCw size={14} /> 续期 7 天
                  </button>
                )}
                {shareInfo.onDelete && (
                  <button onClick={shareInfo.onDelete} style={{ ...actionButtonStyle, ...dangerButtonStyle }}>
                    <Trash2 size={14} /> 删除分享
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 按钮 */}
        {buttons && buttons.length > 0 && (
          <div style={buttonsContainerStyle}>
            {buttons.map((btn, idx) => (
              <button
                key={idx}
                onClick={btn.onClick}
                style={{
                  ...buttonStyle,
                  ...(btn.primary ? primaryButtonStyle : {}),
                  ...(btn.danger ? dangerButtonStyle : {})
                }}
              >
                {btn.primary && <Check size={16} />}
                {btn.text}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// 样式
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px'
};

const modalStyle: React.CSSProperties = {
  backgroundColor: 'rgba(20, 20, 20, 0.98)',
  border: '1px solid rgba(255, 215, 0, 0.3)',
  borderRadius: '12px',
  padding: '24px',
  maxWidth: '420px',
  width: '100%',
  position: 'relative',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
};

const closeButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '12px',
  right: '12px',
  background: 'none',
  border: 'none',
  color: '#666',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const titleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#FFD700',
  marginBottom: '16px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
};

const messageStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#ccc',
  lineHeight: '1.6',
  marginBottom: '16px',
  whiteSpace: 'pre-wrap'
};

const shareUrlContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginBottom: '16px'
};

const shareUrlInputStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px 12px',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 215, 0, 0.3)',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '13px',
  outline: 'none'
};

const copyButtonStyle: React.CSSProperties = {
  padding: '10px 14px',
  backgroundColor: '#FFD700',
  border: 'none',
  borderRadius: '6px',
  color: '#000',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const shareInfoStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: '8px',
  padding: '12px',
  marginBottom: '16px'
};

const infoRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '13px',
  marginBottom: '8px'
};

const actionButtonsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginTop: '12px',
  paddingTop: '12px',
  borderTop: '1px solid rgba(255, 255, 255, 0.1)'
};

const actionButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  backgroundColor: 'rgba(255, 215, 0, 0.2)',
  border: '1px solid rgba(255, 215, 0, 0.4)',
  borderRadius: '6px',
  color: '#FFD700',
  fontSize: '12px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px'
};

const buttonsContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
  justifyContent: 'flex-end'
};

const buttonStyle: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px'
};

const primaryButtonStyle: React.CSSProperties = {
  backgroundColor: '#FFD700',
  border: '1px solid #FFD700',
  color: '#000'
};

const dangerButtonStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255, 107, 107, 0.2)',
  border: '1px solid rgba(255, 107, 107, 0.4)',
  color: '#ff6b6b'
};

// 密码显示子组件
const PasswordDisplay: React.FC<{ password: string; onCopy?: () => void }> = ({ password, onCopy }) => {
  const [showPassword, setShowPassword] = useState(false);
  
  return (
    <div style={passwordDisplayContainerStyle}>
      <div style={passwordLabelStyle}>
        <Lock size={14} />
        <span>访问密码（请妥善保管）</span>
      </div>
      <div style={passwordValueContainerStyle}>
        <input
          type={showPassword ? 'text' : 'password'}
          value={password}
          readOnly
          style={passwordInputStyle}
          onClick={e => (e.target as HTMLInputElement).select()}
        />
        <button
          onClick={() => setShowPassword(!showPassword)}
          style={passwordToggleStyle}
          title={showPassword ? '隐藏密码' : '显示密码'}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
        {onCopy && (
          <button
            onClick={onCopy}
            style={copyButtonStyle}
            title="复制密码"
          >
            <Copy size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

const passwordDisplayContainerStyle: React.CSSProperties = {
  backgroundColor: 'rgba(74, 222, 128, 0.1)',
  border: '1px solid rgba(74, 222, 128, 0.3)',
  borderRadius: '8px',
  padding: '12px',
  marginBottom: '16px'
};

const passwordLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  color: '#4ade80',
  fontSize: '12px',
  marginBottom: '8px'
};

const passwordValueContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px'
};

const passwordInputStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(74, 222, 128, 0.3)',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  fontFamily: 'monospace',
  outline: 'none'
};

const passwordToggleStyle: React.CSSProperties = {
  padding: '8px 10px',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '6px',
  color: '#888',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

export default Modal;
