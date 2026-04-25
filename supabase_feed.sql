-- ============================================================
-- 1. jindo_logs 에 title / content 컬럼 추가
--    (이미 존재하면 무시됨)
-- ============================================================
ALTER TABLE public.jindo_logs
  ADD COLUMN IF NOT EXISTS title   TEXT,
  ADD COLUMN IF NOT EXISTS content TEXT;

-- ============================================================
-- 2. feed_posts 테이블 생성
-- ============================================================
CREATE TABLE IF NOT EXISTS public.feed_posts (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_name  TEXT NOT NULL DEFAULT '진도 보호자',
    dog_name   TEXT NOT NULL,
    breed      TEXT DEFAULT '진돗개',
    image_url  TEXT NOT NULL,         -- Base64 data URL 또는 Storage URL
    content    TEXT,
    filter     TEXT DEFAULT 'none',
    likes      INTEGER DEFAULT 0,
    tags       JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

-- 전체 공개 정책 (인증 없이 CRUD 허용 — 프로덕션에서는 인증 추가 권장)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'feed_posts' AND policyname = 'Allow public read on feed_posts'
  ) THEN
    CREATE POLICY "Allow public read on feed_posts"
      ON public.feed_posts FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'feed_posts' AND policyname = 'Allow public insert on feed_posts'
  ) THEN
    CREATE POLICY "Allow public insert on feed_posts"
      ON public.feed_posts FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'feed_posts' AND policyname = 'Allow public update on feed_posts'
  ) THEN
    CREATE POLICY "Allow public update on feed_posts"
      ON public.feed_posts FOR UPDATE USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'feed_posts' AND policyname = 'Allow public delete on feed_posts'
  ) THEN
    CREATE POLICY "Allow public delete on feed_posts"
      ON public.feed_posts FOR DELETE USING (true);
  END IF;
END $$;
