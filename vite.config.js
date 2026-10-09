import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5192,
    // Frontend gọi /api/* → chuyển sang server Node (giữ API key ở server, không lộ ra trình duyệt)
    proxy: { '/api': 'http://localhost:8787' },
  },
});
