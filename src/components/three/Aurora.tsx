import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AuroraConfig } from '../../types';

const auroraVertexShader = `
  uniform float uTime;
  uniform float uWaveSpeed;
  
  varying vec2 vUv;
  varying float vAngle;
  
  void main() {
    vUv = uv;
    vAngle = uv.x * 6.28318;
    
    vec3 pos = position;
    float wave1 = sin(vAngle * 3.0 + uTime * uWaveSpeed * 0.5) * 5.0;
    float wave2 = sin(vAngle * 5.0 - uTime * uWaveSpeed * 0.7) * 3.0;
    float wave3 = sin(vAngle * 8.0 + uTime * uWaveSpeed * 0.3) * 1.5;
    float verticalWave = (wave1 + wave2 + wave3) * (1.0 - uv.y * 0.6);
    pos.y += verticalWave;
    
    float radialWave = sin(vAngle * 2.0 + uTime * uWaveSpeed * 0.4) * 0.05 + 1.0;
    pos.x *= radialWave;
    pos.z *= radialWave;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const auroraFragmentShader = `
  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform float uIntensity;
  uniform float uWaveSpeed;
  uniform float uCoverage;
  
  varying vec2 vUv;
  varying float vAngle;
  
  float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }
  
  float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = noise(i);
    float b = noise(i + vec2(1.0, 0.0));
    float c = noise(i + vec2(0.0, 1.0));
    float d = noise(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amplitude * smoothNoise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }
  
  void main() {
    float time = uTime * uWaveSpeed * 0.2;
    float angle = vAngle;
    float noiseOffset = fbm(vec2(angle * 2.0 + time, vUv.y * 3.0)) * 0.5;
    float colorAngle = angle + noiseOffset;
    
    float mix1 = sin(colorAngle + time * 0.3) * 0.5 + 0.5;
    float mix2 = sin(colorAngle * 1.5 - time * 0.2 + 2.094) * 0.5 + 0.5;
    float mix3 = sin(colorAngle * 0.8 + time * 0.4 + 4.189) * 0.5 + 0.5;
    
    float total = mix1 + mix2 + mix3 + 0.001;
    mix1 /= total;
    mix2 /= total;
    mix3 /= total;
    
    vec3 color = uColor1 * mix1 + uColor2 * mix2 + uColor3 * mix3;
    
    float bottomFade = smoothstep(0.0, 0.3, vUv.y);
    float topFade = smoothstep(1.0, 0.6, vUv.y);
    float edgeFade = bottomFade * topFade;
    float verticalGradient = sin(vUv.y * 3.14159) * 0.7 + 0.3;
    
    float curtain = fbm(vec2(angle * 4.0 + time, vUv.y * 2.0));
    curtain = smoothstep(0.3, 0.7, curtain);
    float sparkle = smoothNoise(vec2(angle * 20.0 + time * 2.0, vUv.y * 10.0));
    
    float alpha = (curtain * 0.7 + 0.3) * verticalGradient * edgeFade * uIntensity * uCoverage;
    alpha += sparkle * 0.1 * edgeFade;
    
    gl_FragColor = vec4(color, alpha * 0.6);
  }
`;

interface AuroraProps {
  config: AuroraConfig;
}

export const Aurora = ({ config }: AuroraProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const colors = useMemo(() => config.colors.map(c => new THREE.Color(c)), [config.colors]);
  
  const geometry = useMemo(() => {
    return new THREE.CylinderGeometry(180, 180, 120, 64, 32, true);
  }, []);
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor1: { value: colors[0].clone() },
    uColor2: { value: colors[1].clone() },
    uColor3: { value: colors[2].clone() },
    uIntensity: { value: config.intensity },
    uWaveSpeed: { value: config.waveSpeed },
    uCoverage: { value: config.coverage }
  }), []);
  
  useEffect(() => {
    if (materialRef.current?.uniforms) {
      materialRef.current.uniforms.uColor1.value.copy(colors[0]);
      materialRef.current.uniforms.uColor2.value.copy(colors[1]);
      materialRef.current.uniforms.uColor3.value.copy(colors[2]);
      materialRef.current.uniforms.uIntensity.value = config.intensity;
      materialRef.current.uniforms.uWaveSpeed.value = config.waveSpeed;
      materialRef.current.uniforms.uCoverage.value = config.coverage;
    }
  }, [colors, config.intensity, config.waveSpeed, config.coverage]);
  
  useFrame((_, delta) => {
    if (materialRef.current?.uniforms) {
      materialRef.current.uniforms.uTime.value += delta;
    }
  });

  // 清理资源：在组件卸载时释放 geometry 和 material
  useEffect(() => {
    return () => {
      geometry.dispose();
      if (materialRef.current) {
        materialRef.current.dispose();
      }
    };
  }, [geometry]);

  if (!config.enabled) return null;

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, 60, 0]}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={auroraVertexShader}
        fragmentShader={auroraFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.BackSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};
