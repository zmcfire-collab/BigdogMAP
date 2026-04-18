-- 1. Places Table (Managed by Admin)
CREATE TABLE public.places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Other', -- Hotel, Cafe, Restaurant, Training, Trail, Playground
    address TEXT,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    jindo_certified BOOLEAN DEFAULT false,
    tags JSONB DEFAULT '[]'::jsonb, -- ['대형견 가능', '넓은 잔디밭', etc]
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Pins Table (User-contributed Reports)
CREATE TABLE public.pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('GREEN', 'RED')),
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    reporter_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Reviews Table
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID REFERENCES public.places(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    user_nickname TEXT,
    user_pet_breed TEXT, -- e.g., '진돗개'
    user_pet_weight NUMERIC, -- e.g., 14.5
    content TEXT NOT NULL,
    photo_url TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policies: Everyone can read
CREATE POLICY "Allow public read on places" ON public.places FOR SELECT USING (true);
CREATE POLICY "Allow public read on pins" ON public.pins FOR SELECT USING (status = 'approved');
CREATE POLICY "Allow public read on reviews" ON public.reviews FOR SELECT USING (true);

-- Policies: Anyone can insert (Anonymous reporting)
CREATE POLICY "Allow public insert on pins" ON public.pins FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow auth insert on reviews" ON public.reviews FOR INSERT WITH CHECK (auth.role() = 'authenticated');
