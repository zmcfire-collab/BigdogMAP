/**
* @license
* SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useEffect } from 'react'
import { Activity, ImageIcon, Check, Crop, MousePointer2, ExternalLink, Info, Trash2, ArrowLeft, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Cropper from 'react-easy-crop';
import { cn } from './lib/utils';
import { supabase } from './supabase';

// --- Types ---
interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  title?: string;
  content?: string;
  filter: string;
  tags: string[];
  hotspots: Hotspot[];
}

// --- Canvas Crop & Compress Utility ---
const MAX_PX = 900;
const JPEG_Q = 0.80;

function createImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.src = url;
  });
}

async function getCroppedImg(imageSrc: string, pixelCrop: CropArea): Promise<string> {
  const image = await createImageElement(imageSrc);
  const scale = Math.min(1, MAX_PX / pixelCrop.width, MAX_PX / pixelCrop.height);
  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(pixelCrop.width  * scale);
  canvas.height = Math.round(pixelCrop.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, canvas.width, canvas.height
  );
  return canvas.toDataURL('image/jpeg', JPEG_Q);
}

async function compressImage(src: string): Promise<string> {
  const image = await createImageElement(src);
  const scale = Math.min(1, MAX_PX / image.width, MAX_PX / image.height);
  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(image.width  * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', JPEG_Q);
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
          isSelected ? "bg-white border-[#315926]" : "bg-[#315926] border-white"
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
            className="absolute top-8 left-1/2 -translate-x-1/2 bg-white p-3 rounded-xl shadow-xl border border-gray-200 w-48"
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
                  <button onClick={() => onSelect?.()} className="text-[#315926] p-1">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium">{hotspot.label}</p>
                {hotspot.link && (
                  <a href={hotspot.link} target="_blank" rel="noopener noreferrer" className="text-xs text-[#315926] flex items-center mt-1">
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
  onSave: (data: { image: string, title: string, content: string, hotspots: Hotspot[], filter: string, tags: string[] }) => void,
  onCancel: () => void
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [step, setStep] = useState<'crop' | 'edit'>('crop');
  const [filter, setFilter] = useState('none');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  const filters = [
    { name: 'none', label: 'Original' },
    { name: 'grayscale(100%)', label: 'B&W' },
    { name: 'sepia(50%)', label: 'Vintage' },
    { name: 'brightness(1.2) contrast(1.1)', label: 'Bright' },
    { name: 'saturate(1.5)', label: 'Vibrant' },
    { name: 'hue-rotate(90deg)', label: 'Cool' }
  ];

  const handleNext = async () => {
    setIsCropping(true);
    try {
      const out = croppedAreaPixels && croppedAreaPixels.width > 0
        ? await getCroppedImg(image, croppedAreaPixels)
        : await compressImage(image);
      setCroppedImage(out);
    } catch (e) {
      console.error('Crop error:', e);
      try { setCroppedImage(await compressImage(image)); }
      catch { setCroppedImage(image); }
    }
    setIsCropping(false);
    setStep('edit');
  };

  const editImage = croppedImage || image;

  const addHotspot = (e: React.MouseEvent<HTMLDivElement>) => {
    if (step !== 'edit') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newHotspot: Hotspot = {
      id: Math.random().toString(36).slice(2, 11),
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
    <div className="fixed inset-0 z-[2000] bg-black/90 flex flex-col md:flex-row">
      <header className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-6 z-10 bg-gradient-to-b from-black/50 to-transparent">
        <button onClick={onCancel} className="text-white hover:bg-white/20 p-2 rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex gap-2">
          {step === 'crop' ? (
            <button
              onClick={handleNext}
              disabled={isCropping}
              className="bg-white text-black px-6 py-2 rounded-full font-bold flex items-center disabled:opacity-60"
            >
              {isCropping ? '처리 중...' : (<>다음 <MousePointer2 className="w-4 h-4 ml-2" /></>)}
            </button>
          ) : (
            <button
              onClick={() => onSave({ image: editImage, title, content, hotspots, filter, tags: [] })}
              className="bg-[#315926] text-white px-6 py-2 rounded-full font-bold flex items-center"
            >
              저장 <Check className="w-4 h-4 ml-2" />
            </button>
          )}
        </div>
      </header>

      {/* Editor Area */}
      <div className="flex-1 relative bg-black flex items-center justify-center p-4">
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
                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              />
            </div>
          ) : (
            <div className="relative cursor-crosshair" onClick={addHotspot}>
              <img
                src={editImage}
                className="max-w-full max-h-[70vh] object-contain"
                style={{ filter: filter !== 'none' ? filter : undefined }}
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
            <h3 className="text-lg font-bold text-[#315926] flex items-center gap-2">
              <Crop className="w-5 h-5" /> 자르기 및 확대
            </h3>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">확대 (Zoom)</label>
              <input
                type="range" min={1} max={3} step={0.1}
                value={zoom} onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-[#315926]"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>1x</span>
                <span>{zoom.toFixed(1)}x</span>
                <span>3x</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              사진을 드래그하여 위치를 조정하고, 슬라이더로 확대/축소하세요. 완료 후 <strong>다음</strong>을 눌러주세요.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">기록 정보</h3>
              <div className="space-y-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="제목 (예: 마당 첫 나들이)"
                  className="w-full text-sm p-3 border rounded-xl focus:ring-2 focus:ring-[#315926]/20 focus:outline-none"
                />
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="오늘의 이야기를 남겨주세요..."
                  className="w-full text-sm p-3 border rounded-xl h-24 focus:ring-2 focus:ring-[#315926]/20 focus:outline-none resize-none"
                />
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">필터</h3>
              <div className="grid grid-cols-3 gap-2">
                {filters.map(f => (
                  <button
                    key={f.name}
                    onClick={() => setFilter(f.name)}
                    className={cn(
                      "group flex flex-col items-center gap-1",
                      filter === f.name ? "text-[#315926]" : "text-gray-500"
                    )}
                  >
                    <div className={cn(
                      "w-full aspect-square rounded-md overflow-hidden border-2 transition-all",
                      filter === f.name ? "border-[#315926]" : "border-transparent hover:border-gray-300"
                    )}>
                      <img src={editImage} className="w-full h-full object-cover" style={{ filter: f.name !== 'none' ? f.name : undefined }} alt={f.label} />
                    </div>
                    <span className="text-[10px] font-medium">{f.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">핫스팟</h3>
              <p className="text-xs text-gray-600">이미지 위의 지점을 클릭하여 핫스팟을 추가하세요.</p>
              <div className="space-y-2">
                {hotspots.map(h => (
                  <button
                    key={h.id}
                    onClick={() => setSelectedHotspotId(h.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border flex items-center justify-between transition-colors",
                      selectedHotspotId === h.id ? "border-[#315926] bg-[#315926]/5" : "border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    <span className="text-sm font-medium">{h.label || "설명 없음..."}</span>
                    <div className="w-2 h-2 rounded-full bg-[#315926]" />
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
          title: d.title || '',
          content: d.content || '',
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

  const handleSaveEntry = async (data: { image: string, title: string, content: string, hotspots: Hotspot[], filter: string, tags: string[] }) => {
    const newLog = {
      image_url: data.image,
      log_date: new Date().toLocaleDateString('ko-KR'),
      title: data.title,
      content: data.content,
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
      const detail = error.message ?? '알 수 없는 오류';
      const hint = detail.includes('does not exist')
        ? '\n\n➡ Supabase SQL Editor에서 supabase_feed.sql 파일 내용을 실행해주세요.'
        : '';
      alert(`저장 실패: ${detail}${hint}`);
    } else if (insertedData) {
      const entry: LogEntry = {
        id: insertedData[0].id,
        date: insertedData[0].log_date,
        image: insertedData[0].image_url,
        title: insertedData[0].title || '',
        content: insertedData[0].content || '',
        filter: insertedData[0].filter,
        tags: insertedData[0].tags || [],
        hotspots: insertedData[0].hotspots || []
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
    e.target.value = '';
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
             <Activity size={200} color="white" />
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
                <div key={entry.id} className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-[#ebe8e3] flex flex-col group hover:shadow-md transition-all col-span-2 md:col-span-1">
                   <div className="relative aspect-[4/5] overflow-hidden">
                      <img
                        src={entry.image}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        style={{ filter: entry.filter && entry.filter !== 'none' ? entry.filter : undefined }}
                        alt="Entry"
                      />
                      <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-white font-bold tracking-widest uppercase">
                          {entry.date}
                      </div>
                   </div>
                   <div className="p-6 space-y-2">
                      <h4 className="text-lg font-sans text-[#543013]">{entry.title || "제목 없는 기록"}</h4>
                      <p className="text-sm text-[#715a4a] line-clamp-2 leading-relaxed">{entry.content || "기록된 내용이 없습니다."}</p>
                      <div className="flex gap-2 pt-2">
                        {entry.hotspots.length > 0 && (
                            <span className="text-[10px] font-bold text-[#315926] bg-[#315926]/10 px-2 py-0.5 rounded-full">
                                {entry.hotspots.length} hotspots
                            </span>
                        )}
                      </div>
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
