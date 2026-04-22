/**
* @license
* SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef } from 'react'
import { Activity, ImageIcon, Check, Crop, MousePointer2, ExternalLink, Info, Trash2, ArrowLeft, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Cropper from 'react-easy-crop';
import { cn } from './lib/utils';
import { supabase } from './supabase';
import { useEffect } from 'react';

// --- Types ---
interface Hotspot {
  id: string;
  x: number; // percentage
  y: number; // percentage
  label: string;
  link?: string;
  color?: string;
  type: 'tooltip' | 'link';
  shape: 'circle' | 'square';
}

interface LogEntry {
  id: string;
  date: string;
  image: string;
  filter: string;
  tags: string[];
  hotspots: Hotspot[];
}

// --- Components ---
const HotspotMarker = ({ hotspot, isEditing, onSelect, isSelected, onUpdate, onDelete }: { 
  hotspot: Hotspot, 
  isEditing?: boolean, 
  onSelect?: () => void,
  isSelected?: boolean,
  onUpdate?: (updates: Partial<Hotspot>) => void,
  onDelete?: () => void
}) => {
  return (
    <div 
      className="absolute z-10"
      style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
    >
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.2 }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
        className={cn(
          "w-6 h-6 -translate-x-1/2 -translate-y-1/2 border-2 shadow-lg flex items-center justify-center transition-colors",
          hotspot.shape === 'circle' ? "rounded-full" : "rounded-sm",
          isSelected ? "bg-white border-primary" : `bg-${hotspot.color || 'primary'} border-white`
        )}
      >
        {hotspot.type === 'link' ? <ExternalLink className="w-3 h-3 text-white" /> : <Info className="w-3 h-3 text-white" />}
      </motion.button>
      
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-8 left-1/2 -translate-x-1/2 bg-white p-3 rounded-xl shadow-xl border border-surface-container-high w-48"
          >
            {isEditing ? (
              <div className="space-y-3">
                <input 
                  value={hotspot.label}
                  onChange={(e) => onUpdate?.({ label: e.target.value })}
                  placeholder="설명 입력..."
                  className="w-full text-xs p-2 border rounded-md"
                />
                {hotspot.type === 'link' && (
                  <input 
                    value={hotspot.link || ''}
                    onChange={(e) => onUpdate?.({ link: e.target.value })}
                    placeholder="URL 입력..."
                    className="w-full text-xs p-2 border rounded-md"
                  />
                )}
                <div className="flex justify-between items-center">
                  <button onClick={onDelete} className="text-red-500 hover:bg-red-50 p-1 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => onSelect?.()} className="text-primary p-1">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium">{hotspot.label}</p>
                {hotspot.link && (
                  <a href={hotspot.link} target="_blank" rel="noopener noreferrer" className="text-xs text-secondary flex items-center mt-1">
                    링크 이동 <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ImageEditor = ({ image, onSave, onCancel }: { 
  image: string, 
  onSave: (data: { image: string, hotspots: Hotspot[], filter: string, tags: string[] }) => void, 
  onCancel: () => void 
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [step, setStep] = useState<'crop' | 'edit'>('crop');
  const [filter, setFilter] = useState('none');
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);

  const filters = [
    { name: 'none', label: 'Original' },
    { name: 'grayscale(100%)', label: 'B&W' },
    { name: 'sepia(50%)', label: 'Vintage' },
    { name: 'brightness(1.2) contrast(1.1)', label: 'Bright' },
    { name: 'saturate(1.5)', label: 'Vibrant' },
    { name: 'hue-rotate(90deg)', label: 'Cool' }
  ];

  const addHotspot = (e: React.MouseEvent<HTMLDivElement>) => {
    if (step !== 'edit') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newHotspot: Hotspot = {
      id: Math.random().toString(36).substr(2, 9),
      x, y,
      label: '',
      type: 'tooltip',
      shape: 'circle',
      color: 'primary'
    };
    setHotspots([...hotspots, newHotspot]);
    setSelectedHotspotId(newHotspot.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col md:flex-row">
      <header className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-6 z-10 bg-gradient-to-b from-black/50 to-transparent">
        <button onClick={onCancel} className="text-white hover:bg-white/20 p-2 rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex gap-2">
          {step === 'crop' ? (
            <button 
              onClick={() => setStep('edit')}
              className="bg-white text-black px-6 py-2 rounded-full font-bold flex items-center"
            >
              다음 <MousePointer2 className="w-4 h-4 ml-2" />
            </button>
          ) : (
            <button 
              onClick={() => onSave({ image: image, hotspots, filter, tags: [] })}
              className="bg-primary text-white px-6 py-2 rounded-full font-bold flex items-center"
            >
              저장 <Check className="w-4 h-4 ml-2" />
            </button>
          )}
        </div>
      </header>

      {/* Editor Area */}
      <div className="flex-1 relative bg-surface-container-highest flex items-center justify-center p-4">
        <div className="relative max-w-full max-h-full shadow-2xl overflow-hidden rounded-lg">
          {step === 'crop' ? (
            <div className="w-[300px] h-[375px] md:w-[400px] md:h-[500px]">
              <Cropper
                image={image}
                crop={crop}
                zoom={zoom}
                aspect={4/5}
                onCropChange={setCrop}
                onZoomChange={setZoom}
              />
            </div>
          ) : (
            <div className="relative cursor-crosshair" onClick={addHotspot}>
              <img 
                src={image} 
                className="max-w-full max-h-[70vh] object-contain"
                style={{ filter }}
                alt="Editing"
              />
              {hotspots.map(h => (
                <HotspotMarker 
                  key={h.id} 
                  hotspot={h} 
                  isEditing 
                  isSelected={h.id === selectedHotspotId}
                  onSelect={() => setSelectedHotspotId(h.id)}
                  onUpdate={(updates) => setHotspots(hotspots.map(item => item.id === h.id ? { ...item, ...updates } : item))}
                  onDelete={() => setHotspots(hotspots.filter(item => item.id !== h.id))}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Control Panel */}
      <div className="w-full md:w-80 bg-white border-l p-6 overflow-y-auto">
        {step === 'crop' ? (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <Crop className="w-5 h-5" /> 자르기 및 확대
            </h3>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Zoom</label>
              <input 
                type="range" min={1} max={3} step={0.1} 
                value={zoom} onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Filters</h3>
              <div className="grid grid-cols-3 gap-2">
                {filters.map(f => (
                  <button 
                    key={f.name}
                    onClick={() => setFilter(f.name)}
                    className={cn(
                      "group flex flex-col items-center gap-1",
                      filter === f.name ? "text-primary" : "text-gray-500"
                    )}
                  >
                    <div className="w-full aspect-square rounded-md overflow-hidden border-2 border-transparent group-hover:border-primary transition-all">
                      <img src={image} className="w-full h-full object-cover" style={{ filter: f.name }} alt={f.label} />
                    </div>
                    <span className="text-[10px] font-medium">{f.label}</span>
                  </button>
                ))}
              </div>
            </section>
            
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Hotspots</h3>
              <p className="text-xs text-gray-600">이미지 위의 지점을 클릭하여 핫스팟을 추가하세요.</p>
              <div className="space-y-2">
                {hotspots.map(h => (
                  <button 
                    key={h.id}
                    onClick={() => setSelectedHotspotId(h.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border flex items-center justify-between transition-colors",
                      selectedHotspotId === h.id ? "border-primary bg-primary/5" : "border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    <span className="text-sm font-medium">{h.label || "설명 없음..."}</span>
                    <div className="flex gap-1">
                      <div className={cn("w-2 h-2 rounded-full", h.shape === 'circle' ? "rounded-full" : "rounded-sm", `bg-${h.color || 'primary'}`)} />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main JindoLog Component ---
export function JindoLog() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch entries from Supabase
  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('jindo_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching jindo logs:', error);
      } else if (data) {
        const transformed: LogEntry[] = data.map((d) => ({
          id: d.id,
          date: d.log_date,
          image: d.image_url,
          filter: d.filter,
          tags: d.tags || [],
          hotspots: d.hotspots || []
        }));
        setEntries(transformed);
      }
      setLoading(false);
    };

    fetchEntries();
  }, []);

  const handleSaveEntry = async (data: { image: string, hotspots: Hotspot[], filter: string, tags: string[] }) => {
    const newLog = {
      image_url: data.image,
      log_date: new Date().toLocaleDateString(),
      filter: data.filter,
      tags: data.tags,
      hotspots: data.hotspots
    };

    const { data: insertedData, error } = await supabase
      .from('jindo_logs')
      .insert([newLog])
      .select();

    if (error) {
      console.error('Error saving jindo log:', error);
      alert('저장 중 오류가 발생했습니다.');
    } else if (insertedData) {
      const entry: LogEntry = {
        id: insertedData[0].id,
        date: insertedData[0].log_date,
        image: insertedData[0].image_url,
        filter: insertedData[0].filter,
        tags: insertedData[0].tags,
        hotspots: insertedData[0].hotspots
      };
      setEntries([entry, ...entries]);
    }
    setEditingImage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setEditingImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#fcf9f4] pb-24">
      {/* Hero / Upload */}
      <main className="px-6 space-y-8 max-w-md mx-auto py-6">
        <section className="bg-[#8b5e3c] rounded-3xl p-8 relative overflow-hidden group">
          <div className="relative z-10 space-y-4">
            <h2 className="text-3xl font-black text-white leading-tight">오늘의 진도개<br/>성장을 기록하세요</h2>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-white text-[#8b5e3c] px-8 py-3 rounded-full font-bold shadow-xl hover:scale-105 transition-transform flex items-center gap-2"
            >
              <Upload className="w-5 h-5" /> 사진 올리기
            </button>
          </div>
          <div className="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:opacity-20 transition-opacity">
             <Activity size="200" color="white" />
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
        </section>

        {/* Gallery */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">최근 기록</h3>
            <button className="text-[#8b5e3c] text-sm font-bold">전체보기</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-2 py-12 text-center text-gray-500">불러오는 중...</div>
            ) : entries.length === 0 ? (
              <div className="col-span-2 py-12 text-center space-y-3 bg-[#f0ede8] rounded-3xl border-2 border-dashed border-gray-300">
                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto" />
                <p className="text-gray-500 font-medium">첫 번째 기록을 남겨보세요!</p>
              </div>
            ) : (
              entries.map(entry => (
                <div key={entry.id} className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-md">
                   <img src={entry.image} className="w-full h-full object-cover" style={{ filter: entry.filter }} alt="Entry" />
                   <div className="absolute top-3 left-3 bg-black/30 backdrop-blur-md px-2 py-1 rounded-full text-[10px] text-white">
                      {entry.date}
                   </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* App Editor Modal */}
      <AnimatePresence>
        {editingImage && (
          <ImageEditor 
            image={editingImage} 
            onCancel={() => setEditingImage(null)}
            onSave={handleSaveEntry}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
