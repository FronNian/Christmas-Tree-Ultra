
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator'
import compression from 'vite-plugin-compression'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  base: './', // 使用相对路径，支持 Live Server 本地预览
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  plugins: [
    react(),
    basicSsl(),
    // Gzip 压缩
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // 大于 10kb 的文件才压缩
    }),
    obfuscatorPlugin({
      apply: 'build', // 只在生产构建时启用
      // 排除 3D 相关文件，避免影响渲染性能
      exclude: [
        /node_modules/,
        /three/,
        /components\/three/,
        /Experience/,
        /HeartParticles/,
        /TextParticles/,
        /Foliage/,
        /Snowfall/,
        /FairyLights/,
      ],
      options: {
        // ========== 基础混淆 ==========
        compact: true,
        simplify: true,

        // ========== 控制流混淆（降低阈值减少性能影响）==========
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.5, // 降低阈值
        deadCodeInjection: false,
        deadCodeInjectionThreshold: 0.4,

        // ========== 变量/函数名混淆 ==========
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,

        // ========== 字符串混淆 ==========
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayCallsTransformThreshold: 0.75,
        stringArrayEncoding: ['rc4'],
        stringArrayIndexesType: ['hexadecimal-number'],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 3, // 减少包装器数量
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 3,
        stringArrayWrappersType: 'function',
        stringArrayThreshold: 0.75,

        // ========== 字符串分割 ==========
        splitStrings: true,
        splitStringsChunkLength: 10,

        // ========== 其他 ==========
        unicodeEscapeSequence: false,
        numbersToExpressions: true,
        debugProtection: false,
        debugProtectionInterval: 0,
        disableConsoleOutput: true,
        selfDefending: true,
        log: false,
        seed: 0,
        sourceMap: false,
        target: 'browser',
        transformObjectKeys: true,
        reservedNames: [],
        reservedStrings: [],
      },
    }),
  ],
  server: {
    host: '0.0.0.0', // 允许局域网访问
    port: 5173, // 端口号
    https: {},
  },
  build: {
    // 分包优化
    rollupOptions: {
      output: {
        manualChunks: {
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'],
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
    // 启用 gzip 压缩提示
    reportCompressedSize: true,
    // 资源内联阈值（小于 4kb 的资源内联）
    assetsInlineLimit: 4096,
  },
})
