// 모든 설정값은 .env 파일에서 읽어옵니다.
// 절대로 이 파일에 직접 값을 입력하지 마세요.
export const APP_CONFIG = {
  ADMIN: {
    ID: import.meta.env.VITE_ADMIN_ID as string,
    PW: import.meta.env.VITE_ADMIN_PW as string,
  },
  GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY as string,
} as const;
