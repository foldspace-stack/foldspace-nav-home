import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  server: {
    port: 3000,
    host: '0.0.0.0',
    open: true,
  },
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: mode === 'development',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor';
          }
          if (id.includes('node_modules/lucide-react/')) {
            return 'ui';
          }
          if (id.includes('node_modules/@dnd-kit/')) {
            return 'dnd';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 500,
    target: 'esnext',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react'],
  },
  css: {
    devSourcemap: true,
  },
  preview: {
    port: 4173,
  },
}));
