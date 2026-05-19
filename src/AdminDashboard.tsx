import { useState, useEffect } from 'react';
import { LayoutDashboard, MapPin, Trash2, PlusCircle, LogOut } from 'lucide-react';
import { supabase } from './supabase';

interface AdminDashboardProps {
  onLogout: () => void;
}

interface Place {
  id: string;
  name: string;
  category: string;
  created_at?: string;
}

interface Pin {
  id: string;
  type: 'GREEN' | 'RED';
  lat: number;
  lng: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at?: string;
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'Places' | 'Pins'>('Places');
  const [places, setPlaces] = useState<Place[]>([]);
  const [pendingPins, setPendingPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'Places') {
        const { data, error } = await supabase.from('places').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setPlaces(data || []);
      } else {
        const { data, error } = await supabase.from('pins').select('*').eq('status', 'pending').order('created_at', { ascending: false });
        if (error) throw error;
        setPendingPins(data || []);
      }
    } catch (err) {
      const error = err as Error;
      console.error('Data Fetch Error:', error);
      alert('데이터를 불러오는 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
    } finally {
      setLoading(false);
    }
  };

  const removePlace = async (id: string) => {
    if (!confirm('정말로 이 장소를 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('places').delete().eq('id', id);
    if (error) {
      console.error('Remove Place Error:', error);
      alert('장소 삭제 중 오류가 발생했습니다: ' + error.message);
    } else {
      setPlaces(places.filter(p => p.id !== id));
    }
  };

  const approvePin = async (id: string) => {
    const { error } = await supabase.from('pins').update({ status: 'approved' }).eq('id', id);
    if (error) {
      console.error('Approve Pin Error:', error);
      alert('핀 승인 중 오류가 발생했습니다: ' + error.message);
    } else {
      setPendingPins(pendingPins.filter(p => p.id !== id));
      alert('핀이 승인되었습니다.');
    }
  };

  const rejectPin = async (id: string) => {
    const { error } = await supabase.from('pins').update({ status: 'rejected' }).eq('id', id);
    if (error) {
      console.error('Reject Pin Error:', error);
      alert('핀 거절 중 오류가 발생했습니다: ' + error.message);
    } else {
      setPendingPins(pendingPins.filter(p => p.id !== id));
      alert('핀이 거부되었습니다.');
    }
  };

  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [newPlace, setNewPlace] = useState({ name: '', category: 'Cafe', lat: 37.5665, lng: 126.9780 });
  const [mapUrl, setMapUrl] = useState('');
  const [mapParsing, setMapParsing] = useState(false);
  const [mapError, setMapError] = useState('');

  // Web Mercator → WGS84 변환 (네이버 지도 c= 파라미터)
  const mercatorToWgs84 = (x: number, y: number) => ({
    lat: Math.atan(Math.sinh(y / 6378137)) * 180 / Math.PI,
    lng: x * 180 / 20037508.342789244,
  });

  const resolveShortUrl = async (url: string, pattern: RegExp): Promise<string | null> => {
    try {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      const match = (data.contents as string)?.match(pattern);
      return match ? match[0] : null;
    } catch {
      return null;
    }
  };

  const parseMapUrl = async (url: string) => {
    setMapParsing(true);
    setMapError('');
    try {
      let resolved = url.trim();
      let lat = 0, lng = 0, name = '';

      /* ── 구글 지도 ── */
      if (resolved.includes('google.com/maps') || resolved.includes('maps.app.goo.gl') || resolved.includes('goo.gl/maps')) {
        if (resolved.includes('maps.app.goo.gl') || resolved.includes('goo.gl/maps')) {
          const full = await resolveShortUrl(resolved, /https:\/\/www\.google\.com\/maps\/[^"' ]+/);
          if (!full) { setMapError('구글 단축 링크 해석 실패. 전체 URL을 사용해주세요.'); return; }
          resolved = full;
        }
        const coord = resolved.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ?? resolved.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (!coord) { setMapError('구글 지도 링크에서 좌표를 찾을 수 없습니다.'); return; }
        lat = parseFloat(coord[1]);
        lng = parseFloat(coord[2]);
        const nm = resolved.match(/\/place\/([^/@?&]+)/);
        name = nm ? decodeURIComponent(nm[1].replace(/\+/g, ' ')).replace(/\/$/, '') : '';

      /* ── 네이버 지도 ── */
      } else if (resolved.includes('naver.me') || resolved.includes('map.naver.com') || resolved.includes('m.map.naver.com')) {
        if (resolved.includes('naver.me')) {
          const full = await resolveShortUrl(resolved, /https:\/\/(?:m\.)?map\.naver\.com\/[^"' ]+/);
          if (!full) { setMapError('네이버 단축 링크 해석 실패. 전체 URL을 사용해주세요.'); return; }
          resolved = full;
        }

        // coX=경도&coY=위도 (WGS84 직접)
        const coX = resolved.match(/[?&]coX=([\d.]+)/);
        const coY = resolved.match(/[?&]coY=([\d.]+)/);
        if (coX && coY) {
          lng = parseFloat(coX[1]);
          lat = parseFloat(coY[1]);
        } else {
          // c=X,Y,... 파라미터
          const cParam = resolved.match(/[?&]c=([-\d.]+),([-\d.]+)/);
          if (!cParam) { setMapError('네이버 지도 링크에서 좌표를 찾을 수 없습니다.'); return; }
          const x = parseFloat(cParam[1]);
          const y = parseFloat(cParam[2]);
          // WGS84 범위면 그대로, 아니면 Web Mercator 변환
          if (x > 120 && x < 132 && y > 33 && y < 39) {
            lng = x; lat = y;
          } else {
            const wgs = mercatorToWgs84(x, y);
            lat = wgs.lat; lng = wgs.lng;
          }
        }

        // 장소명: /search/NAME 또는 query= 파라미터
        const nmPath = resolved.match(/\/search\/([^/?&]+)/);
        const nmQuery = resolved.match(/[?&]query=([^&]+)/);
        name = nmPath
          ? decodeURIComponent(nmPath[1])
          : nmQuery ? decodeURIComponent(nmQuery[1]) : '';

      } else {
        setMapError('구글 지도 또는 네이버 지도 링크를 붙여넣어주세요.');
        return;
      }

      setNewPlace(prev => ({ ...prev, name: name || prev.name, lat, lng }));
      setMapUrl('');
    } catch {
      setMapError('링크 파싱 중 오류가 발생했습니다.');
    } finally {
      setMapParsing(false);
    }
  };

  const handleAddPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('places').insert([newPlace]);
    if (!error) {
      alert('장소가 성공적으로 추가되었습니다.');
      setIsAddingPlace(false);
      setNewPlace({ name: '', category: 'Cafe', lat: 37.5665, lng: 126.9780 });
      fetchData();
    } else {
      alert('장소 추가 중 오류 발생: ' + error.message);
    }
  };

  return (
    <div style={{ flex: 1, backgroundColor: '#F0F2F5', display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
      <header style={{ background: '#1C2939', color: 'white', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LayoutDashboard size={24} />
          <h1 style={{ fontSize: '20px', fontWeight: 900 }}>대견 Back-Office</h1>
        </div>
        <button onClick={onLogout} style={{ background: 'transparent', border: 'none', color: '#FF7B7B', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, cursor: 'pointer' }}>
          로그아웃 <LogOut size={18} />
        </button>
      </header>

      <nav style={{ background: 'white', display: 'flex', padding: '0 20px', borderBottom: '1px solid #DDD' }}>
        {['Places', 'Pins'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab as 'Places' | 'Pins')}
            style={{ 
              padding: '16px 24px', border: 'none', background: 'transparent', fontSize: '14px', fontWeight: 800,
              color: activeTab === tab ? '#1A73E8' : '#666',
              borderBottom: activeTab === tab ? '3px solid #1A73E8' : '3px solid transparent',
              cursor: 'pointer'
            }}
          >
            {tab === 'Places' ? '장소 관리' : '커뮤니티 제보 핀'}
          </button>
        ))}
      </nav>

      <main style={{ padding: '24px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>데이터를 불러오는 중...</div>
        ) : activeTab === 'Places' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800 }}>전체 등록 장소 ({places.length})</h2>
              <button 
                onClick={() => setIsAddingPlace(!isAddingPlace)}
                style={{ background: '#1A73E8', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <PlusCircle size={18} /> {isAddingPlace ? '취소' : '새 장소 추가'}
              </button>
            </div>

            {isAddingPlace && (
              <form onSubmit={handleAddPlace} style={{ background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                {/* 지도 링크 파싱 */}
                <div style={{ marginBottom: '16px', padding: '14px', background: '#F0F7FF', borderRadius: '8px', border: '1px solid #C7DFFF' }}>
                  <p style={{ fontSize: '12px', fontWeight: 800, color: '#1A73E8', marginBottom: '8px' }}>🗺 지도 링크로 자동 입력 (구글 지도 · 네이버 지도)</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      placeholder="구글/네이버 지도 공유 링크 붙여넣기"
                      value={mapUrl}
                      onChange={e => { setMapUrl(e.target.value); setMapError(''); }}
                      style={{ flex: 1, padding: '10px', border: '1px solid #C7DFFF', borderRadius: '6px', fontSize: '13px' }}
                    />
                    <button
                      type="button"
                      onClick={() => parseMapUrl(mapUrl)}
                      disabled={!mapUrl.trim() || mapParsing}
                      style={{ padding: '10px 16px', background: '#1A73E8', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', opacity: !mapUrl.trim() || mapParsing ? 0.5 : 1 }}
                    >
                      {mapParsing ? '파싱 중...' : '가져오기'}
                    </button>
                  </div>
                  {mapError && <p style={{ marginTop: '8px', fontSize: '12px', color: '#C62828' }}>{mapError}</p>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <input placeholder="장소명" value={newPlace.name} onChange={e => setNewPlace({...newPlace, name: e.target.value})} style={{ padding: '10px', border: '1px solid #DDD', borderRadius: '6px' }} required />
                  <select value={newPlace.category} onChange={e => setNewPlace({...newPlace, category: e.target.value})} style={{ padding: '10px', border: '1px solid #DDD', borderRadius: '6px' }}>
                    <option>Cafe</option>
                    <option>Park</option>
                    <option>Restaurant</option>
                    <option>Hotel</option>
                  </select>
                  <input placeholder="위도(Lat)" type="number" step="any" value={newPlace.lat} onChange={e => setNewPlace({...newPlace, lat: parseFloat(e.target.value)})} style={{ padding: '10px', border: '1px solid #DDD', borderRadius: '6px' }} required />
                  <input placeholder="경도(Lng)" type="number" step="any" value={newPlace.lng} onChange={e => setNewPlace({...newPlace, lng: parseFloat(e.target.value)})} style={{ padding: '10px', border: '1px solid #DDD', borderRadius: '6px' }} required />
                </div>
                <button type="submit" style={{ marginTop: '12px', width: '100%', padding: '12px', background: '#305C38', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 800 }}>장소 저장</button>
              </form>
            )}
            
            <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8F9FA', borderBottom: '1px solid #EEE' }}>
                    <th style={{ padding: '16px', textAlign: 'left' }}>장소명</th>
                    <th style={{ padding: '16px', textAlign: 'left' }}>카테고리</th>
                    <th style={{ padding: '16px', textAlign: 'right' }}>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {places.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #F0F0F0' }}>
                      <td style={{ padding: '16px', fontWeight: 700 }}>{p.name}</td>
                      <td style={{ padding: '16px', color: '#666' }}>{p.category}</td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <button onClick={() => removePlace(p.id)} style={{ padding: '8px', background: 'transparent', border: 'none', color: '#D32F2F', cursor: 'pointer' }}>
                          <Trash2 size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>대기 중인 제보 ({pendingPins.length})</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {pendingPins.map(pin => (
                <div key={pin.id} style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ padding: '10px', background: pin.type === 'GREEN' ? '#E8F5E9' : '#FFEBEE', color: pin.type === 'GREEN' ? '#2E7D32' : '#C62828', borderRadius: '50%' }}>
                      <MapPin size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800 }}>{pin.type === 'GREEN' ? '진도/대형견 환영' : '입장 거절'}</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>{pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => approvePin(pin.id)} style={{ flex: 1, padding: '12px', background: '#E8F5E9', border: 'none', color: '#2E7D32', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}>승인</button>
                    <button onClick={() => rejectPin(pin.id)} style={{ flex: 1, padding: '12px', background: '#FFEBEE', border: 'none', color: '#C62828', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}>거절</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
