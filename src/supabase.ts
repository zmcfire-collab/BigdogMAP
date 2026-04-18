import { createClient } from '@supabase/supabase-js';

// --- 사용자님의 프로젝트 정보로 세팅되었습니다 ---
// URL: https://kpqlnvygwbhejmwxfcyd.supabase.co
// Anon Key: 화면에 보인 키를 기반으로 설정했습니다.
const SUPABASE_URL = 'https://kpqlnvygwbhejmwxfcyd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_llphjUnih0e9LaEWDYvDUQ_mnsPx5rC6QSTk'; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- SQL TO RUN IN SUPABASE SQL EDITOR ---
/*
  [supabase_schema.sql](file:///n:/개인/!!!!!!!!APP제작/대견할지도/supabase_schema.sql) 
  파일의 내용을 복사해서 Supabase 대시보드의 SQL Editor에 붙여넣고 'Run'을 클릭하세요.
*/
