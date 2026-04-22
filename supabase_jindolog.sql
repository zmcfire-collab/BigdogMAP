-- JindoLogs Table (User-contributed Growth Records)
CREATE TABLE public.jindo_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    log_date TEXT, -- Storing as text to match current app logic (e.g. '2026. 4. 19.')
    image_url TEXT NOT NULL, -- Base64 or URL
    filter TEXT DEFAULT 'none',
    tags JSONB DEFAULT '[]'::jsonb,
    hotspots JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jindo_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read on jindo_logs" ON public.jindo_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert on jindo_logs" ON public.jindo_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on jindo_logs" ON public.jindo_logs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on jindo_logs" ON public.jindo_logs FOR DELETE USING (true);
