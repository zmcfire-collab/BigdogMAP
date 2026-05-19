import { useState, useEffect } from 'react';
import { LayoutDashboard, MapPin, Trash2, PlusCircle, LogOut, Link } from 'lucide-react';
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

function extractCoordsFromUrl(url: string): { lat: number; lng: number; name: string } | null {
  try {
    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]), name: extractNameFromUrl(url) };

    const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]), name: extractNameFromUrl(url) };

    const naverLat = url.match(/[?&]lat=(-?\d+\.\d+)/);
    const naverLng = url.match(/[?&]lng=(-?\d+\.\d+)/);
    if (naverLat && naverLng) return { lat: parseFloat(naverLat[1]), lng: parseFloat(naverLng[1]), name: extractNameFromUrl(url) };

    const cy = url.match(/[?&]cy=(-?\d+\.\d+)/);
    const cx = url.match(/[?&]cx=(-?\d+\.\d+)/);
    if (cy && cx) return { lat: parseFloat(cy[1]), lng: parseFloat(cx[1]), name: extractNameFromUrl(url) };

    return null;
  } catch { return null; }
}

function extractNameFromUrl(url: string): string {
  try {
    const m = url.match(/\/place\/([^/@]+)/);
    if (m) return decodeURIComponent(m[1].replace(/\+/g, ' '));
  } catch { /* ignore */ }
  return '';
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'Places' | 'Pins'>('Places');
  const [places, setPlaces] = useState<Place[]>([]);
  const [pendingPins, setPendingPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [mapUrl, setMapUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [newPlace, setNewPlace] = useState({ name: '', category: 'Cafe', lat: 0, lng: 0 });

  useEffect(() => { fetchData(); }, [activeTab]); // eslint-disable-line

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
      alert('데이터 오류: ' + (err as Error).message);
    } finally { setLoading(false); }
  };

  const handleUrlParse = async () => {
    setUrlError('');
    if (!mapUrl.trim()) return;

    const input = mapUrl.trim();

    // 플러스코드 감지 (예: J2CR+H6 서울특별시 or F4JX+29 하남시 경기도)
    const plusCodeMatch = input.match(/^([A-Z0-9]{4}\+[A-Z0-9]{2,3})\s*(.*)$/i);
    if (plusCodeMatch) {
      try {
        const query = encodeURIComponent(input);
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=AIzaSyAZvFsLE0TJZgkNapM6iZx12w2S9cfuvbE&language=ko`
        );
        const data = await res.json();
        if (data.status === 'OK' && data.results[0]) {
          const loc = data.results[0].geometry.location;
          const name = data.results[0].formatted_address || '';
          setNewPlace(prev => ({ ...prev, lat: loc.lat, lng: loc.lng, name: prev.name || name }));
          setUrlError('');
        } else {
          setUrlError('플러스코드 변환 실패. 구글 지도에서 직접 검색 후 전체 URL을 복사해주세요.');
        }
      } catch {
        setUrlError('네트워크 오류. 잠시 후 다시 시도해주세요.');
      }
      return;
    }

    // 구글 단축 URL
    if (input.includes('maps.app.goo.gl') || input.includes('goo.gl/maps')) {
      setUrlError('구글 단축 링크는 지원되지 않습니다.\n브라우저에서 열어 주소창의 전체 URL을 복사해주세요.');
      return;
    }

    // 일반 지도 URL
    const coords = extractCoordsFromUrl(input);
    if (coords) {
      setNewPlace(prev => ({ ...prev, lat: coords.lat, lng: coords.lng, name: coords.name || prev.name }));
    } else {
      setUrlError('좌표를 찾을 수 없습니다. 구글/네이버 지도 전체 URL 또는 플러스코드를 사용해주세요.');
    }
  };

  // 대량 등록: 한 줄에 "장소명,카테고리,위도,경도" 형식
  const handleBulkImport = async () => {
    if (!bulkText.trim()) return;
    setBulkLoading(true);
    const lines = bulkText.trim().split('\n').filter(l => l.trim());
    const rows = lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 4) return null;
      const lat = parseFloat(parts[2]);
      const lng = parseFloat(parts[3]);
      if (isNaN(lat) || isNaN(lng)) return null;
      return { name: parts[0], category: parts[1] || 'Cafe', lat, lng };
    }).filter(Boolean);

    if (rows.length === 0) { alert('올바른 형식의 데이터가 없습니다.\n형식: 장소명,카테고리,위도,경도'); setBulkLoading(false); return; }

    const { error } = await supabase.from('places').insert(rows as any[]);
    if (error) { alert('오류: ' + error.message); }
    else {
      alert(`${rows.length}개 장소가 등록되었습니다!`);
      setBulkText('');
      setIsBulkMode(false);
      fetchData();
    }
    setBulkLoading(false);
  };

  const handleAddPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlace.name.trim()) { alert('장소명을 입력해주세요.'); return; }
    if (!newPlace.lat || !newPlace.lng) { alert('위도/경도를 입력해주세요.'); return; }
    const { error } = await supabase.from('places').insert([{ name: newPlace.name, category: newPlace.category, lat: newPlace.lat, lng: newPlace.lng }]);
    if (!error) {
      alert('장소가 추가되었습니다!');
      setIsAddingPlace(false);
      setMapUrl('');
      setNewPlace({ name: '', category: 'Cafe', lat: 0, lng: 0 });
      fetchData();
    } else {
      alert('오류: ' + error.message);
    }
  };

  const removePlace = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('places').delete().eq('id', id);
    if (error) alert('삭제 오류: ' + error.message);
    else setPlaces(places.filter(p => p.id !== id));
  };

  const approvePin = async (id: string) => {
    const { error } = await supabase.from('pins').update({ status: 'approved' }).eq('id', id);
    if (error) alert('승인 오류: ' + error.message);
    else { setPendingPins(pendingPins.filter(p => p.id !== id)); alert('승인되었습니다.'); }
  };

  const rejectPin = async (id: string) => {
    const { error } = await supabase.from('pins').update({ status: 'rejected' }).eq('id', id);
    if (error) alert('거절 오류: ' + error.message);
    else { setPendingPins(pendingPins.filter(p => p.id !== id)); alert('거부되었습니다.'); }
  };

  const inp = { padding: '10px 12px', border: '1px solid #DDD', borderRadius: '8px', fontSize: '14px', width: '100%' };

  return (
    <div style={{ flex: 1, backgroundColor: '#F0F2F5', display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
      <header style={{ background: '#1C2939', color: 'white', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LayoutDashboard size={22} />
          <h1 style={{ fontSize: '18px', fontWeight: 900 }}>대견 Back-Office</h1>
        </div>
        <button onClick={onLogout} style={{ background: 'transparent', border: 'none', color: '#FF7B7B', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, cursor: 'pointer' }}>
          로그아웃 <LogOut size={16} />
        </button>
      </header>

      <nav style={{ background: 'white', display: 'flex', padding: '0 20px', borderBottom: '1px solid #DDD' }}>
        {(['Places', 'Pins'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '14px 20px', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 800,
            color: activeTab === tab ? '#305C38' : '#666',
            borderBottom: activeTab === tab ? '3px solid #305C38' : '3px solid transparent', cursor: 'pointer',
          }}>
            {tab === 'Places' ? '장소 관리' : '커뮤니티 제보 핀'}
          </button>
        ))}
      </nav>

      <main style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>불러오는 중...</div>
        ) : activeTab === 'Places' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800 }}>전체 등록 장소 ({places.length})</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setIsBulkMode(!isBulkMode); setIsAddingPlace(false); }}
                  style={{ padding: '10px 14px', background: isBulkMode ? '#999' : '#1A73E8', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', fontSize: '12px' }}>
                  📋 {isBulkMode ? '취소' : '대량 등록'}
                </button>
                <button onClick={() => { setIsAddingPlace(!isAddingPlace); setIsBulkMode(false); }}
                  style={{ padding: '10px 14px', background: isAddingPlace ? '#999' : '#305C38', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <PlusCircle size={15} /> {isAddingPlace ? '취소' : '단건 추가'}
                </button>
              </div>
            </div>

            {/* 대량 등록 패널 */}
            {isBulkMode && (
              <div style={{ background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <p style={{ fontSize: '13px', fontWeight: 800, color: '#1A73E8', marginBottom: '8px' }}>📋 대량 등록</p>
                <p style={{ fontSize: '11px', color: '#666', marginBottom: '10px', lineHeight: 1.6 }}>
                  한 줄에 하나씩 입력하세요: <strong>장소명,카테고리,위도,경도</strong><br />
                  카테고리: Cafe / Park / Restaurant / Hotel / Training / Playground<br />
                  예) 반포한강공원,Park,37.5100,126.9950
                </p>
                <textarea
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  placeholder={"반포한강공원,Park,37.5100,126.9950\n올림픽공원,Park,37.5219,127.1217\n더희원,Cafe,37.6234,126.9012"}
                  style={{ width: '100%', height: '160px', padding: '10px', border: '1px solid #DDD', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace', resize: 'vertical' }}
                />
                <button onClick={handleBulkImport} disabled={bulkLoading || !bulkText.trim()}
                  style={{ marginTop: '10px', width: '100%', padding: '12px', background: bulkLoading ? '#999' : '#1A73E8', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}>
                  {bulkLoading ? '등록 중...' : `일괄 등록하기`}
                </button>
              </div>
            )}

            {isAddingPlace && (
              <div style={{ background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                {/* URL 자동 파싱 */}
                <div style={{ marginBottom: '16px', padding: '14px', background: '#f0f7f1', borderRadius: '10px', border: '1px solid #c8e6c9' }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#305C38', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Link size={12} /> 지도 링크로 자동 입력
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      value={mapUrl}
                      onChange={e => { setMapUrl(e.target.value); setUrlError(''); }}
                      placeholder="플러스코드(J2CR+H6 서울) 또는 구글/네이버 지도 전체 URL"
                      style={{ ...inp, flex: 1 }}
                    />
                    <button type="button" onClick={handleUrlParse}
                      style={{ padding: '10px 16px', background: '#1A73E8', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      가져오기
                    </button>
                  </div>
                  {urlError ? (
                    <p style={{ fontSize: '11px', color: '#D32F2F', marginTop: '6px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>⚠ {urlError}</p>
                  ) : (
                    <p style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
                      💡 플러스코드(예: J2CR+H6 서울특별시) 또는 구글/네이버 지도 전체 URL 지원
                    </p>
                  )}
                </div>

                <form onSubmit={handleAddPlace}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <input placeholder="장소명 *" value={newPlace.name} onChange={e => setNewPlace({ ...newPlace, name: e.target.value })} style={inp} required />
                    <select value={newPlace.category} onChange={e => setNewPlace({ ...newPlace, category: e.target.value })} style={inp}>
                      <option value="Cafe">카페</option>
                      <option value="Park">공원</option>
                      <option value="Restaurant">식당</option>
                      <option value="Hotel">호텔/숙소</option>
                      <option value="Training">훈련소</option>
                      <option value="Playground">놀이터</option>
                    </select>
                    <input placeholder="위도 (예: 37.5100)" type="number" step="any" value={newPlace.lat || ''} onChange={e => setNewPlace({ ...newPlace, lat: parseFloat(e.target.value) })} style={inp} required />
                    <input placeholder="경도 (예: 126.9950)" type="number" step="any" value={newPlace.lng || ''} onChange={e => setNewPlace({ ...newPlace, lng: parseFloat(e.target.value) })} style={inp} required />
                  </div>
                  <button type="submit" style={{ marginTop: '12px', width: '100%', padding: '12px', background: '#305C38', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}>
                    장소 저장
                  </button>
                </form>
              </div>
            )}

            <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8F9FA', borderBottom: '1px solid #EEE' }}>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px' }}>장소명</th>
                    <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px' }}>카테고리</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px' }}>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {places.length === 0 ? (
                    <tr><td colSpan={3} style={{ padding: '32px', textAlign: 'center', color: '#999', fontSize: '14px' }}>등록된 장소가 없습니다.</td></tr>
                  ) : places.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #F0F0F0' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: '14px' }}>{p.name}</td>
                      <td style={{ padding: '14px 16px', color: '#666', fontSize: '13px' }}>{p.category}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button onClick={() => removePlace(p.id)} style={{ padding: '8px', background: 'transparent', border: 'none', color: '#D32F2F', cursor: 'pointer' }}>
                          <Trash2 size={18} />
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
            <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>대기 중인 제보 ({pendingPins.length})</h2>
            {pendingPins.length === 0 ? (
              <div style={{ background: 'white', padding: '40px', borderRadius: '12px', textAlign: 'center', color: '#999' }}>대기 중인 제보가 없습니다.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                {pendingPins.map(pin => (
                  <div key={pin.id} style={{ background: 'white', padding: '18px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                      <div style={{ padding: '10px', background: pin.type === 'GREEN' ? '#E8F5E9' : '#FFEBEE', color: pin.type === 'GREEN' ? '#2E7D32' : '#C62828', borderRadius: '50%' }}>
                        <MapPin size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '14px' }}>{pin.type === 'GREEN' ? '🐾 진도/대형견 환영' : '🚫 입장 거절'}</div>
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>{pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => approvePin(pin.id)} style={{ flex: 1, padding: '10px', background: '#E8F5E9', border: 'none', color: '#2E7D32', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}>✓ 승인</button>
                      <button onClick={() => rejectPin(pin.id)} style={{ flex: 1, padding: '10px', background: '#FFEBEE', border: 'none', color: '#C62828', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}>✕ 거절</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
