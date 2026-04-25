import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, MessageCircle, Share2, MoreHorizontal,
  Sparkles, Plus, ArrowLeft, Check, X
} from 'lucide-react';
import Cropper from 'react-easy-crop';
import { supabase } from './supabase';
import { cn } from './lib/utils';

// --- Types ---
interface CropArea { x: number; y: number; width: number; height: number; }

interface FeedPost {
  id: string;
  user_name: string;
  dog_name: string;
  breed: string;
  image_url: string;
  content: string;
  filter: string;
  likes: number;
  comments?: number;
  tags: string[];
  created_at: string;
}

// --- Canvas Crop & Compress Utility ---
const MAX_PX = 900; // max output dimension (keeps base64 under ~300KB)
const JPEG_Q = 0.80;

function createImageEl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.src = url;
  });
}

async function getCroppedImg(src: string, pixels: CropArea): Promise<string> {
  const image = await createImageEl(src);
  const scale = Math.min(1, MAX_PX / pixels.width, MAX_PX / pixels.height);
  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(pixels.width  * scale);
  canvas.height = Math.round(pixels.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, pixels.x, pixels.y, pixels.width, pixels.height, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', JPEG_Q);
}

async function compressImage(src: string): Promise<string> {
  const image = await createImageEl(src);
  const scale = Math.min(1, MAX_PX / image.width, MAX_PX / image.height);
  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(image.width  * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', JPEG_Q);
}

// --- Constants ---
const FILTERS = [
  { id: 'none',                              label: 'Original' },
  { id: 'grayscale(100%)',                   label: 'B&W'     },
  { id: 'sepia(50%)',                        label: 'Vintage' },
  { id: 'brightness(1.2) contrast(1.1)',     label: 'Bright'  },
  { id: 'saturate(1.5)',                     label: 'Vivid'   },
  { id: 'hue-rotate(90deg)',                 label: 'Cool'    },
];

const DUMMY_POSTS: FeedPost[] = [
  {
    id: 'dummy-1',
    user_name: '백구맘',
    dog_name: '금순이',
    breed: '백구 · 8개월차',
    image_url: 'https://images.unsplash.com/photo-1591768575198-88dac53fbd0a?auto=format&fit=crop&q=80&w=600',
    content: '오늘은 금순이가 처음으로 마당 풀밭을 밟아본 날이에요. 처음엔 낯설어하더니 곧 신나게 뛰어다니는 모습이 너무 귀여웠습니다!',
    filter: 'none',
    likes: 124,
    comments: 12,
    tags: ['#첫나들이', '#진돗개성장', '#마당생활'],
    created_at: '2026-04-20T00:00:00Z',
  },
  {
    id: 'dummy-2',
    user_name: '진도지킴이',
    dog_name: '장군이',
    breed: '황구 · 2세',
    image_url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&q=80&w=600',
    content: '산길 산책 매너가 오늘도 백점! 늠름해진 장군이의 뒷모습을 보며 뿌듯함을 느낍니다.',
    filter: 'none',
    likes: 89,
    comments: 5,
    tags: ['#산책매너', '#황구', '#늠름'],
    created_at: '2026-04-19T00:00:00Z',
  },
];

// --- Main Component ---
export function Feed() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  // Create post flow
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState<'crop' | 'filter' | 'caption'>('crop');
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [caption, setCaption] = useState('');
  const [postDogName, setPostDogName] = useState('');
  const [postBreed, setPostBreed] = useState('');
  const [postTags, setPostTags] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [dbMissing, setDbMissing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch real posts
  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('feed_posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        setDbMissing(true);
      }
    } else if (data) {
      setPosts(data);
    }
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRawImage(reader.result as string);
      setCroppedImage(null);
      setCroppedAreaPixels(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setSelectedFilter('none');
      setCaption('');
      setPostDogName('');
      setPostBreed('');
      setPostTags('');
      setCreateStep('crop');
      setShowCreate(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleNext = async () => {
    if (createStep === 'crop') {
      setIsCropping(true);
      try {
        const out = croppedAreaPixels && croppedAreaPixels.width > 0
          ? await getCroppedImg(rawImage!, croppedAreaPixels)
          : await compressImage(rawImage!);
        setCroppedImage(out);
      } catch (e) {
        console.error('Compress error:', e);
        // last-resort: still compress via canvas even if crop failed
        try { setCroppedImage(await compressImage(rawImage!)); }
        catch { setCroppedImage(rawImage!); }
      }
      setIsCropping(false);
      setCreateStep('filter');
    } else if (createStep === 'filter') {
      setCreateStep('caption');
    }
  };

  const handlePost = async () => {
    if (!croppedImage || !postDogName.trim()) return;
    setIsUploading(true);

    const tags = postTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
      .map(t => (t.startsWith('#') ? t : `#${t}`));

    const { data, error } = await supabase
      .from('feed_posts')
      .insert([{
        user_name: '진도 보호자',
        dog_name: postDogName.trim(),
        breed: postBreed.trim() || '진돗개',
        image_url: croppedImage,
        content: caption.trim(),
        filter: selectedFilter,
        likes: 0,
        tags,
      }])
      .select()
      .single();

    if (!error && data) {
      setPosts(prev => [data, ...prev]);
      handleClose();
    } else {
      console.error('Feed upload error:', error);
      const detail = error?.message ?? '알 수 없는 오류';
      const hint = detail.includes('does not exist')
        ? '\n\n➡ Supabase SQL Editor에서 supabase_feed.sql 파일 내용을 실행해주세요.'
        : '';
      alert(`업로드 실패: ${detail}${hint}`);
    }
    setIsUploading(false);
  };

  const handleLike = async (post: FeedPost) => {
    if (post.id.startsWith('dummy')) {
      setLikedPosts(prev => {
        const next = new Set(prev);
        if (next.has(post.id)) next.delete(post.id); else next.add(post.id);
        return next;
      });
      return;
    }
    const isLiked = likedPosts.has(post.id);
    const newCount = isLiked ? post.likes - 1 : post.likes + 1;

    setLikedPosts(prev => {
      const next = new Set(prev);
      if (isLiked) next.delete(post.id); else next.add(post.id);
      return next;
    });
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: newCount } : p));

    await supabase.from('feed_posts').update({ likes: newCount }).eq('id', post.id);
  };

  const handleClose = () => {
    setShowCreate(false);
    setRawImage(null);
    setCroppedImage(null);
  };

  const displayPosts = [...posts, ...(posts.length === 0 ? DUMMY_POSTS : [])];
  const filterStyle = (f: string) => (f !== 'none' ? f : undefined);

  return (
    <div className="flex-1 overflow-y-auto bg-[#fcf9f4] pb-24 relative">
      <div className="max-w-md mx-auto py-6 space-y-6">

        {/* DB 미설치 안내 배너 */}
        {dbMissing && (
          <div className="mx-6 bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-1">
            <p className="text-sm font-bold text-amber-800">⚠️ Supabase 테이블 설정 필요</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              Supabase 대시보드 → SQL Editor 에서{' '}
              <span className="font-mono font-bold">supabase_feed.sql</span> 파일 내용을 실행해주세요.
              (jindo_logs 컬럼 추가 + feed_posts 테이블 생성)
            </p>
          </div>
        )}

        {/* Stories Row */}
        <section className="px-6 overflow-x-auto">
          <div className="flex gap-4 pb-2">
            {/* 내 스토리 = 업로드 트리거 */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-2 flex-shrink-0"
            >
              <div className="w-16 h-16 rounded-full bg-white border-2 border-dashed border-[#315926] flex items-center justify-center shadow-sm">
                <Plus size={26} className="text-[#315926]" />
              </div>
              <span className="text-[10px] font-bold text-[#715a4a]">내 스토리</span>
            </button>

            {[1, 2, 3].map(i => (
              <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#f9dac6] to-[#315926] p-0.5 shadow-sm">
                  <div className="w-full h-full rounded-full border-2 border-white overflow-hidden">
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`}
                      className="w-full h-full object-cover"
                      alt={`Story ${i}`}
                    />
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#715a4a]">진도시티_{i}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Feed List */}
        <section className="space-y-8">
          {loading ? (
            <div className="py-16 text-center text-[#715a4a] font-medium">불러오는 중...</div>
          ) : (
            displayPosts.map((post, idx) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white border-y border-[#ebe8e3] md:rounded-[32px] md:border shadow-sm overflow-hidden"
              >
                {/* Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#f0ede9] overflow-hidden border border-[#ebe8e3]">
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user_name}`}
                        alt="Avatar"
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#543013]">
                        {post.user_name} · <span className="text-[#315926]">{post.dog_name}</span>
                      </h4>
                      <p className="text-[10px] text-[#715a4a] font-medium">{post.breed}</p>
                    </div>
                  </div>
                  <button className="text-[#715a4a] p-2">
                    <MoreHorizontal size={20} />
                  </button>
                </div>

                {/* Image */}
                <div className="aspect-square relative overflow-hidden bg-[#f0ede9]">
                  <img
                    src={post.image_url}
                    className="w-full h-full object-cover"
                    style={{ filter: filterStyle(post.filter) }}
                    alt="Feed"
                  />
                  {idx === 0 && (
                    <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-white font-bold flex items-center gap-1">
                      <Sparkles size={12} /> AI Picked Visual
                    </div>
                  )}
                </div>

                {/* Actions + Content */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-6 text-[#543013]">
                    <button
                      onClick={() => handleLike(post)}
                      className="flex items-center gap-1.5 group"
                    >
                      <Heart
                        size={22}
                        className={cn(
                          'transition-colors',
                          likedPosts.has(post.id)
                            ? 'text-red-500 fill-red-500'
                            : 'group-hover:text-red-400'
                        )}
                      />
                      <span className="text-xs font-bold">{post.likes}</span>
                    </button>
                    <button className="flex items-center gap-1.5 group">
                      <MessageCircle size={22} className="group-hover:text-blue-400 transition-colors" />
                      <span className="text-xs font-bold">{post.comments ?? 0}</span>
                    </button>
                    <button className="ml-auto">
                      <Share2 size={22} className="text-[#715a4a]" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {post.content ? (
                      <p className="text-sm text-[#543013] leading-relaxed">
                        <span className="font-bold mr-2">{post.dog_name}</span>
                        {post.content}
                      </p>
                    ) : null}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {post.tags.map(tag => (
                          <span key={tag} className="text-[11px] font-bold text-[#315926]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.article>
            ))
          )}
        </section>
      </div>

      {/* Floating Upload FAB */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={() => fileInputRef.current?.click()}
        className="fixed bottom-24 right-5 w-14 h-14 bg-[#315926] text-white rounded-2xl shadow-xl flex items-center justify-center z-40"
      >
        <Plus size={28} />
      </motion.button>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />

      {/* ===== Create Post Modal ===== */}
      <AnimatePresence>
        {showCreate && rawImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black flex flex-col"
          >
            {/* Modal Header */}
            <header className="h-14 flex items-center justify-between px-4 border-b border-white/10 flex-shrink-0">
              <button onClick={handleClose} className="text-white p-2 -ml-2">
                <X size={22} />
              </button>
              <h2 className="text-white font-bold text-sm">
                {createStep === 'crop' ? '사진 자르기' : createStep === 'filter' ? '필터 선택' : '게시물 작성'}
              </h2>
              {createStep !== 'caption' ? (
                <button
                  onClick={handleNext}
                  disabled={isCropping}
                  className="text-[#86efac] font-bold text-sm disabled:opacity-40 pr-2"
                >
                  {isCropping ? '처리 중...' : '다음'}
                </button>
              ) : (
                <button
                  onClick={handlePost}
                  disabled={!postDogName.trim() || isUploading}
                  className="text-[#86efac] font-bold text-sm disabled:opacity-40 pr-2"
                >
                  {isUploading ? '업로드 중...' : '공유'}
                </button>
              )}
            </header>

            {/* Step: Crop */}
            {createStep === 'crop' && (
              <div className="flex-1 relative overflow-hidden">
                <Cropper
                  image={rawImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                />
                {/* Zoom slider overlay */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-3">
                  <span className="text-white/60 text-xs">축소</span>
                  <input
                    type="range" min={1} max={3} step={0.05}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-32 accent-[#86efac]"
                  />
                  <span className="text-white/60 text-xs">확대</span>
                </div>
              </div>
            )}

            {/* Step: Filter */}
            {createStep === 'filter' && croppedImage && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 flex items-center justify-center overflow-hidden">
                  <img
                    src={croppedImage}
                    className="max-h-full max-w-full object-contain"
                    style={{ filter: filterStyle(selectedFilter) }}
                    alt="Preview"
                  />
                </div>
                <div className="bg-[#111] border-t border-white/10 p-4 overflow-x-auto flex-shrink-0">
                  <div className="flex gap-3 pb-1 w-max">
                    {FILTERS.map(f => (
                      <button
                        key={f.id}
                        onClick={() => setSelectedFilter(f.id)}
                        className="flex flex-col items-center gap-1.5 flex-shrink-0"
                      >
                        <div className={cn(
                          'w-16 h-16 rounded-xl overflow-hidden border-2 transition-all',
                          selectedFilter === f.id ? 'border-[#86efac]' : 'border-transparent'
                        )}>
                          <img
                            src={croppedImage}
                            className="w-full h-full object-cover"
                            style={{ filter: filterStyle(f.id) }}
                            alt={f.label}
                          />
                        </div>
                        <span className={cn(
                          'text-[10px] font-bold',
                          selectedFilter === f.id ? 'text-[#86efac]' : 'text-white/50'
                        )}>
                          {f.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step: Caption */}
            {createStep === 'caption' && croppedImage && (
              <div className="flex-1 overflow-y-auto bg-[#111]">
                {/* Preview thumbnail */}
                <div className="w-full aspect-square max-h-64 overflow-hidden flex-shrink-0">
                  <img
                    src={croppedImage}
                    className="w-full h-full object-cover"
                    style={{ filter: filterStyle(selectedFilter) }}
                    alt="Preview"
                  />
                </div>

                <div className="p-5 space-y-3">
                  <input
                    value={postDogName}
                    onChange={(e) => setPostDogName(e.target.value)}
                    placeholder="강아지 이름 *"
                    className="w-full bg-white/10 text-white placeholder-white/40 p-4 rounded-2xl border border-white/20 focus:outline-none focus:border-[#86efac]/60 text-sm"
                  />
                  <input
                    value={postBreed}
                    onChange={(e) => setPostBreed(e.target.value)}
                    placeholder="품종 (예: 백구, 황구)"
                    className="w-full bg-white/10 text-white placeholder-white/40 p-4 rounded-2xl border border-white/20 focus:outline-none focus:border-[#86efac]/60 text-sm"
                  />
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="이야기를 남겨주세요..."
                    rows={3}
                    className="w-full bg-white/10 text-white placeholder-white/40 p-4 rounded-2xl border border-white/20 focus:outline-none focus:border-[#86efac]/60 text-sm resize-none"
                  />
                  <input
                    value={postTags}
                    onChange={(e) => setPostTags(e.target.value)}
                    placeholder="태그 (쉼표로 구분, 예: 진돗개, 산책)"
                    className="w-full bg-white/10 text-white placeholder-white/40 p-4 rounded-2xl border border-white/20 focus:outline-none focus:border-[#86efac]/60 text-sm"
                  />

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handlePost}
                    disabled={!postDogName.trim() || isUploading}
                    className="w-full py-4 bg-[#315926] text-white rounded-2xl font-bold text-base disabled:opacity-40 flex items-center justify-center gap-2 mt-2"
                  >
                    <Check size={20} />
                    {isUploading ? '업로드 중...' : '게시물 공유하기'}
                  </motion.button>

                  {/* Back button */}
                  <button
                    onClick={() => setCreateStep('filter')}
                    className="w-full py-3 text-white/50 text-sm flex items-center justify-center gap-1"
                  >
                    <ArrowLeft size={14} /> 필터 다시 선택
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
