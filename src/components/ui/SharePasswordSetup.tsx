import React, { useState, useCallback } from 'react';
import { X, Lock, Loader, Clock, Infinity } from 'lucide-react';
import { PasswordInput } from './PasswordInput';
import { validatePasswordFormat } from '../../utils/password';

// 有效期选项类型
export type ExpiryOption = '7days' | '30days' | '90days' | 'permanent';

export interface SharePasswordSetupProps {
  visible: boolean;
  isUpdate: boolean;  // 是否是更新现有分享
  hasExistingPassword: boolean;  // 现有分享是否已有密码
  currentExpiry?: ExpiryOption;  // 当前有效期设置
  onConfirm: (password: string | null, expiry: ExpiryOption) => void;  // null 表示不设置/移除密码
  onCancel: () => void;
  loading?: boolean;
}

// 有效期选项配置
const EXPIRY_OPTIONS: { value: ExpiryOption; label: string; days: number | null }[] = [
  { value: '7days', label: '7 天', days: 7 },
  { value: '30days', label: '30 天', days: 30 },
  { value: '90days', label: '90 天', days: 90 },
  { value: 'permanent', label: '永久', days: null },
];

export const SharePasswordSetup: React.FC<SharePasswordSetupProps> = ({
  visible,
  isUpdate,
  hasExistingPassword,
  currentExpiry = '7days',
  onConfirm,
  onCancel,
  loading = false
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [removePassword, setRemovePassword] = useState(false);
  const [expiry, setExpiry] = useState<ExpiryOption>(currentExpiry);

  const handleSubmit = useCallback(() => {
    setError(null);

    // 如果选择移除密码
    if (removePassword) {
      onConfirm(null, expiry);
      return;
    }

    // 如果没有输入密码，不设置密码保护
    if (!password.trim()) {
      onConfirm(null, expiry);
      return;
    }

    // 验证密码格式
    const validation = validatePasswordFormat(password);
    if (!validation.valid) {
      setError(validation.error || '密码格式错误');
      return;
    }

    // 验证两次输入是否一致
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    onConfirm(password, expiry);
  }, [password, confirmPassword, removePassword, expiry, onConfirm]);

  const handleClose = useCallback(() => {
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setRemovePassword(false);
    setExpiry(currentExpiry);
    onCancel();
  }, [onCancel, currentExpiry]);

  if (!visible) return null;

  return (
    <div style={overlayStyle} onClick={handleClose}>
      <div style={dialogStyle} onClick={e => e.stopPropagation()}>
        {/* 关闭按钮 */}
        <button onClick={handleClose} style={closeButtonStyle} disabled={loading}>
          <X size={18} />
        </button>

        {/* 标题 */}
        <div style={titleStyle}>
          <Lock size={20} />
          {isUpdate ? '更新分享' : '创建分享'}
        </div>

        {/* 说明 */}
        <p style={descriptionStyle}>
          {isUpdate 
            ? '您可以修改分享的密码保护和有效期设置'
            : '您可以为分享设置访问密码和有效期（可选）'}
        </p>

        {/* 有效期选择 */}
        <div style={inputGroupStyle}>
          <label style={labelStyle}>
            <Clock size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            有效期
          </label>
          <div style={expiryOptionsStyle}>
            {EXPIRY_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => setExpiry(option.value)}
                style={{
                  ...expiryButtonStyle,
                  backgroundColor: expiry === option.value ? '#FFD700' : 'transparent',
                  color: expiry === option.value ? '#000' : '#ccc',
                  borderColor: expiry === option.value ? '#FFD700' : 'rgba(255, 255, 255, 0.2)'
                }}
                disabled={loading}
              >
                {option.value === 'permanent' && <Infinity size={14} style={{ marginRight: '4px' }} />}
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 移除密码选项（仅更新时且已有密码） */}
        {isUpdate && hasExistingPassword && (
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={removePassword}
              onChange={e => {
                setRemovePassword(e.target.checked);
                if (e.target.checked) {
                  setPassword('');
                  setConfirmPassword('');
                  setError(null);
                }
              }}
              style={checkboxStyle}
              disabled={loading}
            />
            <span>移除密码保护</span>
          </label>
        )}

        {/* 密码输入 */}
        {!removePassword && (
          <div style={inputsContainerStyle}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>
                {hasExistingPassword ? '新密码' : '访问密码'}
                <span style={optionalStyle}>（可选，4-20 字符）</span>
              </label>
              <PasswordInput
                value={password}
                onChange={setPassword}
                placeholder="留空则不设置密码"
                disabled={loading}
              />
            </div>

            {password && (
              <div style={inputGroupStyle}>
                <label style={labelStyle}>确认密码</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="再次输入密码"
                  error={error || undefined}
                  disabled={loading}
                />
              </div>
            )}
          </div>
        )}

        {/* 错误提示 */}
        {error && !password && (
          <div style={errorStyle}>{error}</div>
        )}

        {/* 按钮 */}
        <div style={buttonContainerStyle}>
          <button
            onClick={handleClose}
            style={cancelButtonStyle}
            disabled={loading}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            style={{
              ...confirmButtonStyle,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader size={16} className="spin" />
                处理中...
              </>
            ) : (
              isUpdate ? '更新分享' : '创建分享'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

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

const dialogStyle: React.CSSProperties = {
  backgroundColor: 'rgba(20, 20, 20, 0.98)',
  border: '1px solid rgba(255, 215, 0, 0.3)',
  borderRadius: '12px',
  padding: '24px',
  maxWidth: '400px',
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
  marginBottom: '12px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
};

const descriptionStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#888',
  marginBottom: '20px',
  lineHeight: '1.5'
};

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '14px',
  color: '#ccc',
  marginBottom: '16px',
  cursor: 'pointer'
};

const checkboxStyle: React.CSSProperties = {
  width: '16px',
  height: '16px',
  cursor: 'pointer'
};

const inputsContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  marginBottom: '20px'
};

const inputGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px'
};

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#ccc'
};

const optionalStyle: React.CSSProperties = {
  color: '#666',
  marginLeft: '4px'
};

const errorStyle: React.CSSProperties = {
  color: '#ff6b6b',
  fontSize: '13px',
  marginBottom: '16px'
};

const expiryOptionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap'
};

const expiryButtonStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '6px',
  fontSize: '13px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  transition: 'all 0.2s'
};

const buttonContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px'
};

const cancelButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px',
  backgroundColor: 'transparent',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '6px',
  color: '#888',
  fontSize: '14px',
  cursor: 'pointer'
};

const confirmButtonStyle: React.CSSProperties = {
  flex: 2,
  padding: '12px',
  backgroundColor: '#FFD700',
  border: 'none',
  borderRadius: '6px',
  color: '#000',
  fontSize: '14px',
  fontWeight: 'bold',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px'
};

export default SharePasswordSetup;
