import { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Experience, GestureController, SettingsPanel, TitleOverlay, Modal, LyricsDisplay, AvatarCropper, IntroOverlay, photoScreenPositions } from './components';
import { CHRISTMAS_MUSIC_URL } from './config';
import { isMobile, fileToBase64 } from './utils/helpers';
import { 
  uploadShare, getLocalShare, getShareUrl, updateShare, getShare,
  saveLocalConfig, getLocalConfig, saveLocalPhotos, getLocalPhotos,
  refreshShareExpiry, deleteShare, clearLocalShare
} from './lib/r2';
import type { SceneState, SceneConfig, GestureConfig, GestureAction, MusicConfig } from './types';
import { PRESET_MUSIC } from './types';
import { Volume2, VolumeX, Camera, Settings, Wrench, Link, TreePine, Sparkles, Loader } from 'lucide-react';

// 深度合并配置对象
function deepMergeConfig<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof target[key] === 'object' &&
        target[key] !== null
      ) {
        result[key] = deepMergeConfig(
          target[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      } else {
        result[key] = source[key] as T[Extract<keyof T, string>];
      }
    }
  }
  return result;
}

export default function GrandTreeApp() {
  const mobile = isMobile();
  const isShareMode = false; // TODO: 后续添加路由支持

  // 场景状态
  const [sceneState, setSceneState] = useState<SceneState>('CHAOS');
  const [rotationSpeed, setRotationSpeed] = useState(0);
  const [aiStatus, setAiStatus] = useState("INITIALIZING...");
  const [debugMode, setDebugMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // 手势效果状态
  const [showHeart, setShowHeart] = useState(false);
  const [showText, setShowText] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [currentGesture, setCurrentGesture] = useState<string>('');

  // 头像裁剪状态
  const [avatarToCrop, setAvatarToCrop] = useState<string | null>(null);

  // 开场文案状态
  const [introShown, setIntroShown] = useState(false);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textSwitchRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 默认手势配置
  const defaultGestures: GestureConfig = {
    Closed_Fist: 'formed',
    Open_Palm: 'chaos',
    Pointing_Up: 'music',
    Thumb_Down: 'none',
    Thumb_Up: 'screenshot',
    Victory: 'text',
    ILoveYou: 'heart'
  };

  // 默认音乐配置
  const defaultMusic: MusicConfig = {
    selected: 'christmas-stars',
    volume: 0.5
  };

  // 场景配置 - 初始化时尝试从本地读取
  const [sceneConfig, setSceneConfig] = useState<SceneConfig>(() => {
    const savedConfig = getLocalConfig();
    const defaultConfig = {
      foliage: { enabled: true, count: mobile ? 5000 : 15000 },
      lights: { enabled: true, count: mobile ? 100 : 400 },
      elements: { enabled: true, count: mobile ? 150 : 500 },
      snow: { enabled: true, count: mobile ? 500 : 2000, speed: 2, size: 0.5, opacity: 0.8 },
      sparkles: { enabled: !mobile, count: mobile ? 0 : 600 },
      stars: { enabled: true },
      bloom: { enabled: true, intensity: 1.5 },
      title: { enabled: true, text: 'Merry Christmas', size: 48 },
      giftPile: { enabled: true, count: 18 },
      ribbons: { enabled: true, count: mobile ? 30 : 50 },
      fog: { enabled: true, opacity: 0.3 },
      music: defaultMusic,
      gestures: defaultGestures,
      gestureText: 'MERRY CHRISTMAS',
      gestureEffect: {
        duration: 5000,
        hideTree: true,
        textCount: 1000,
        heartCount: 1500
      }
    };
    
    if (savedConfig) {
      // 深度合并配置，确保所有字段都有值
      return deepMergeConfig(defaultConfig, savedConfig as Partial<SceneConfig>);
    }
    return defaultConfig;
  });

  // 初始化照片
  const [configLoaded, setConfigLoaded] = useState(false);

  // 是否隐藏圣诞树（显示特效时）
  const [hideTree, setHideTree] = useState(false);

  // 处理图片上传
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPhotos: string[] = [];
    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        try {
          const base64 = await fileToBase64(file);
          newPhotos.push(base64);
        } catch (err) {
          console.error('Failed to convert image:', err);
        }
      }
    }

    if (newPhotos.length > 0) {
      setUploadedPhotos(prev => [...prev, ...newPhotos]);
      setRefreshKey(k => k + 1);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // 执行手势动作
  const executeGestureAction = useCallback((action: GestureAction) => {
    const effectConfig = sceneConfig.gestureEffect || {
      duration: 3000,
      hideTree: true,
      textCount: 1000,
      heartCount: 1500
    };
    
    switch (action) {
      case 'formed':
        setSceneState('FORMED');
        break;
      case 'chaos':
        setSceneState('CHAOS');
        break;
      case 'heart':
        if (heartTimeoutRef.current) clearTimeout(heartTimeoutRef.current);
        setShowHeart(true);
        setShowText(false);
        if (effectConfig.hideTree) setHideTree(true);
        heartTimeoutRef.current = setTimeout(() => {
          setShowHeart(false);
          if (effectConfig.hideTree) setHideTree(false);
          gestureActiveRef.current = false; // 效果结束，允许再次触发
        }, effectConfig.duration);
        break;
      case 'text':
        if (textTimeoutRef.current) clearTimeout(textTimeoutRef.current);
        if (textSwitchRef.current) clearInterval(textSwitchRef.current);
        
        // 获取文字列表
        const texts = sceneConfig.gestureTexts || [sceneConfig.gestureText || 'MERRY CHRISTMAS'];
        const switchInterval = (sceneConfig.textSwitchInterval || 3) * 1000;
        
        setCurrentTextIndex(0);
        setShowText(true);
        setShowHeart(false);
        if (effectConfig.hideTree) setHideTree(true);
        
        // 如果有多条文字，启动轮播
        if (texts.length > 1) {
          let idx = 0;
          textSwitchRef.current = setInterval(() => {
            idx = (idx + 1) % texts.length;
            setCurrentTextIndex(idx);
          }, switchInterval);
        }
        
        // 计算总时长：如果有多条文字，至少显示完一轮
        const totalDuration = texts.length > 1 
          ? Math.max(effectConfig.duration, texts.length * switchInterval)
          : effectConfig.duration;
        
        textTimeoutRef.current = setTimeout(() => {
          setShowText(false);
          if (effectConfig.hideTree) setHideTree(false);
          if (textSwitchRef.current) clearInterval(textSwitchRef.current);
          gestureActiveRef.current = false; // 效果结束，允许再次触发
        }, totalDuration);
        break;
      case 'music':
        // 直接操作音频
        if (audioRef.current) {
          if (audioRef.current.paused) {
            audioRef.current.play().catch(() => {});
            setMusicPlaying(true);
          } else {
            audioRef.current.pause();
            setMusicPlaying(false);
          }
        }
        break;
      case 'screenshot':
        // 截图功能
        const canvas = document.querySelector('canvas');
        if (canvas) {
          const link = document.createElement('a');
          link.download = 'christmas-tree.png';
          link.href = canvas.toDataURL('image/png');
          link.click();
        }
        break;
      case 'reset':
        setSceneState('FORMED');
        setRotationSpeed(0);
        break;
      default:
        break;
    }
  }, [sceneConfig, mobile]);

  // 上一次触发的手势（防止重复触发）
  const lastGestureRef = useRef<string>('');
  const gestureActiveRef = useRef<boolean>(false);

  // 处理手势变化
  const handleGestureChange = useCallback((gesture: string) => {
    setCurrentGesture(gesture);
    
    const gestures = sceneConfig.gestures || defaultGestures;
    const action = gestures[gesture as keyof GestureConfig];
    
    // 如果是同一个手势且效果正在显示中，不重复触发
    if (gesture === lastGestureRef.current && gestureActiveRef.current) {
      return;
    }
    
    // 如果手势变了，重置状态
    if (gesture !== lastGestureRef.current) {
      gestureActiveRef.current = false;
    }
    
    if (action && action !== 'none') {
      lastGestureRef.current = gesture;
      gestureActiveRef.current = true;
      executeGestureAction(action);
    }
  }, [sceneConfig.gestures, executeGestureAction]);

  // 处理捏合选择照片
  const handlePinch = useCallback((pos: { x: number; y: number }) => {
    if (selectedPhotoIndex !== null) {
      setSelectedPhotoIndex(null);
    } else {
      let closestIndex = 0;
      let closestDist = Infinity;

      photoScreenPositions.forEach((photoPos) => {
        if (photoPos) {
          const dx = photoPos.x - pos.x;
          const dy = photoPos.y - pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < closestDist) {
            closestDist = dist;
            closestIndex = photoPos.index;
          }
        }
      });

      if (closestDist < 0.15) {
        setSelectedPhotoIndex(closestIndex);
      }
    }
  }, [selectedPhotoIndex]);

  // 获取当前音乐 URL
  const getMusicUrl = useCallback(() => {
    const musicConfig = sceneConfig.music || defaultMusic;
    if (musicConfig.selected === 'custom' && musicConfig.customUrl) {
      return musicConfig.customUrl;
    }
    const preset = PRESET_MUSIC.find(m => m.id === musicConfig.selected);
    return preset?.url || CHRISTMAS_MUSIC_URL;
  }, [sceneConfig.music]);

  // 获取当前歌词 URL
  const getLrcUrl = useCallback(() => {
    const musicConfig = sceneConfig.music || defaultMusic;
    if (musicConfig.selected === 'custom') {
      return ''; // 自定义音乐暂不支持歌词
    }
    const preset = PRESET_MUSIC.find(m => m.id === musicConfig.selected);
    return preset?.lrc || '';
  }, [sceneConfig.music]);

  // 初始化音频
  useEffect(() => {
    const musicUrl = getMusicUrl();
    const volume = sceneConfig.music?.volume ?? 0.5;
    
    audioRef.current = new Audio(musicUrl);
    audioRef.current.loop = true;
    audioRef.current.volume = volume;

    const playAudio = () => {
      audioRef.current?.play().catch(() => setMusicPlaying(false));
    };
    playAudio();

    const handleInteraction = () => {
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().then(() => setMusicPlaying(true)).catch(() => {});
      }
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 音量变化时更新（不触发重新加载）
  useEffect(() => {
    if (!audioRef.current) return;
    const volume = sceneConfig.music?.volume ?? 0.5;
    audioRef.current.volume = volume;
  }, [sceneConfig.music?.volume]);

  // 音乐选择变化时重新加载
  useEffect(() => {
    if (!audioRef.current) return;
    
    const musicUrl = getMusicUrl();
    const wasPlaying = !audioRef.current.paused;
    
    // 检查是否需要切换音乐源
    const currentSrc = audioRef.current.src;
    const needsReload = 
      (musicUrl.startsWith('data:') && !currentSrc.startsWith('data:')) ||
      (!musicUrl.startsWith('data:') && !currentSrc.includes(encodeURIComponent(musicUrl.split('/').pop() || '')));
    
    if (needsReload) {
      audioRef.current.src = musicUrl;
      audioRef.current.currentTime = 0;
      if (wasPlaying) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [sceneConfig.music?.selected, sceneConfig.music?.customUrl, getMusicUrl]);

  // 播放/暂停音乐
  const toggleMusic = useCallback(() => {
    if (!audioRef.current) return;
    if (musicPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
    setMusicPlaying(!musicPlaying);
  }, [musicPlaying]);

  // 分享状态
  const [isSharing, setIsSharing] = useState(false);
  
  // 弹窗状态
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'alert' | 'confirm' | 'share' | 'error'>('alert');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalShareUrl, setModalShareUrl] = useState('');
  const [modalShareInfo, setModalShareInfo] = useState<{
    shareId: string;
    expiresAt: number;
    canEdit: boolean;
    onCopy: () => void;
    onDelete?: () => void;
    onRefresh?: () => void;
  } | undefined>(undefined);

  // 显示弹窗
  const showModal = useCallback((
    type: 'alert' | 'confirm' | 'share' | 'error',
    title: string,
    message?: string
  ) => {
    setModalType(type);
    setModalTitle(title);
    setModalMessage(message || '');
    setModalVisible(true);
  }, []);

  // 加载本地保存的照片（配置已在 useState 初始化时加载）
  useEffect(() => {
    const savedPhotos = getLocalPhotos();
    if (savedPhotos.length > 0) {
      setUploadedPhotos(savedPhotos);
    }
    setConfigLoaded(true);
  }, []);

  // 配置变化时保存到本地（只在初始加载完成后才保存，避免覆盖）
  useEffect(() => {
    if (configLoaded) {
      saveLocalConfig(sceneConfig as unknown as Record<string, unknown>);
    }
  }, [sceneConfig, configLoaded]);

  // 照片变化时保存到本地
  useEffect(() => {
    if (uploadedPhotos.length > 0) {
      saveLocalPhotos(uploadedPhotos);
    }
  }, [uploadedPhotos]);

  // 分享功能
  const handleShare = useCallback(async () => {
    if (uploadedPhotos.length === 0) {
      showModal('error', '提示', '请先上传照片');
      return;
    }
    
    setIsSharing(true);
    try {
      const localShare = getLocalShare();
      
      if (localShare) {
        // 已有分享，获取详情并显示弹窗
        const shareData = await getShare(localShare.shareId);
        if (shareData) {
          const shareUrl = getShareUrl(localShare.shareId);
          setModalShareUrl(shareUrl);
          setModalShareInfo({
            shareId: localShare.shareId,
            expiresAt: shareData.expiresAt,
            canEdit: true,
            onCopy: async () => {
              try {
                await navigator.clipboard.writeText(shareUrl);
                showModal('alert', '已复制', '分享链接已复制到剪贴板');
              } catch {
                // 复制失败时保持弹窗打开
              }
            },
            onRefresh: async () => {
              const result = await refreshShareExpiry(localShare.shareId, localShare.editToken);
              if (result.success) {
                showModal('alert', '续期成功', '分享有效期已延长 7 天');
              } else {
                showModal('error', '续期失败', result.error);
              }
            },
            onDelete: async () => {
              const result = await deleteShare(localShare.shareId, localShare.editToken);
              if (result.success) {
                setModalVisible(false);
                showModal('alert', '已删除', '分享已删除，您可以创建新的分享');
              } else {
                showModal('error', '删除失败', result.error);
              }
            }
          });
          showModal('share', '分享管理', '您已创建过分享，可以更新或管理');
          
          // 同时更新分享内容
          await updateShare(
            localShare.shareId,
            localShare.editToken,
            uploadedPhotos,
            sceneConfig as unknown as Record<string, unknown>,
            sceneConfig.gestureText
          );
        } else {
          // 分享已过期或不存在，清除本地记录
          clearLocalShare();
          showModal('alert', '提示', '之前的分享已过期，请重新创建');
        }
      } else {
        // 创建新分享
        const result = await uploadShare(
          uploadedPhotos,
          sceneConfig as unknown as Record<string, unknown>,
          sceneConfig.gestureText
        );
        
        if (result.success && result.shareId) {
          const shareUrl = getShareUrl(result.shareId);
          const shareData = await getShare(result.shareId);
          
          setModalShareUrl(shareUrl);
          setModalShareInfo({
            shareId: result.shareId,
            expiresAt: shareData?.expiresAt || Date.now() + 7 * 24 * 60 * 60 * 1000,
            canEdit: true,
            onCopy: async () => {
              try {
                await navigator.clipboard.writeText(shareUrl);
                showModal('alert', '已复制', '分享链接已复制到剪贴板');
              } catch {
                // 复制失败
              }
            },
            onRefresh: async () => {
              const localShareNow = getLocalShare();
              if (localShareNow) {
                const refreshResult = await refreshShareExpiry(localShareNow.shareId, localShareNow.editToken);
                if (refreshResult.success) {
                  showModal('alert', '续期成功', '分享有效期已延长 7 天');
                } else {
                  showModal('error', '续期失败', refreshResult.error);
                }
              }
            },
            onDelete: async () => {
              const localShareNow = getLocalShare();
              if (localShareNow) {
                const deleteResult = await deleteShare(localShareNow.shareId, localShareNow.editToken);
                if (deleteResult.success) {
                  setModalVisible(false);
                  showModal('alert', '已删除', '分享已删除');
                } else {
                  showModal('error', '删除失败', deleteResult.error);
                }
              }
            }
          });
          showModal('share', '分享成功', '您的圣诞树已分享！');
          
          // 自动复制
          try {
            await navigator.clipboard.writeText(shareUrl);
          } catch {
            // 忽略复制失败
          }
        } else {
          showModal('error', '分享失败', result.error || '请重试');
        }
      }
    } catch (err) {
      showModal('error', '分享失败', '网络错误，请重试');
      console.error(err);
    } finally {
      setIsSharing(false);
    }
  }, [uploadedPhotos, sceneConfig, showModal]);

  return (
    <div style={{ width: '100vw', height: '100dvh', backgroundColor: '#000', position: 'fixed', top: 0, left: 0, overflow: 'hidden', touchAction: 'none' }}>
      {/* 开场文案 */}
      {sceneConfig.intro?.enabled && !introShown && (
        <IntroOverlay
          text={sceneConfig.intro.text}
          subText={sceneConfig.intro.subText}
          duration={sceneConfig.intro.duration}
          onComplete={() => setIntroShown(true)}
        />
      )}

      {/* 3D Canvas */}
      <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
        <Canvas
          key={refreshKey}
          dpr={mobile ? 1 : [1, 2]}
          gl={{
            toneMapping: THREE.ReinhardToneMapping,
            antialias: !mobile,
            powerPreference: mobile ? 'low-power' : 'high-performance'
          }}
          shadows={false}
          frameloop="always"
        >
          <Experience
            sceneState={sceneState}
            rotationSpeed={rotationSpeed}
            config={sceneConfig}
            selectedPhotoIndex={selectedPhotoIndex}
            onPhotoSelect={setSelectedPhotoIndex}
            photoPaths={uploadedPhotos}
            showHeart={showHeart}
            showText={showText}
            customMessage={(sceneConfig.gestureTexts || [sceneConfig.gestureText || 'MERRY CHRISTMAS'])[currentTextIndex] || 'MERRY CHRISTMAS'}
            hideTree={hideTree}
            heartCount={sceneConfig.gestureEffect?.heartCount || 1500}
            textCount={sceneConfig.gestureEffect?.textCount || 1000}
          />
        </Canvas>
      </div>

      {/* 手势控制器 */}
      <GestureController
        onGesture={handleGestureChange}
        onMove={setRotationSpeed}
        onStatus={setAiStatus}
        debugMode={debugMode}
        enabled={aiEnabled}
        isPhotoSelected={selectedPhotoIndex !== null}
        onPinch={handlePinch}
      />

      {/* 设置面板 */}
      {!isShareMode && showSettings && (
        <SettingsPanel
          config={sceneConfig}
          onChange={setSceneConfig}
          onClose={() => setShowSettings(false)}
          aiEnabled={aiEnabled}
          onAiToggle={setAiEnabled}
          onAvatarUpload={(imageUrl) => setAvatarToCrop(imageUrl)}
        />
      )}

      {/* 头像裁剪器 */}
      {avatarToCrop && (
        <AvatarCropper
          imageUrl={avatarToCrop}
          onConfirm={(croppedImage) => {
            setSceneConfig(prev => ({ ...prev, topStar: { avatarUrl: croppedImage } }));
            setAvatarToCrop(null);
          }}
          onCancel={() => setAvatarToCrop(null)}
        />
      )}

      {/* 文件上传 */}
      {!isShareMode && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
      )}

      {/* 底部按钮 */}
      <div style={{
        position: 'fixed',
        bottom: mobile ? 'max(20px, env(safe-area-inset-bottom))' : '30px',
        right: mobile ? '10px' : '40px',
        left: mobile ? '10px' : 'auto',
        zIndex: 100,
        display: 'flex',
        gap: mobile ? '8px' : '10px',
        justifyContent: mobile ? 'center' : 'flex-end',
        flexWrap: 'wrap',
        pointerEvents: 'auto'
      }}>
        <button onClick={toggleMusic} style={buttonStyle(musicPlaying, mobile)}>
          {musicPlaying ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>

        {!isShareMode && (
          <>
            <button onClick={() => fileInputRef.current?.click()} style={buttonStyle(false, mobile)}><Camera size={18} /></button>
            <button onClick={() => setShowSettings(!showSettings)} style={buttonStyle(showSettings, mobile)}><Settings size={18} /></button>
            <button onClick={() => setDebugMode(!debugMode)} style={buttonStyle(debugMode, mobile)}>
              <Wrench size={18} />
            </button>
            <button onClick={handleShare} disabled={isSharing} style={buttonStyle(isSharing, mobile)}>
              {isSharing ? <Loader size={18} className="spin" /> : <Link size={18} />}
            </button>
          </>
        )}

        <button
          onClick={() => setSceneState(s => s === 'CHAOS' ? 'FORMED' : 'CHAOS')}
          style={{ ...buttonStyle(false, mobile), padding: mobile ? '12px 24px' : '12px 30px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          {sceneState === 'CHAOS' ? <><TreePine size={18} /> 聚合</> : <><Sparkles size={18} /> 散开</>}
        </button>
      </div>

      {/* AI 状态 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: aiStatus.includes('ERROR') || aiStatus.includes('DISABLED') ? '#888' : 'rgba(255, 215, 0, 0.4)',
        fontSize: '10px',
        letterSpacing: '2px',
        zIndex: 10,
        background: 'rgba(0,0,0,0.5)',
        padding: '4px 8px',
        borderRadius: '4px'
      }}>
        {aiStatus} {currentGesture && `| ${currentGesture}`}
      </div>

      {/* 标题 */}
      <TitleOverlay 
        text={sceneConfig.title?.text || 'Merry Christmas'} 
        enabled={sceneConfig.title?.enabled ?? true} 
        size={sceneConfig.title?.size || 48}
        font={sceneConfig.title?.font || 'Mountains of Christmas'}
      />

      {/* 歌词显示 */}
      <LyricsDisplay
        lrcUrl={getLrcUrl()}
        audioRef={audioRef}
        visible={!!getLrcUrl()}
      />

      {/* 自定义弹窗 */}
      <Modal
        visible={modalVisible}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
        shareUrl={modalShareUrl}
        shareInfo={modalShareInfo}
        onClose={() => setModalVisible(false)}
        buttons={modalType === 'alert' || modalType === 'error' ? [
          { text: '确定', onClick: () => setModalVisible(false), primary: true }
        ] : undefined}
      />
    </div>
  );
}

// 按钮样式
const buttonStyle = (active: boolean, mobile: boolean): React.CSSProperties => ({
  padding: mobile ? '12px 16px' : '12px 15px',
  backgroundColor: active ? '#FFD700' : 'rgba(0,0,0,0.7)',
  border: '1px solid #FFD700',
  color: active ? '#000' : '#FFD700',
  fontFamily: 'sans-serif',
  fontSize: mobile ? '14px' : '12px',
  fontWeight: 'bold',
  cursor: 'pointer',
  borderRadius: '8px'
});
