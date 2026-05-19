import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Map as MapIcon, LayoutGrid, Users, User, Bell, Search,
  PawPrint, Leaf, Droplets, Edit3, X, ShieldAlert, Navigation,
  Heart, Sparkles, Plus, Settings, ShieldCheck, Star, ChevronRight,
} from 'lucide-react';
import { ReviewModal } from './ReviewModal';
import { cn } from './lib/utils';
import { Feed } from './Feed';
import { ShareHub } from './ShareHub';
import { AdminDashboard } from './AdminDashboard';
import { JindoLog } from './JindoLog';
import { AIGrowthCare } from './AIGrowthCare';
import { DogNameGenerator } from './DogNameGenerator';
import { supabase, signInWithGoogle } from './supabase';
import { APP_CONFIG } from './config';
import './index.css';

/* ── 타입 ─────────────────────────────────────── */
declare global { interface Window { naver: typeof naver } }

interface Place {
  id: string;
  name: string;
  category: string;
  isJindoCertified: boolean;
  tags: string[];
  lat: number;
  lng: number;
}

interface Pin {
  id: string;
  type: 'GREEN' | 'RED';
  lat: number;
  lng: number;
  status?: 'pending' | 'approved' | 'rejected';
}

type Tab = 'Map' | 'Feed' | 'Growth' | 'AICare' | 'Hub' | 'Profile' | 'Admin';

/* ── 상수 ─────────────────────────────────────── */
const MOCK_PLACES: Place[] = [
  {
    id: 'mock-1',
    name: '반포 한강 공원',
    category: 'Park',
    isJindoCertified: true,
    tags: ['대형견 가능', '넓은 잔디밭', '식수대 완비'],
    lat: 37.5100,
    lng: 126.9950,
  },
];

const FILTERS = ['진돗개 환영', '10kg+ 가능', '입마개 미필수', '실외 배변 명당'];

