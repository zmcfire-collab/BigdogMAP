import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Map as MapIcon, 
  LayoutGrid, 
  Users, 
  User, 
  Bell, 
  Search, 
  PawPrint, 
  Leaf, 
  Droplets, 
  Edit3, 
  X, 
  ShieldAlert, 
  Navigation, 
  Heart,
  Sparkles,
  Share2,
  ChevronRight,
  Plus,
  Settings,
  ShieldCheck
} from 'lucide-react';
import { cn } from './lib/utils';
import { Feed } from './Feed';
import { ShareHub } from './ShareHub';
import { AdminDashboard } from './AdminDashboard';
import { JindoLog } from './JindoLog';
import { AIGrowthCare } from './AIGrowthCare';
import { DogNameGenerator } from './DogNameGenerator';
import { supabase, signInWithGoogle, signInWithApple, signInWithFacebook } from './supabase';
import { APP_CONFIG } from './config';
import './App.css';

declare global {
  interface Window {
    naver: typeof naver;
  }
}

// --- Types ---
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

const MOCK_PLACES: Place[] = [
  {
    id: '1',
    name: '반포 한강 공원',
    category: 'Park',
    isJindoCertified: true,
    tags: ['대형견 가능', '넓은 잔디밭', '식수대 완비'],
    lat: 37.5100,
    lng: 126.9950
  }
];

