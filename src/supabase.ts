import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '[대견할지도] Supabase 환경변수가 설정되지 않았습니다.\n' +
    '.env.example을 참고해서 .env 파일을 만들어주세요.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) console.error('Google login error:', error);
};

export const signInWithApple = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo: window.location.origin },
  });
  if (error) console.error('Apple login error:', error);
};

export const signInWithFacebook = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: { redirectTo: window.location.origin },
  });
  if (error) console.error('Facebook login error:', error);
};
