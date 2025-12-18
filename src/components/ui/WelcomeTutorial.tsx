import { useState } from 'react';
import { 
  X, ChevronRight, ChevronLeft, 
  Camera, Settings, Link, TreePine, Sparkles, Hand
} from 'lucide-react';
import { isMobile } from '../../utils/helpers';

interface WelcomeTutorialProps {
  onClose: () => void;
  isSharePage?: boolean;
}

// 主页教程步骤
const mainTutorialSteps = [
  {
    title: '欢迎来到 3D 圣诞树 🎄',
    content: '这是一个可以自定义的 3D 交互式圣诞树，支持手势控制、照片装饰、音乐播放等功能。',
    icon: TreePine,
    color: '#4CAF50'
  },
  {
    title: '上传照片 📸',
    content: '点击底部的相机按钮，上传你喜欢的照片，它们会变成圣诞树上的拍立得装饰。',
    icon: Camera,
    color: '#2196F3'
  },
  {
    title: '场景设置 ⚙️',
    content: '点击设置按钮，可以自定义：标题文字、开场文案、树顶头像、雪花数量、音乐选择等。',
    icon: Settings,
    color: '#FF9800'
  },
  {
    title: '手势控制 ✋',
    content: '开启 AI 手势识别后，可以用手势控制圣诞树：\n• 张开手掌 → 散开\n• 握拳 → 聚合\n• 剪刀手 → 文字特效\n• 我爱你手势 → 爱心特效',
    icon: Hand,
    color: '#E91E63'
  },
  {
    title: '分享给朋友 🔗',
    content: '配置好后，点击链接按钮生成分享链接，发送给朋友，他们就能看到你的专属圣诞树！',
    icon: Link,
    color: '#9C27B0'
  }
];

// 分享页教程步骤 - 简洁直接，只说明操作
const shareTutorialSteps = [
  {
    title: '操作说明 🎮',
    content: '• 点击「聚合/散开」按钮切换圣诞树形态\n• 点击 🔊 按钮控制背景音乐\n• 点击 ❓ 按钮可再次查看帮助',
    icon: Sparkles,
    color: '#FF9800'
  },
  {
    title: '手势控制 ✋',
    content: '开启摄像头后可用手势控制：\n• 张开手掌 → 散开\n• 握拳 → 聚合\n• 剪刀手 → 文字特效\n• 🤟 手势 → 爱心特效',
    icon: Hand,
    color: '#4CAF50'
  }
];

export const WelcomeTutorial = ({ onClose, isSharePage = false }: WelcomeTutorialProps) => {
  const mobile = isMobile();
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(true);
  
  const steps = isSharePage ? shareTutorialSteps : mainTutorialSteps;
  const totalSteps = steps.length;
  const currentStepData = steps[currentStep];

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
    // 记录已看过教程
    try {
      localStorage.setItem(isSharePage ? 'share_tutorial_seen' : 'welcome_tutorial_seen', 'true');
    } catch {
      // ignore
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleClose();
  };

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
        background: 'rgba(0, 0, 0, 0.85)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
        padding: mobile ? '16px' : '20px',
        boxSizing: 'border-box',
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
          padding: mobile ? '20px' : '28px',
          maxWidth: '420px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxSizing: 'border-box',
          transform: visible ? 'scale(1)' : 'scale(0.95)',
          transition: 'transform 0.3s ease',
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
            color: currentStepData.color 
          }}>
            <currentStepData.icon size={24} />
            <span style={{ 
              fontSize: mobile ? '16px' : '18px', 
              fontWeight: 'bold',
              color: '#FFD700'
            }}>
              {currentStepData.title}
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
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 内容 */}
        <div style={{
          color: '#ddd',
          fontSize: mobile ? '14px' : '15px',
          lineHeight: 1.7,
          marginBottom: '24px',
          whiteSpace: 'pre-line',
          minHeight: '100px',
        }}>
          {currentStepData.content}
        </div>

        {/* 进度指示器 */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '20px',
        }}>
          {steps.map((_, index) => (
            <div
              key={index}
              onClick={() => setCurrentStep(index)}
              style={{
                width: index === currentStep ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: index === currentStep ? '#FFD700' : 'rgba(255, 215, 0, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* 底部按钮 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
        }}>
          <button
            onClick={handleSkip}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: '13px',
              cursor: 'pointer',
              padding: '8px 12px',
            }}
          >
            跳过
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '10px 16px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <ChevronLeft size={16} /> 上一步
              </button>
            )}
            <button
              onClick={handleNext}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '10px 20px',
                background: '#FFD700',
                border: 'none',
                borderRadius: '8px',
                color: '#000',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {currentStep === totalSteps - 1 ? '开始使用' : '下一步'} 
              {currentStep < totalSteps - 1 && <ChevronRight size={16} />}
            </button>
          </div>
        </div>

        {/* 步骤计数 */}
        <p style={{
          textAlign: 'center',
          color: '#666',
          fontSize: '11px',
          margin: '16px 0 0 0',
        }}>
          {currentStep + 1} / {totalSteps}
        </p>
      </div>
    </div>
  );
};