function MainContent() {
  const [currentTab, setCurrentTab] = useState<'Map' | 'Feed' | 'Growth' | 'AICare' | 'Hub' | 'Profile' | 'Admin'>('Map');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminCreds, setAdminCreds] = useState({ id: '', pw: '' });
  const [userSession, setUserSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const [places, setPlaces] = useState<Place[]>(MOCK_PLACES);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(MOCK_PLACES[0]);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>(['진돗개 환영']);
  const [reports, setReports] = useState<Pin[]>([]);
  const [hubMode, setHubMode] = useState<'names' | 'share'>('names');

  // Map Refs
  const mapRef = useRef<HTMLDivElement>(null);
  const naverMapInstance = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);

  // --- Map Initialization ---
  useEffect(() => {
    if (currentTab === 'Map' && mapRef.current) {
      if (window.naver && window.naver.maps) {
        try {
          const mapOptions = {
            center: new window.naver.maps.LatLng(37.5100, 126.9950),
            zoom: 15,
            mapDataControl: false,
          };
          const map = new window.naver.maps.Map(mapRef.current, mapOptions);
          naverMapInstance.current = map;

          // Update Center when location is available
          if (userLocation) {
            map.setCenter(new window.naver.maps.LatLng(userLocation.lat, userLocation.lng));
          }
        } catch (err) {
          console.error("Naver Map Init Error:", err);
        }
      } else {
        console.warn("Naver Maps library not ready or auth failed.");
      }
    }
  }, [currentTab, userLocation]);

  // Sync Markers
  useEffect(() => {
    if (!naverMapInstance.current || !window.naver?.maps) return;

    try {
      // Clear existing markers
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];

      // Add Places
      places.forEach(place => {
        const marker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(place.lat, place.lng),
          map: naverMapInstance.current,
          title: place.name
        });
        window.naver.maps.Event.addListener(marker, 'click', () => setSelectedPlace(place));
        markersRef.current.push(marker);
      });

      // Add Reports
      reports.forEach(report => {
        const marker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(report.lat, report.lng),
          map: naverMapInstance.current,
          icon: {
              content: `<div style="background: ${report.type === 'GREEN' ? '#305C38' : '#D32F2F'}; border-radius: 50%; padding: 8px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-size: 16px;">
                          ${report.type === 'GREEN' ? '🐾' : '🚫'}
                        </div>`,
              anchor: new window.naver.maps.Point(15, 15)
          }
        });
        markersRef.current.push(marker);
      });
    } catch (err) {
      console.error("Marker Sync Error:", err);
    }
  }, [places, reports]);


  // --- Handlers ---
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminCreds.id === APP_CONFIG.ADMIN.ID && adminCreds.pw === APP_CONFIG.ADMIN.PW) {
      setIsAdminLoggedIn(true);
    } else {
      alert('아이디 또는 비밀번호가 틀렸습니다.');
    }
  };

  const handleAddReport = async (type: 'GREEN' | 'RED') => {
    if (userLocation) {
      const { error } = await supabase
        .from('pins')
        .insert([{ 
          type, 
          lat: userLocation.lat + (Math.random() - 0.5) * 0.002,
          lng: userLocation.lng + (Math.random() - 0.5) * 0.002,
          status: 'pending' 
        }]);

      if (error) {
        console.error('Error reporting pin:', error);
        alert('제보 중 오류가 발생했습니다.');
      } else {
        alert(`${type === 'GREEN' ? '진돗개/대형견 환영' : '진돗개 거부'} 장소가 제보되었습니다. 관리자 승인 후 지도에 표시됩니다.`);
      }
    } else {
      alert('사용자 위치 정보를 가져오는 중입니다.');
    }
  };


  const toggleFilter = (label: string) => {
    setActiveFilters(prev =>
      prev.includes(label) ? prev.filter(f => f !== label) : [...prev, label]
    );
  };

  // --- Supabase Integration ---
  useEffect(() => {
    const fetchPlaces = async () => {
      const { data, error } = await supabase.from('places').select('*');
      if (error) {
        console.error('Error fetching places:', error);
        return;
      }
      if (data) {
        const transformed: Place[] = data.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          isJindoCertified: p.jindo_certified,
          tags: Array.isArray(p.tags) ? p.tags : [],
          lat: p.lat,
          lng: p.lng
        }));
        if (transformed.length > 0) setPlaces(transformed);
      }
    };

    const fetchPins = async () => {
      const { data, error } = await supabase.from('pins').select('*').eq('status', 'approved');
      if (error) {
        console.error('Error fetching pins:', error);
        return;
      }
      if (data) {
        setReports(data);
      }
    };

    fetchPlaces();
    fetchPins();

    const pinSubscription = supabase
      .channel('public:pins')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pins' }, (payload) => {
        if (payload.new.status === 'approved') {
          setReports(prev => [...prev, payload.new as Pin]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(pinSubscription);
    };
  }, []);

  // GPS Location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(loc);
        if (naverMapInstance.current && window.naver) {
            naverMapInstance.current.setCenter(new window.naver.maps.LatLng(loc.lat, loc.lng));
        }
      }, (err) => {
        console.error("GPS Error:", err);
        let msg = "위치 정보를 가져올 수 없습니다.";
        if (err.code === 1) msg = "위치 정보 권한이 거부되었습니다. 설정에서 위치 권한을 허용해 주세요.";
        else if (err.code === 2) msg = "위치 정보를 사용할 수 없습니다 (네트워크/GPS 신호 약함).";
        else if (err.code === 3) msg = "위치 정보 획득 시간이 초과되었습니다.";
        console.warn(msg);
      });
    }
  }, []);

  const renderActiveTabContent = () => {
    if (currentTab === 'Admin') {
      if (!isAdminLoggedIn) {
        return (
          <div className="flex-1 flex items-center justify-center bg-[#F0F2F5] p-6">
            <form onSubmit={handleAdminLogin} className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm space-y-6">
              <div className="flex items-center gap-3">
                <ShieldAlert size={32} className="text-[#315926]" />
                <h2 className="text-2xl font-black text-[#543013]">Admin Login</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#715a4a] mb-1 uppercase tracking-widest">Admin ID</label>
                  <input
                    type="text"
                    value={adminCreds.id}
                    onChange={(e) => setAdminCreds({ ...adminCreds, id: e.target.value })}
                    className="w-full p-4 bg-[#fcf9f4] border border-[#ebe8e3] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#315926]/20"
                    placeholder="admin"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#715a4a] mb-1 uppercase tracking-widest">Password</label>
                  <input
                    type="password"
                    value={adminCreds.pw}
                    onChange={(e) => setAdminCreds({ ...adminCreds, pw: e.target.value })}
                    className="w-full p-4 bg-[#fcf9f4] border border-[#ebe8e3] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#315926]/20"
                    placeholder="1111"
                  />
                </div>
              </div>
              <button type="submit" className="w-full p-4 bg-[#543013] text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all">
                로그인
              </button>
              <button
                type="button"
                onClick={() => setCurrentTab('Map')}
                className="w-full p-2 text-[#715a4a] font-bold text-sm"
              >
                취소
              </button>
            </form>
          </div>
        );
      }
      return <AdminDashboard onLogout={() => setIsAdminLoggedIn(false)} />;
    }

    if (currentTab === 'Feed') {
      return <Feed />;
    }

    if (currentTab === 'Profile') {
      if (!userSession) {
        return (
          <div className="flex-1 overflow-y-auto bg-[#fcf9f4] px-6 py-8 pb-32">
            <div className="max-w-md mx-auto space-y-8">
              <header className="space-y-2">
                <h2 className="text-3xl font-serif text-[#543013]">환영합니다!</h2>
                <p className="text-sm text-[#715a4a]">로그인하여 나만의 산책 로그와 <br/>반려견 성장 카드를 관리해보세요.</p>
              </header>

              <div className="space-y-4">
                <button 
                  onClick={signInWithGoogle}
                  className="w-full h-[60px] bg-white border border-[#ebe8e3] rounded-[24px] flex items-center justify-center gap-4 shadow-sm hover:bg-gray-50 transition-all group"
                >
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5 opacity-70 group-hover:opacity-100" />
                  <span className="text-sm font-black text-[#543013]">Google로 시작하기</span>
                </button>

                <button 
                  onClick={signInWithApple}
                  className="w-full h-[60px] bg-[#000000] text-white rounded-[24px] flex items-center justify-center gap-4 shadow-lg hover:bg-gray-900 transition-all"
                >
                  <svg viewBox="0 0 384 512" width="20" height="20" fill="currentColor">
                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                  </svg>
                  <span className="text-sm font-black">Apple로 시작하기</span>
                </button>

                <button 
                  onClick={signInWithFacebook}
                  className="w-full h-[60px] bg-[#1877F2] text-white rounded-[24px] flex items-center justify-center gap-4 shadow-lg hover:bg-[#166fe5] transition-all"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span className="text-sm font-black text-white">Facebook으로 로그인</span>
                </button>
              </div>

              <div className="pt-8 border-t border-[#ebe8e3] text-center">
                <p className="text-[10px] text-[#715a4a] leading-relaxed opacity-60">
                   로그인 시 대견할지도의 <span className="underline">이용약관</span> 및 <span className="underline">개인정보 처리방침</span>에 동의하게 됩니다.
                </p>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="flex-1 overflow-y-auto bg-[#fcf9f4] px-6 py-8 pb-32">
          <div className="max-w-md mx-auto space-y-8">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-[32px] bg-white border border-[#ebe8e3] flex items-center justify-center text-[#715a4a] shadow-sm relative overflow-hidden">
                  {userSession.user?.user_metadata?.avatar_url ? (
                    <img src={userSession.user.user_metadata.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    <User size={40} />
                  )}
                  <div className="absolute bottom-0 right-0 w-6 h-6 bg-[#315926] flex items-center justify-center rounded-tl-xl text-white">
                     <Plus size={14} />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-serif text-[#543013]">{userSession.user?.user_metadata?.full_name || '보호자님'}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-black text-[#315926] bg-[#315926]/10 px-2 py-0.5 rounded-full uppercase tracking-widest">Premium Guardian</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => supabase.auth.signOut()}
                  className="p-3 bg-white border border-[#ebe8e3] rounded-[20px] text-[#ba1a1a] hover:bg-red-50 transition-all shadow-sm active:scale-90"
                  title="로그아웃"
                >
                  <X size={20} />
                </button>
                <button 
                  onClick={() => setCurrentTab('Admin')}
                  className="p-3 bg-white border border-[#ebe8e3] rounded-[20px] text-[#715a4a] hover:bg-[#f0ede9] transition-all shadow-sm active:scale-90"
                >
                  <ShieldCheck size={22} />
                </button>
              </div>
            </header>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '활동 핀', count: '12' },
                { label: '기록', count: '48' },
                { label: '리워드', count: '2.5k' }
              ].map((stat, i) => (
                <div key={i} className="bg-white p-5 rounded-[28px] border border-[#ebe8e3] text-center shadow-sm">
                  <p className="text-2xl font-serif text-[#543013]">{stat.count}</p>
                  <p className="text-[9px] font-black text-[#715a4a] uppercase tracking-widest mt-1 opacity-60">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black text-[#715a4a] uppercase tracking-widest px-1 opacity-60">Account Settings</h4>
              {[
                { icon: <Bell size={20} />, label: '알림 및 푸시 설정', right: 'On' },
                { icon: <Heart size={20} />, label: '찜한 장소 보관함' },
                { icon: <Users size={20} />, label: '커뮤니티 활동 관리' },
                { icon: <Settings size={20} />, label: '개인정보 보호 설정' }
              ].map((item, i) => (
                <button key={i} className="w-full bg-white p-5 rounded-[28px] border border-[#ebe8e3] shadow-sm flex items-center justify-between group hover:bg-[#315926]/5 transition-all text-[#543013]">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-[#fcf9f4] rounded-2xl text-[#715a4a] group-hover:text-[#315926] transition-colors">
                      {item.icon}
                    </div>
                    <span className="text-sm font-bold">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.right && <span className="text-[10px] font-black text-[#315926] uppercase">{item.right}</span>}
                    <ChevronRight size={18} className="opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              ))}
            </div>

            <button className="w-full p-5 bg-[#315926]/5 border border-dashed border-[#315926]/30 rounded-[28px] text-[#315926] font-bold text-sm flex items-center justify-center gap-2">
                <Plus size={18} /> 친구 초대하고 포인트 받기
            </button>
          </div>
        </div>
      );
    }

    if (currentTab === 'Map') {
      return (
        <main className="map-container relative">
          <div className="filter-container">
            {['진돗개 환영', '10kg+ 가능', '입마개 미필수', '실외 배변 명당'].map(label => (
              <button
                key={label}
                className={`chip ${activeFilters.includes(label) ? 'active' : ''}`}
                onClick={() => toggleFilter(label)}
              >
                {label === '진돗개 환영' && <Leaf size={14} style={{ marginRight: '4px' }} />}
                {label}
              </button>
            ))}
          </div>

          <div 
            id="map" 
            ref={mapRef} 
            className="w-full h-full min-h-[300px] bg-[#F0F2F5]"
          >
            {!window.naver?.maps && <div className="flex items-center justify-center h-full text-center p-8 text-[#715a4a] font-bold">지도를 불러오지 못했습니다. <br/>(네이버 API 인증 정보를 확인해주세요)</div>}
          </div>

          <div className="absolute right-4 bottom-[50px] flex flex-col gap-3 z-[1000]">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleAddReport('GREEN')}
              className="w-14 h-14 bg-[#315926] text-white rounded-2xl shadow-xl flex items-center justify-center border-2 border-white/20"
            >
              <Plus size={28} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleAddReport('RED')}
              className="w-14 h-14 bg-[#ba1a1a] text-white rounded-2xl shadow-xl flex items-center justify-center border-2 border-white/20"
            >
              <ShieldAlert size={28} />
            </motion.button>
          </div>

          <AnimatePresence>
            {selectedPlace && (
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="bottom-sheet"
              >
                <div className="handle" onClick={() => setSelectedPlace(null)} />
                <div className="p-2">
                  <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                      <h2 className="text-3xl font-serif text-[#543013]">{selectedPlace.name}</h2>
                      <div className="flex items-center gap-1.5 text-[#315926] font-black text-[10px] uppercase tracking-widest">
                        <Leaf size={14} fill="currentColor" /> Jindo-Friendly Certified
                      </div>
                    </div>
                    <button onClick={() => setSelectedPlace(null)} className="p-2 bg-[#f0ede9] rounded-full text-[#715a4a]">
                        <X size={20} />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-8">
                    {[
                        { icon: <PawPrint size={20} color="#8B5E3C" />, label: '대형견 가능' },
                        { icon: <Leaf size={20} color="#315926" />, label: '잔디밭' },
                        { icon: <Droplets size={20} color="#0277BD" />, label: '식수대' }
                    ].map((feat, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 p-4 bg-[#fcf9f4] rounded-[24px] border border-[#ebe8e3]">
                            {feat.icon}
                            <span className="text-[10px] font-bold text-[#715a4a]">{feat.label}</span>
                        </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-[#543013] uppercase tracking-widest opacity-60">최근 보호자 리뷰</h3>
                    <div className="bg-white p-5 rounded-[28px] border border-[#ebe8e3] shadow-sm space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#fcf9f4] flex items-center justify-center border border-[#ebe8e3] text-[#715a4a]">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#543013]">백구 (14kg)</p>
                          <p className="text-[10px] text-[#715a4a]">2시간 전 · <span className="text-[#315926]">Verified</span></p>
                        </div>
                      </div>
                      <p className="text-sm text-[#715a4a] leading-relaxed">
                        진도 아이들도 눈치 안 보고 산책하기 정말 좋아요! 잔디가 넓어서 실외 배배하기기도 편하고 사람도 적당해서 좋았습니다. 다시 꼭 방문할 예정이에요!
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-8 pb-4">
                     <button className="flex-1 p-5 bg-[#543013] text-white rounded-[24px] font-black shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                        <Navigation size={20} /> 길찾기
                     </button>
                     <button className="flex-1 p-5 bg-white border border-[#543013] text-[#543013] rounded-[24px] font-black flex items-center justify-center gap-2 active:scale-95 transition-all">
                        <Edit3 size={20} /> 리뷰 작성
                     </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      );
    }

    if (currentTab === 'Growth') {
      return <JindoLog />;
    }

    if (currentTab === 'AICare') {
      return <AIGrowthCare />;
    }

    if (currentTab === 'Hub') {
      return (
        <div className="flex-1 overflow-y-auto bg-[#fcf9f4] px-6 py-8 pb-32">
            <div className="max-w-md mx-auto space-y-8">
                <header className="space-y-1">
                    <h2 className="text-3xl font-serif text-[#543013]">{hubMode === 'names' ? 'AI 이름 천재' : '공유 허브'}</h2>
                    <p className="text-xs text-[#715a4a] font-bold uppercase tracking-widest">{hubMode === 'names' ? 'Identity recommendation' : 'Multi-channel distribution'}</p>
                </header>

                <div className="flex bg-[#f0ede9] p-1.5 rounded-[24px] border border-[#ebe8e3]">
                    <button 
                        onClick={() => setHubMode('names')}
                        className={cn("flex-1 py-3.5 px-4 rounded-[20px] text-[11px] font-black uppercase tracking-wider transition-all", hubMode === 'names' ? "bg-white shadow-md text-[#543013]" : "text-[#715a4a] opacity-60")}
                    >
                        <Sparkles size={16} className="inline mr-2" /> Name Genius
                    </button>
                    <button 
                        onClick={() => setHubMode('share')}
                        className={cn("flex-1 py-3.5 px-4 rounded-[20px] text-[11px] font-black uppercase tracking-wider transition-all", hubMode === 'share' ? "bg-white shadow-md text-[#543013]" : "text-[#715a4a] opacity-60")}
                    >
                        <Share2 size={16} className="inline mr-2" /> Share Hub
                    </button>
                </div>

                <motion.div
                    key={hubMode}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                >
                    {hubMode === 'names' ? <DogNameGenerator /> : <ShareHub />}
                </motion.div>
            </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center text-[#715a4a] font-bold">
        준비 중인 페이지입니다. ({currentTab})
      </div>
    );
  };

  return (
    <>
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PawPrint size={24} color="#8B5E3C" fill="#8B5E3C" />
          <h1 style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-1px' }}>대견할지도</h1>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Search size={22} color="#666" />
          <Bell size={22} color="#666" />
        </div>
      </header>

      {renderActiveTabContent()}

      <nav className="bottom-nav">
        <div className={`nav-item ${currentTab === 'Feed' ? 'active' : ''}`} onClick={() => setCurrentTab('Feed')}>
          <LayoutGrid size={24} />
          <span>Feed</span>
        </div>
        <div className={`nav-item ${currentTab === 'Growth' ? 'active' : ''}`} onClick={() => setCurrentTab('Growth')}>
          <Users size={24} />
          <span>Log</span>
        </div>
        <div className={`nav-item ${currentTab === 'AICare' ? 'active' : ''}`} onClick={() => setCurrentTab('AICare')}>
          <Heart size={24} />
          <span>Care</span>
        </div>
        <div className={`nav-item ${currentTab === 'Map' ? 'active' : ''}`} onClick={() => setCurrentTab('Map')}>
          <MapIcon size={24} />
          <span>Map</span>
        </div>
        <div className={`nav-item ${currentTab === 'Hub' ? 'active' : ''}`} onClick={() => setCurrentTab('Hub')}>
          <Sparkles size={24} />
          <span>Hub</span>
        </div>
        <div className={`nav-item ${currentTab === 'Profile' ? 'active' : ''}`} onClick={() => setCurrentTab('Profile')}>
          <User size={24} />
          <span>Profile</span>
        </div>
      </nav>
    </>
  );
}

function App() {
  return <MainContent />;
}

export default App;

