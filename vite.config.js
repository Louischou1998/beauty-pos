import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) return 'vendor';
          if (id.includes('antd') || id.includes('@ant-design')) return 'antd';
          if (id.includes('recharts')) return 'charts';
          if (id.includes('dayjs') || id.includes('axios') || id.includes('xlsx')) return 'utils';
        },
      },
    },
  },
})
