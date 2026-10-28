import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { spawn, ChildProcess } from 'child_process';

let fastApiProcess: ChildProcess | null = null;

function startFastApiBackend() {
  if (fastApiProcess && !fastApiProcess.killed) return;
  console.log('[FastAPI] Spawning background uvicorn on port 5001...');
  fastApiProcess = spawn(
    'python3',
    ['-m', 'uvicorn', 'api.index:app', '--host', '127.0.0.1', '--port', '5001', '--log-level', 'info'],
    {
      stdio: 'ignore',
      detached: false,
    }
  );

  fastApiProcess.on('error', (err) => {
    console.error('[FastAPI] Process launch error:', err);
  });

  process.on('exit', () => {
    if (fastApiProcess) fastApiProcess.kill();
  });
  process.on('SIGINT', () => {
    if (fastApiProcess) fastApiProcess.kill();
  });
  process.on('SIGTERM', () => {
    if (fastApiProcess) fastApiProcess.kill();
  });
}

export default defineConfig(({ command }) => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'fastapi-backend-runner',
        configureServer() {
          startFastApiBackend();
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5001',
          changeOrigin: true,
        },
      },
    },
  };
});
