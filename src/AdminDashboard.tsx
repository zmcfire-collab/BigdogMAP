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

  const handleAddPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('places').insert([newPlace]);
    if (!error) {
      alert('장소가 성공적으로 추가되었습니다.');
      setIsAddingPlace(false);
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
