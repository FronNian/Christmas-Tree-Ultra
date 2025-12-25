import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Loader } from 'lucide-react';
import { PasswordInput } from './PasswordInput';
import { verifySharePassword } from '../../lib/r2';
import { saveVerification } from '../../utils/sessionAuth';

export interface PasswordDialogProps {
  shareId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30000; // 30 seconds

export const PasswordDialog: React.FC<PasswordDialogProps> = ({
  shareId,
  onSuccess,
  onCancel
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);

  // 倒计时更新
  useEffect(() => {
    if (!lockedUntil) return;

    const updateCountdown = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setCountdown(0);
        setAttempts(0);
        setError(null);
      } else {
        setCountdown(remaining);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (loading || lockedUntil) return;
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await verifySharePassword(shareId, password);

      if (result.valid) {
        // 保存验证状态到 sessionStorage
        saveVerification(shareId);
        onSuccess();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCKOUT_DURATION);
          setError(`尝试次数过多，请等待 30 秒后重试`);
        } else {
          setError(result.error || '密码错误');
        }
      }
    } catch {
      setError('验证失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [password, shareId, loading, lockedUntil, attempts, onSuccess]);

  // 回车提交
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && !lockedUntil) {
      handleSubmit();
    }
  }, [handleSubmit, loading, lockedUntil]);

  const isLocked = lockedUntil !== null;

  return (
    <div style={overlayStyle}>
      <div style={dialogStyle}>
        {/* 图标 */}
        <div style={iconContainerStyle}>
          <Lock size={32} color="#FFD700" />
        </div>

        {/* 标题 */}
        <h2 style={titleStyle}>需要密码访问</h2>
        <p style={subtitleStyle}>此分享已设置密码保护，请输入密码查看内容</p>

        {/* 密码输入 */}
        <form onSubmit={handleSubmit} style={formStyle}>
          <div onKeyDown={handleKeyDown}>
            <PasswordInput
              value={password}
              onChange={setPassword}
              error={error || undefined}
              placeholder="请输入访问密码"
              disabled={loading || isLocked}
              autoFocus
            />
          </div>

          {/* 锁定倒计时 */}
          {isLocked && (
            <div style={countdownStyle}>
              请等待 {countdown} 秒后重试
            </div>
          )}

          {/* 按钮 */}
          <div style={buttonContainerStyle}>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                style={cancelButtonStyle}
                disabled={loading}
              >
                返回
              </button>
            )}
            <button
              type="submit"
              style={{
                ...submitButtonStyle,
                opacity: loading || isLocked ? 0.6 : 1,
                cursor: loading || isLocked ? 'not-allowed' : 'pointer'
              }}
              disabled={loading || isLocked}
            >
              {loading ? (
                <>
                  <Loader size={16} className="spin" />
                  验证中...
                </>
              ) : (
                '确认'
              )}
            </button>
          </div>
        </form>

        {/* 尝试次数提示 */}
        {attempts > 0 && attempts < MAX_ATTEMPTS && !isLocked && (
          <div style={attemptsStyle}>
            已尝试 {attempts}/{MAX_ATTEMPTS} 次
          </div>
        )}
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
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
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
  padding: '32px',
  maxWidth: '380px',
  width: '100%',
  textAlign: 'center',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
};

const iconContainerStyle: React.CSSProperties = {
  marginBottom: '16px'
};

const titleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#FFD700',
  margin: '0 0 8px 0'
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#888',
  margin: '0 0 24px 0'
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px'
};

const buttonContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  marginTop: '8px'
};

const cancelButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px',
  backgroundColor: 'transparent',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '6px',
  color: '#888',
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'all 0.2s'
};

const submitButtonStyle: React.CSSProperties = {
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
  gap: '8px',
  transition: 'all 0.2s'
};

const countdownStyle: React.CSSProperties = {
  color: '#ff6b6b',
  fontSize: '13px',
  textAlign: 'center'
};

const attemptsStyle: React.CSSProperties = {
  color: '#666',
  fontSize: '12px',
  marginTop: '16px'
};

export default PasswordDialog;
