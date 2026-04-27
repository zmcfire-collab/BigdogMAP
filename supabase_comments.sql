-- ============================================================
-- 1. comments 테이블 (피드 댓글)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_name  TEXT NOT NULL DEFAULT '진도 보호자',
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='comments' AND policyname='Allow public read on comments') THEN
    CREATE POLICY "Allow public read on comments" ON public.comments FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='comments' AND policyname='Allow public insert on comments') THEN
    CREATE POLICY "Allow public insert on comments" ON public.comments FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='comments' AND policyname='Allow public delete on comments') THEN
    CREATE POLICY "Allow public delete on comments" ON public.comments FOR DELETE USING (true);
  END IF;
END $$;

-- ============================================================
-- 2. pet_profiles 테이블 (AI 케어용 반려견 프로필)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pet_profiles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  breed      TEXT DEFAULT '진돗개',
  color      TEXT DEFAULT '백구',
  birth_date TEXT,
  gender     TEXT DEFAULT '상관없음',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pet_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pet_profiles' AND policyname='Allow public read on pet_profiles') THEN
    CREATE POLICY "Allow public read on pet_profiles" ON public.pet_profiles FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pet_profiles' AND policyname='Allow public insert on pet_profiles') THEN
    CREATE POLICY "Allow public insert on pet_profiles" ON public.pet_profiles FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pet_profiles' AND policyname='Allow public update on pet_profiles') THEN
    CREATE POLICY "Allow public update on pet_profiles" ON public.pet_profiles FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pet_profiles' AND policyname='Allow public delete on pet_profiles') THEN
    CREATE POLICY "Allow public delete on pet_profiles" ON public.pet_profiles FOR DELETE USING (true);
  END IF;
END $$;

-- ============================================================
-- 3. weight_logs 테이블 (체중 기록)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id     UUID REFERENCES public.pet_profiles(id) ON DELETE CASCADE,
  weight     NUMERIC NOT NULL,
  log_date   TEXT NOT NULL,
  note       TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='weight_logs' AND policyname='Allow public read on weight_logs') THEN
    CREATE POLICY "Allow public read on weight_logs" ON public.weight_logs FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='weight_logs' AND policyname='Allow public insert on weight_logs') THEN
    CREATE POLICY "Allow public insert on weight_logs" ON public.weight_logs FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='weight_logs' AND policyname='Allow public delete on weight_logs') THEN
    CREATE POLICY "Allow public delete on weight_logs" ON public.weight_logs FOR DELETE USING (true);
  END IF;
END $$;

-- ============================================================
-- 4. reviews 테이블 INSERT 정책 완화 (비로그인 허용)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reviews' AND policyname='Allow public insert on reviews') THEN
    CREATE POLICY "Allow public insert on reviews" ON public.reviews FOR INSERT WITH CHECK (true);
  END IF;
END $$;