/* ── 메인 컴포넌트 ────────────────────────────── */
export default function App() {
  const [currentTab, setCurrentTab] = useState<Tab>('Map');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminCreds, setAdminCreds] = useState({ id: '', pw: '' });
  const [userSession, setUserSession] = useState<any>(null);

  const [places, setPlaces] = useState<Place[]>(MOCK_PLACES);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>(['진돗개 환영']);
  const [reports, setReports] = useState<Pin[]>([]);
  const [hubMode, setHubMode] = useState<'names' | 'share'>('names');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [placeReviews, setPlaceReviews] = useState<any[]>([]);
  const [profileStats, setProfileStats] = useState({ pins: 0, logs: 0, rewards: 0 });

  /* 지도 refs */
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const naverMapRef = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);

  /* ── Auth ─────────────────────────────────── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUserSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUserSession(session));
    return () => subscription.unsubscribe();
  }, []);

  /* ── GPS ──────────────────────────────────── */
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const loc = { lat: coords.latitude, lng: coords.longitude };
        setUserLocation(loc);
        naverMapRef.current?.setCenter(new window.naver.maps.LatLng(loc.lat, loc.lng));
      },
      () => { /* 권한 거부 시 기본값(서울) 유지 */ }
    );
  }, []);

  /* ── 네이버 지도 초기화 (재시도 로직 포함) ── */
  useEffect(() => {
    if (currentTab !== 'Map') return;
    if (naverMapRef.current) return;

    const initMap = () => {
      if (!mapContainerRef.current) return false;
      if (!window.naver?.maps) return false;
      try {
        const center = userLocation
          ? new window.naver.maps.LatLng(userLocation.lat, userLocation.lng)
          : new window.naver.maps.LatLng(37.5100, 126.9950);
        naverMapRef.current = new window.naver.maps.Map(mapContainerRef.current, {
          center,
          zoom: 15,
          mapDataControl: false,
          scaleControl: false,
        });
        return true;
      } catch (err) {
        console.error('[지도 초기화 오류]', err);
        return false;
      }
    };

    if (!initMap()) {
      let attempts = 0;
      const timer = setInterval(() => {
        attempts++;
        if (initMap() || attempts >= 30) clearInterval(timer);
      }, 100);
      return () => clearInterval(timer);
    }
  }, [currentTab, userLocation]);

  /* ── 마커 동기화 ──────────────────────────── */
  const filteredPlaces = useMemo(() => {
    if (activeFilters.length === 0) return places;
    return places.filter(p =>
      activeFilters.some(f => {
        if (f === '진돗개 환영') return p.isJindoCertified;
        return p.tags.some(t => t.includes(f) || f.includes(t));
      })
    );
  }, [places, activeFilters]);

  useEffect(() => {
    const map = naverMapRef.current;
    if (!map || !window.naver?.maps) return;

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    filteredPlaces.forEach(place => {
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(place.lat, place.lng),
        map,
        title: place.name,
      });
      window.naver.maps.Event.addListener(marker, 'click', () => setSelectedPlace(place));
      markersRef.current.push(marker);
    });

    reports.forEach(report => {
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(report.lat, report.lng),
        map,
        icon: {
          content: `<div style="background:${report.type === 'GREEN' ? '#305C38' : '#D32F2F'};border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);font-size:14px;">${report.type === 'GREEN' ? '🐾' : '🚫'}</div>`,
          anchor: new window.naver.maps.Point(16, 16),
        },
      });
      markersRef.current.push(marker);
    });
  }, [filteredPlaces, reports]);

  /* ── Supabase 데이터 로드 ─────────────────── */
  useEffect(() => {
    (async () => {
      const { data: placesData } = await supabase.from('places').select('*');
      if (placesData?.length) {
        setPlaces(placesData.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          isJindoCertified: p.jindo_certified,
          tags: Array.isArray(p.tags) ? p.tags : [],
          lat: p.lat,
          lng: p.lng,
        })));
      }

      const { data: pinsData } = await supabase.from('pins').select('*').eq('status', 'approved');
      if (pinsData) setReports(pinsData);
    })();

    // 실시간 핀 구독
    const ch = supabase
      .channel('public:pins')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pins' }, payload => {
        if (payload.new.status === 'approved') setReports(prev => [...prev, payload.new as Pin]);
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  /* ── 선택된 장소 리뷰 ─────────────────────── */
  useEffect(() => {
    if (!selectedPlace) { setPlaceReviews([]); return; }
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(selectedPlace.id);
    if (!isUUID) { setPlaceReviews([]); return; }
    supabase.from('reviews').select('*')
      .eq('place_id', selectedPlace.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setPlaceReviews(data ?? []));
  }, [selectedPlace]);

  /* ── 프로필 통계 ──────────────────────────── */
  useEffect(() => {
    (async () => {
      const [pinsRes, logsRes, postsRes] = await Promise.all([
        supabase.from('pins').select('id', { count: 'exact', head: true }),
        supabase.from('jindo_logs').select('id', { count: 'exact', head: true }),
        supabase.from('feed_posts').select('likes'),
      ]);
      const totalLikes = (postsRes.data ?? []).reduce((s: number, p: { likes: number }) => s + (p.likes ?? 0), 0);
      setProfileStats({ pins: pinsRes.count ?? 0, logs: logsRes.count ?? 0, rewards: totalLikes });
    })();
  }, []);

  /* ── 핸들러 ───────────────────────────────── */
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminCreds.id === APP_CONFIG.ADMIN.ID && adminCreds.pw === APP_CONFIG.ADMIN.PW) {
      setIsAdminLoggedIn(true);
    } else {
      alert('아이디 또는 비밀번호가 틀렸습니다.');
    }
  };

  const handleAddReport = useCallback(async (type: 'GREEN' | 'RED') => {
    if (!userLocation) { alert('위치 정보를 가져오는 중입니다.'); return; }
    const { error } = await supabase.from('pins').insert([{
      type,
      lat: userLocation.lat + (Math.random() - 0.5) * 0.002,
      lng: userLocation.lng + (Math.random() - 0.5) * 0.002,
      status: 'pending',
    }]);
    if (error) { alert('제보 중 오류가 발생했습니다.'); return; }
    alert(`${type === 'GREEN' ? '🐾 환영 장소' : '🚫 거부 장소'} 제보가 접수되었습니다.\n관리자 승인 후 지도에 표시됩니다.`);
  }, [userLocation]);

  const toggleFilter = (label: string) =>
    setActiveFilters(prev => prev.includes(label) ? prev.filter(f => f !== label) : [...prev, label]);

  const handleRefreshReviews = useCallback(() => {
    if (!selectedPlace) return;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(selectedPlace.id);
    if (!isUUID) return;
    supabase.from('reviews').select('*')
      .eq('place_id', selectedPlace.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setPlaceReviews(data ?? []));
  }, [selectedPlace]);

  /* ── 탭 렌더링 ────────────────────────────── */
  const renderTab = () => {
    /* Admin */
    if (currentTab === 'Admin') {
      if (!isAdminLoggedIn) {
        return (
          <div className="page-content flex items-center justify-center p-6">
            <form onSubmit={handleAdminLogin} className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm space-y-6">
              <div className="flex items-center gap-3">
                <ShieldAlert size={28} className="text-[#315926]" />
                <h2 className="text-2xl font-black text-[#543013]">관리자 로그인</h2>
              </div>
              {[
                { label: 'Admin ID', key: 'id', type: 'text', placeholder: 'ID' },
                { label: 'Password', key: 'pw', type: 'password', placeholder: '••••••••' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-bold text-[#715a4a] mb-2 uppercase tracking-widest">{f.label}</label>
                  <input
                    type={f.type}
                    value={adminCreds[f.key as 'id' | 'pw']}
                    onChange={e => setAdminCreds(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full p-4 bg-[#fcf9f4] border border-[#ebe8e3] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#315926]/20"
                  />
                </div>
              ))}
              <button type="submit" className="w-full p-4 bg-[#543013] text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all">
                로그인
              </button>
              <button type="button" onClick={() => setCurrentTab('Map')} className="w-full p-2 text-[#715a4a] font-bold text-sm">
                취소
              </button>
            </form>
          </div>
        );
      }
      return <AdminDashboard onLogout={() => setIsAdminLoggedIn(false)} />;
    }

    /* Feed */
    if (currentTab === 'Feed') return <Feed />;

    /* Profile */
    if (currentTab === 'Profile') {
      if (!userSession) {
        return (
          <div className="page-content px-6 py-8">
            <div className="max-w-md mx-auto space-y-8">
              <header className="space-y-2">
                <h2 className="text-3xl font-sans text-[#543013]">환영합니다!</h2>
                <p className="text-sm text-[#715a4a]">로그인하여 나만의 산책 로그와<br />반려견 성장 카드를 관리해보세요.</p>
              </header>
              <div className="space-y-3">
                <button onClick={signInWithGoogle} className="w-full h-[56px] bg-white border border-[#ebe8e3] rounded-3xl flex items-center justify-center gap-4 shadow-sm active:scale-95 transition-all">
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="" />
                  <span className="text-sm font-black text-[#543013]">Google로 시작하기</span>
                </button>
              </div>
              <p className="text-center text-[10px] text-[#715a4a] opacity-60 pt-4 border-t border-[#ebe8e3]">
                로그인 시 대견할지도의 <span className="underline">이용약관</span> 및 <span className="underline">개인정보 처리방침</span>에 동의합니다.
              </p>
            </div>
          </div>
        );
      }
      return (
        <div className="page-content px-6 py-8">
          <div className="max-w-md mx-auto space-y-8">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-[32px] bg-white border border-[#ebe8e3] overflow-hidden flex items-center justify-center text-[#715a4a]">
                  {userSession.user?.user_metadata?.avatar_url
                    ? <img src={userSession.user.user_metadata.avatar_url} className="w-full h-full object-cover" alt="" />
                    : <User size={40} />}
                </div>
                <div>
                  <h3 className="text-2xl font-sans text-[#543013]">{userSession.user?.user_metadata?.full_name || '보호자님'}</h3>
                  <span className="text-[10px] font-black text-[#315926] bg-[#315926]/10 px-2 py-0.5 rounded-full uppercase tracking-widest">Premium Guardian</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => supabase.auth.signOut()} className="p-3 bg-white border border-[#ebe8e3] rounded-2xl text-red-500 active:scale-90 transition-all" title="로그아웃">
                  <X size={18} />
                </button>
                <button onClick={() => setCurrentTab('Admin')} className="p-3 bg-white border border-[#ebe8e3] rounded-2xl text-[#715a4a] active:scale-90 transition-all">
                  <ShieldCheck size={20} />
                </button>
              </div>
            </header>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '활동 핀', count: profileStats.pins },
                { label: '기록', count: profileStats.logs },
                { label: '리워드', count: profileStats.rewards >= 1000 ? `${(profileStats.rewards / 1000).toFixed(1)}k` : profileStats.rewards },
              ].map((s, i) => (
                <div key={i} className="bg-white p-5 rounded-[28px] border border-[#ebe8e3] text-center">
                  <p className="text-2xl font-sans text-[#543013]">{s.count}</p>
                  <p className="text-[9px] font-black text-[#715a4a] uppercase tracking-widest mt-1 opacity-60">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {[
                { icon: <Bell size={20} />, label: '알림 및 푸시 설정', right: 'On' },
                { icon: <Heart size={20} />, label: '찜한 장소 보관함' },
                { icon: <Users size={20} />, label: '커뮤니티 활동 관리' },
                { icon: <Settings size={20} />, label: '개인정보 보호 설정' },
              ].map((item, i) => (
                <button key={i} className="w-full bg-white p-5 rounded-[28px] border border-[#ebe8e3] flex items-center justify-between group hover:bg-[#315926]/5 transition-all text-[#543013]">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-[#fcf9f4] rounded-2xl text-[#715a4a] group-hover:text-[#315926] transition-colors">{item.icon}</div>
                    <span className="text-sm font-bold">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.right && <span className="text-[10px] font-black text-[#315926] uppercase">{item.right}</span>}
                    <ChevronRight size={18} className="opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    /* Map */
    if (currentTab === 'Map') {
      return (
        <div className="map-container">
          {/* 필터 바 */}
          <div className="filter-bar">
            {FILTERS.map(label => (
              <button
                key={label}
                className={`chip ${activeFilters.includes(label) ? 'active' : ''}`}
                onClick={() => toggleFilter(label)}
              >
                {label === '진돗개 환영' && <Leaf size={12} />}
                {label}
              </button>
            ))}
          </div>

          {/* 지도 */}
          <div id="naver-map" ref={mapContainerRef}>
            {!window.naver?.maps && (
              <div className="map-placeholder">
                지도를 불러오지 못했습니다.<br />
                네이버 지도 API 키(.env → VITE_NAVER_CLIENT_ID)를<br />확인해주세요.
              </div>
            )}
          </div>

          {/* 핀 제보 버튼 */}
          <div className="absolute right-4 bottom-4 flex flex-col gap-3 z-50">
            <motion.button whileTap={{ scale: 0.88 }} onClick={() => handleAddReport('GREEN')}
              className="w-14 h-14 bg-[#305C38] text-white rounded-2xl shadow-xl flex items-center justify-center border-2 border-white/20">
              <Plus size={26} />
            </motion.button>
            <motion.button whileTap={{ scale: 0.88 }} onClick={() => handleAddReport('RED')}
              className="w-14 h-14 bg-[#D32F2F] text-white rounded-2xl shadow-xl flex items-center justify-center border-2 border-white/20">
              <ShieldAlert size={22} />
            </motion.button>
          </div>

          {/* 바텀시트 */}
          <AnimatePresence>
            {selectedPlace && (
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="bottom-sheet"
              >
                <div className="handle" onClick={() => setSelectedPlace(null)} />
                <div className="pb-8">
                  <div className="flex justify-between items-start mb-5">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-sans text-[#543013]">{selectedPlace.name}</h2>
                      <div className="flex items-center gap-1.5 text-[#315926] font-black text-[10px] uppercase tracking-widest">
                        <Leaf size={12} fill="currentColor" /> Jindo-Friendly
                      </div>
                    </div>
                    <button onClick={() => setSelectedPlace(null)} className="p-2 bg-[#f0ede9] rounded-full text-[#715a4a]">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      { icon: <PawPrint size={18} className="text-[#8B5E3C]" />, label: '대형견 가능' },
                      { icon: <Leaf size={18} className="text-[#315926]" />, label: '잔디밭' },
                      { icon: <Droplets size={18} className="text-blue-500" />, label: '식수대' },
                    ].map((f, i) => (
                      <div key={i} className="flex flex-col items-center gap-1.5 p-3 bg-[#fcf9f4] rounded-2xl border border-[#ebe8e3]">
                        {f.icon}
                        <span className="text-[10px] font-bold text-[#715a4a]">{f.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 mb-6">
                    <h3 className="text-xs font-black text-[#543013] uppercase tracking-widest opacity-60">
                      최근 리뷰{placeReviews.length > 0 ? ` (${placeReviews.length})` : ''}
                    </h3>
                    {placeReviews.length === 0 ? (
                      <div className="bg-[#f0ede9] p-4 rounded-2xl text-center text-sm text-[#715a4a]">첫 번째 리뷰를 남겨보세요!</div>
                    ) : (
                      placeReviews.slice(0, 2).map((review: any) => (
                        <div key={review.id} className="bg-[#f0ede9] p-4 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold text-[#543013]">
                                {review.user_nickname}
                                {review.user_pet_breed ? ` (${review.user_pet_breed}${review.user_pet_weight ? ` · ${review.user_pet_weight}kg` : ''})` : ''}
                              </p>
                              <p className="text-[10px] text-[#715a4a]">{new Date(review.created_at).toLocaleDateString('ko-KR')}</p>
                            </div>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star key={s} size={10} className={s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-[#715a4a] leading-relaxed">{review.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => window.open(`https://map.naver.com/index.nhn?elng=${selectedPlace.lng}&elat=${selectedPlace.lat}&etext=${encodeURIComponent(selectedPlace.name)}&menu=route`, '_blank')}
                      className="flex-1 p-4 bg-[#543013] text-white rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all">
                      <Navigation size={18} /> 길찾기
                    </button>
                    <button
                      onClick={() => setShowReviewModal(true)}
                      className="flex-1 p-4 bg-white border border-[#543013] text-[#543013] rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all">
                      <Edit3 size={18} /> 리뷰 작성
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    /* Growth Log */
    if (currentTab === 'Growth') return <JindoLog />;

    /* AI Care */
    if (currentTab === 'AICare') return <AIGrowthCare />;

    /* Hub */
    if (currentTab === 'Hub') {
      return (
        <div className="page-content px-6 py-8">
          <div className="max-w-md mx-auto space-y-6">
            <header>
              <h2 className="text-3xl font-sans text-[#543013]">{hubMode === 'names' ? 'AI 이름 천재' : '공유 허브'}</h2>
              <p className="text-xs text-[#715a4a] font-bold uppercase tracking-widest mt-1">
                {hubMode === 'names' ? 'Name recommendation' : 'Multi-channel share'}
              </p>
            </header>
            <div className="flex bg-[#f0ede9] p-1.5 rounded-3xl border border-[#ebe8e3]">
              {(['names', 'share'] as const).map(mode => (
                <button key={mode} onClick={() => setHubMode(mode)}
                  className={cn('flex-1 py-3 px-4 rounded-[20px] text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5',
                    hubMode === mode ? 'bg-white shadow-md text-[#543013]' : 'text-[#715a4a] opacity-60')}>
                  {mode === 'names' ? <><Sparkles size={14} /> Name Genius</> : <><Star size={14} /> Share Hub</>}
                </button>
              ))}
            </div>
            <motion.div key={hubMode} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', damping: 25 }}>
              {hubMode === 'names' ? <DogNameGenerator /> : <ShareHub />}
            </motion.div>
          </div>
        </div>
      );
    }

    return null;
  };

  /* ── 탭 목록 ──────────────────────────────── */
  const NAV_ITEMS: { tab: Tab; icon: React.ReactNode; label: string }[] = [
    { tab: 'Feed', icon: <LayoutGrid size={22} />, label: 'Feed' },
    { tab: 'Growth', icon: <Users size={22} />, label: 'Log' },
    { tab: 'AICare', icon: <Heart size={22} />, label: 'Care' },
    { tab: 'Map', icon: <MapIcon size={22} />, label: 'Map' },
    { tab: 'Hub', icon: <Sparkles size={22} />, label: 'Hub' },
    { tab: 'Profile', icon: <User size={22} />, label: 'My' },
  ];

  return (
    <>
      <header className="app-header">
        <div className="flex items-center gap-2">
          <PawPrint size={22} color="#8B5E3C" fill="#8B5E3C" />
          <h1 style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.5px', color: '#543013' }}>대견할지도</h1>
        </div>
        <div className="flex gap-4">
          <button className="p-1" aria-label="검색"><Search size={20} color="#999" /></button>
          <button className="p-1" aria-label="알림"><Bell size={20} color="#999" /></button>
        </div>
      </header>

      {renderTab()}

      <AnimatePresence>
        {showReviewModal && selectedPlace && (
          <ReviewModal
            place={selectedPlace}
            onClose={() => { setShowReviewModal(false); handleRefreshReviews(); }}
          />
        )}
      </AnimatePresence>

      <nav className="bottom-nav">
        {NAV_ITEMS.map(({ tab, icon, label }) => (
          <button
            key={tab}
            className={`nav-item ${currentTab === tab ? 'active' : ''}`}
            onClick={() => setCurrentTab(tab)}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
