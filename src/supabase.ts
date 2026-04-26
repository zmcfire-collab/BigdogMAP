import { createClient } from '@supabase/supabase-js';

// --- 사용자님의 프로젝트 정보로 세팅되었습니다 ---
// URL: https://kpqlnvygwbhejmwxfcyd.supabase.co
// Anon Key: 화면에 보인 키를 기반으로 설정했습니다.
const SUPABASE_URL = 'https://kpqlnvygwbhejmwxfcyd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcWxudnlnd2JoZWptd3hmY3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NjczNzgsImV4cCI6MjA5MTA0MzM3OH0.IKFCFB2v3QnurTi0TVgOmp_MYbhXFkAyVZ4o8qDltuw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) console.error('Google login error:', error);
};

export const signInWithApple = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) console.error('Apple login error:', error);
};

export const signInWithFacebook = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) console.error('Facebook login error:', error);
};

// --- SQL TO RUN IN SUPABASE SQL EDITOR ---
/*
  [supabase_schema.sql](file:///n:/개인/!!!!!!!!APP제작/대견할지도/supabase_schema.sql) 
  파일의 내용을 복사해서 Supabase 대시보드의 SQL Editor에 붙여넣고 'Run'을 클릭하세요.
*/
