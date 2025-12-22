
import { StrictMode, Component, type ReactNode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import SharePage from './pages/SharePage'

// 错误边界组件 - 防止白屏
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100vw', height: '100vh', backgroundColor: '#000',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontFamily: 'sans-serif', padding: '20px', textAlign: 'center'
        }}>
          <h2 style={{ color: '#FFD700', marginBottom: '16px' }}>🎄 加载出错了</h2>
          <p style={{ color: '#888', marginBottom: '16px', maxWidth: '300px' }}>
            {this.state.error?.message || '未知错误'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px', backgroundColor: '#FFD700', border: 'none',
              color: '#000', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px'
            }}
          >
            重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// 简单路由组件
function Router() {
  const [shareId, setShareId] = useState<string | null>(null);

  useEffect(() => {
    // 解析 URL 路径
    const path = window.location.pathname;
    // 严格匹配 8 位小写字母数字分享 ID: /xxxxxxxx
    // 只允许 a-z 和 0-9，防止路径注入
    const shareMatch = path.match(/^\/([a-z0-9]{8})$/);
    
    if (shareMatch) {
      // 额外验证：确保只包含安全字符
      const id = shareMatch[1];
      if (/^[a-z0-9]{8}$/.test(id)) {
        setShareId(id);
      }
    }
  }, []);

  // 分享页面
  if (shareId) {
    return <SharePage shareId={shareId} />;
  }

  // 主页面
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Router />
    </ErrorBoundary>
  </StrictMode>,
)
