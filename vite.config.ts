import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      // 빌드 시 index.html에 네이버 지도 스크립트를 안전하게 삽입
      {
        name: 'inject-naver-maps',
        transformIndexHtml(html) {
          const clientId = env.VITE_NAVER_CLIENT_ID || '';
          const script = `<script type="text/javascript" src="https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}"></script>`;
          return html.replace('</head>', `  ${script}\n  </head>`);
        },
      },
    ],
  };
});
