import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  showToggle?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChange,
  error,
  placeholder = '请输入密码',
  showToggle = true,
  disabled = false,
  autoFocus = false
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div style={containerStyle}>
      <div style={inputContainerStyle}>
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          style={{
            ...inputStyle,
            borderColor: error ? '#ff6b6b' : 'rgba(255, 215, 0, 0.3)'
          }}
        />
        {showToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={toggleButtonStyle}
            disabled={disabled}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <div style={errorStyle}>{error}</div>}
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  width: '100%'
};

const inputContainerStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 40px 10px 12px',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 215, 0, 0.3)',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s'
};

const toggleButtonStyle: React.CSSProperties = {
  position: 'absolute',
  right: '8px',
  background: 'none',
  border: 'none',
  color: '#888',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const errorStyle: React.CSSProperties = {
  color: '#ff6b6b',
  fontSize: '12px',
  marginTop: '4px'
};

export default PasswordInput;
