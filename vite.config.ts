import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Cast process to any to fix TS error: Property 'cwd' does not exist on type 'Process'
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    base: './',
    plugins: [react()],
    define: {
      // Polyfill process.env for the browser to satisfy the GoogleGenAI SDK requirement
      // and ensure the API key is injected during build/runtime.
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Prevent "process is not defined" error in some browser contexts
      'process.env': {}
    },
    server: {
      port: 3000,
      strictPort: false,
      host: true
    }
  };
});