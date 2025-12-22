import { useState, useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';
import { isMobile } from '../../utils/helpers';

interface KeyboardShortcutsProps {
  onClose: () => void;
}

// 快捷键列表
const shortcuts = [
  { key: 'Space', description: '聚合/散开切换', category: '场景控制' },
  { key: 'R', description: '重置视角', category: '场景控制' },
  { key: 'F', description: '全屏切换', category: '场景控制' },
  { key: 'P', description: '播放/停止故事线', category: '场景控制' },
  { key: 'M', description: '音乐开关', category: '媒体控制' },
  { key: 'H', description: '爱心特效', category: '特效' },
  { key: 'T', description: '文字特效', category: '特效' },
  { key: 'S', description: '打开设置', category: '界面' },
  { key: '?', description: '显示快捷键帮助', category: '界面' },
  { key: 'Esc', description: '关闭弹窗/取消选择', category: '界面' },
  { key: '←/→', description: '旋转视角', category: '视角控制' },
  { key: '↑/↓', description: '缩放视角', category: '视角控制' },
];

// 按分类分组
const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
  if (!acc[shortcut.category]) {
    acc[shortcut.category] = [];
  }
  acc[shortcut.category].push(shortcut);
  return acc;
}, {} as Record<string, typeof shortcuts>);

export const KeyboardShortcuts = ({ onClose }: KeyboardShortcutsProps) => {
  const [visible, setVisible] = useState(true);
  const mobile = isMobile();

  // 移动端不显示
  if (mobile) {
    return null;
  }

  const handleClose = () => {
    setVisible(false);
    // 记录已看过快捷键帮助
    try {
      localStorage.setItem('keyboard_help_seen', 'true');
    } catch {
      // ignore
    }
    setTimeout(onClose, 200);
  };

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.8)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s ease',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          background: 'rgba(20, 20, 20, 0.98)',
          border: '1px solid rgba(255, 215, 0, 0.3)',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          transform: visible ? 'scale(1)' : 'scale(0.95)',
          transition: 'transform 0.2s ease',
        }}
      >
        {/* 头部 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(255, 215, 0, 0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Keyboard size={22} color="#FFD700" />
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#FFD700' }}>
              快捷键
            </span>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
          >
            <X size={20} />
          </button>
        </div>

        {/* 快捷键列表 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {Object.entries(groupedShortcuts).map(([category, items]) => (
            <div key={category}>
              <h3 style={{
                color: '#888',
                fontSize: '12px',
                fontWeight: 'normal',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '10px',
              }}>
                {category}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {items.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '8px',
                    }}
                  >
                    <span style={{ color: '#ccc', fontSize: '14px' }}>
                      {shortcut.description}
                    </span>
                    <kbd style={{
                      background: 'rgba(255, 215, 0, 0.15)',
                      border: '1px solid rgba(255, 215, 0, 0.3)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      color: '#FFD700',
                      minWidth: '40px',
                      textAlign: 'center',
                    }}>
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 底部提示 */}
        <p style={{
          textAlign: 'center',
          color: '#555',
          fontSize: '12px',
          marginTop: '20px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          按 <kbd style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '11px',
          }}>?</kbd> 随时查看此帮助
        </p>
      </div>
    </div>
  );
};
