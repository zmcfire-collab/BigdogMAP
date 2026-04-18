import { useState, useEffect, useRef } from 'react';
import { Map as MapIcon, LayoutGrid, Users, User, Bell, Search, PawPrint, Leaf, Droplets, Edit3, X, ShieldAlert, Navigation } from 'lucide-react';
import { AdminDashboard } from './AdminDashboard';
import { JindoLog } from './JindoLog';
import { supabase } from './supabase';
import './App.css';

declare global {
  interface Window {
    naver: any;
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
  const [currentTab, setCurrentTab] = useState<'Map' | 'Feed' | 'Growth' | 'Hub' | 'Profile' | 'Admin'>('Map');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminCreds, setAdminCreds] = useState({ id: '', pw: '' });

  const [places, setPlaces] = useState<Place[]>(MOCK_PLACES);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(MOCK_PLACES[0]);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>(['진돗개 환영']);
  const [reports, setReports] = useState<Pin[]>([]);

  // Map Refs
  const mapRef = useRef<HTMLDivElement>(null);
  const naverMapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

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
  }, [currentTab]);

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
  }, [places, reports, naverMapInstance.current]);


  // --- Handlers ---
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminCreds.id === 'admin' && adminCreds.pw === '1111') {
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
        const transformed: Place[] = data.map((p: any) => ({
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
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F2F5', padding: '24px' }}>
            <form onSubmit={handleAdminLogin} style={{ background: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <ShieldAlert size={32} color="#1A73E8" />
                <h2 style={{ fontSize: '22px', fontWeight: 900 }}>Back-Office Login</h2>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Admin ID</label>
                <input
                  type="text"
                  value={adminCreds.id}
                  onChange={(e) => setAdminCreds({ ...adminCreds, id: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '1px solid #DDD', borderRadius: '8px' }}
                  placeholder="admin"
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Password</label>
                <input
                  type="password"
                  value={adminCreds.pw}
                  onChange={(e) => setAdminCreds({ ...adminCreds, pw: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '1px solid #DDD', borderRadius: '8px' }}
                  placeholder="1111"
                />
              </div>
              <button type="submit" style={{ width: '100%', padding: '16px', background: '#1A73E8', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}>
                로그인
              </button>
              <button
                type="button"
                onClick={() => setCurrentTab('Map')}
                style={{ width: '100%', marginTop: '12px', padding: '12px', background: 'transparent', color: '#666', border: 'none', fontWeight: 700, cursor: 'pointer' }}
              >
                취소
              </button>
            </form>
          </div>
        );
      }
      return <AdminDashboard onLogout={() => setIsAdminLoggedIn(false)} />;
    }

    if (currentTab === 'Profile') {
      return (
        <div style={{ padding: '24px', flex: 1, backgroundColor: '#FFF', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '20px' }}>나의 반려견 일지</h2>
            <button
              onClick={() => setCurrentTab('Admin')}
              style={{ padding: '10px', background: '#F0F2F5', border: 'none', borderRadius: '12px', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ShieldAlert size={18} /> <span style={{ fontSize: '12px', fontWeight: 800 }}>Admin</span>
            </button>
          </div>

          <div style={{ padding: '20px', background: '#F8F8F8', borderRadius: '16px', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', background: '#DDD', borderRadius: '50%', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={40} color="#999" />
            </div>
            <h3 style={{ fontWeight: 800 }}>백구아빠</h3>
            <p style={{ fontSize: '14px', color: '#666' }}>newturns302@naver.com</p>
          </div>

          <div style={{ marginTop: '30px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>방문 인증 사진 올리기</h3>
            <div style={{ border: '2px dashed #DDD', padding: '40px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: '#999', textAlign: 'center' }}>
              <Edit3 size={32} />
              <p>장소를 방문했다면 사진으로 인증해 주세요!</p>
              <button style={{ background: '#8B5E3C', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '8px', fontWeight: 700 }}>
                사진 선택하기
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (currentTab === 'Map') {
      return (
        <main className="map-container">
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
            style={{ width: '100%', height: '100%', minHeight: '300px', backgroundColor: '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '14px' }} 
          >
            {!window.naver?.maps && <div>지도를 불러오지 못했습니다. <br/>(네이버 API 인증 정보를 확인해주세요)</div>}
          </div>

          {/* Floating Action Buttons for Reporting */}
          <div style={{ position: 'absolute', right: '16px', bottom: selectedPlace ? '410px' : '40px', display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 1000, transition: 'bottom 0.3s' }}>
            <button
              onClick={() => handleAddReport('GREEN')}
              title="Green Pin"
              style={{ background: '#305C38', color: 'white', width: '56px', height: '56px', borderRadius: '50%', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <PawPrint size={24} />
            </button>
            <button
              onClick={() => handleAddReport('RED')}
              title="Red Pin"
              style={{ background: '#D32F2F', color: 'white', width: '56px', height: '56px', borderRadius: '50%', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <div style={{ fontWeight: 800, fontSize: '20px' }}>!</div>
            </button>
          </div>

          {selectedPlace && (
            <div className="bottom-sheet" style={{ transform: 'translateY(0)' }}>
              <div className="handle" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ textAlign: 'left' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 900 }}>{selectedPlace.name}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#1A73E8', fontSize: '13px', fontWeight: 700, marginTop: '4px' }}>
                    <Leaf size={16} fill="currentColor" />
                    <span>진돗개 친화적 인증 장소</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPlace(null)}
                  style={{ background: '#EEE', border: 'none', padding: '8px', borderRadius: '50%', color: '#666', display: 'flex' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                <div className="chip" style={{ flex: 1, padding: '12px', justifyContent: 'center', flexDirection: 'column', height: 'auto', background: '#F8F8F8' }}>
                  <PawPrint size={20} color="#8B5E3C" />
                  <span style={{ fontSize: '11px', marginTop: '4px' }}>대형견 가능</span>
                </div>
                <div className="chip" style={{ flex: 1, padding: '12px', justifyContent: 'center', flexDirection: 'column', height: 'auto', background: '#F8F8F8' }}>
                  <Leaf size={20} color="#4C6B4F" />
                  <span style={{ fontSize: '11px', marginTop: '4px' }}>넓은 잔디밭</span>
                </div>
                <div className="chip" style={{ flex: 1, padding: '12px', justifyContent: 'center', flexDirection: 'column', height: 'auto', background: '#F8F8F8' }}>
                  <Droplets size={20} color="#0277BD" />
                  <span style={{ fontSize: '11px', marginTop: '4px' }}>식수대 완비</span>
                </div>
              </div>

              <div style={{ marginTop: '24px', textAlign: 'left' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>최근 진도 보호자 리뷰</h3>
                <div className="review-card">
                  <div className="review-user">
                    <div className="user-avatar" style={{ background: '#CCC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={20} color="#FFF" />
                    </div>
                    <div className="user-info">
                      <div className="name">백구 (14kg)</div>
                      <div className="meta">2시간 전</div>
                    </div>
                  </div>
                  <p style={{ fontSize: '13px', color: '#444' }}>
                    진도 아이들도 눈치 안 보고 산책하기 정말 좋아요! 잔디가 넓어서 실외 배배하기기도 편하고 사람도 적당해서 좋았습니다.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button style={{ flex: 1, padding: '16px', background: '#446889', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Navigation size={18} /> 길찾기
                </button>
                <button style={{ flex: 1, padding: '16px', background: '#8B5E3C', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Edit3 size={18} /> 리뷰 작성
                </button>
              </div>
            </div>
          )}
        </main>
      );
    }

    if (currentTab === 'Growth') {
      return <JindoLog />;
    }

    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
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
          <span>Growth</span>
        </div>
        <div className={`nav-item ${currentTab === 'Map' ? 'active' : ''}`} onClick={() => setCurrentTab('Map')}>
          <MapIcon size={24} />
          <span>Map</span>
        </div>
        <div className={`nav-item ${currentTab === 'Hub' ? 'active' : ''}`} onClick={() => setCurrentTab('Hub')}>
          <Edit3 size={24} />
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

