import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Heart, TrendingUp, Utensils, Award, ChevronRight,
  Droplet, Ruler, Calendar, Sparkles, Info, Plus, Loader2, X, PawPrint,
} from 'lucide-react';
import { cn } from './lib/utils';
import { supabase } from './supabase';
import { APP_CONFIG } from './config';

interface PetProfile {
  id: string;
  name: string;
  breed: string;
  color: string;
  birth_date: string;
  gender: string;
}

interface WeightLog {
  id: string;
  pet_id: string;
  weight: number;
  log_date: string;
  note?: string;
}

function calcAge(birthDate: string): string {
  if (!birthDate) return '나이 미설정';
  const diff = Date.now() - new Date(birthDate).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 30) return `${days}일째`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월차`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years}세 ${rem}개월` : `${years}세`;
}

export function AIGrowthCare() {
  const [pet, setPet] = useState<PetProfile | null>(null);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Setup form
  const [setupName, setSetupName] = useState('');
  const [setupBreed, setSetupBreed] = useState('진돗개');
  const [setupColor, setSetupColor] = useState('백구');
  const [setupBirth, setSetupBirth] = useState('');
  const [setupGender, setSetupGender] = useState('상관없음');
  const [setupSaving, setSetupSaving] = useState(false);

  // Weight form
  const [newWeight, setNewWeight] = useState('');
  const [newWeightDate, setNewWeightDate] = useState(new Date().toISOString().split('T')[0]);
  const [newWeightNote, setNewWeightNote] = useState('');
  const [weightSaving, setWeightSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: petData } = await supabase
      .from('pet_profiles')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (petData) {
      setPet(petData);
      const { data: logs } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('pet_id', petData.id)
        .order('log_date', { ascending: true });
      setWeightLogs(logs ?? []);
    } else {
      setShowSetup(true);
    }
    setLoading(false);
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupName.trim()) return;
    setSetupSaving(true);
    const { data, error } = await supabase
      .from('pet_profiles')
      .insert([{
        name: setupName.trim(),
        breed: setupBreed.trim(),
        color: setupColor.trim(),
        birth_date: setupBirth || null,
        gender: setupGender,
      }])
      .select()
      .single();
    if (!error && data) {
      setPet(data);
      setShowSetup(false);
    }
    setSetupSaving(false);
  };

  const handleAddWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pet || !newWeight) return;
    setWeightSaving(true);
    const { data, error } = await supabase
      .from('weight_logs')
      .insert([{
        pet_id: pet.id,
        weight: parseFloat(newWeight),
        log_date: newWeightDate,
        note: newWeightNote.trim() || null,
      }])
      .select()
      .single();
    if (!error && data) {
      setWeightLogs(prev => [...prev, data].sort((a, b) => a.log_date.localeCompare(b.log_date)));
      setNewWeight('');
      setNewWeightNote('');
      setNewWeightDate(new Date().toISOString().split('T')[0]);
      setShowWeightForm(false);
    }
    setWeightSaving(false);
  };

  const handleAiAnalysis = async () => {
    if (!pet) return;
    const apiKey = APP_CONFIG.GEMINI_API_KEY;
    if (!apiKey) {
      setAiAnalysis('Gemini API 키가 설정되지 않았습니다.\nsrc/config.ts의 GEMINI_API_KEY를 입력해주세요.\n(발급: https://aistudio.google.com/app/apikey)');
      return;
    }
    setIsAnalyzing(true);
    setAiAnalysis('');
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const genAI = new GoogleGenAI({ apiKey });
      const latestWeight = weightLogs.length > 0 ? `${weightLogs[weightLogs.length - 1].weight}kg` : '미기록';
      const history = weightLogs.slice(-5).map(l => `${l.log_date}: ${l.weight}kg`).join(', ') || '없음';
      const prompt = `반려견 케어 전문가로서 다음 강아지의 성장 상태를 분석하고 맞춤 케어 조언을 한국어로 제공해주세요.

이름: ${pet.name} / 견종: ${pet.breed} / 모색: ${pet.color} / 성별: ${pet.gender}
생년월일: ${pet.birth_date || '미기록'} / 나이: ${calcAge(pet.birth_date)}
최근 체중: ${latestWeight} / 체중 기록: ${history}

다음을 포함해 3~4문단으로 분석해주세요:
1. 현재 성장 단계 평가
2. 체중 추이 분석
3. 영양 및 운동 권장사항
4. 다음 케어 포인트

전문적이지만 따뜻한 톤으로 작성해주세요.`;

      const response = await genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      });
      setAiAnalysis(response.text ?? '분석 결과를 가져올 수 없습니다.');
    } catch (err) {
      console.error(err);
      setAiAnalysis('AI 분석 중 오류가 발생했습니다. API 키를 확인해주세요.');
    }
    setIsAnalyzing(false);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#315926]" />
      </div>
    );
  }

  // 반려견 등록 화면
  if (showSetup || !pet) {
    return (
      <div className="flex-1 overflow-y-auto bg-[#fcf9f4] pb-24">
        <main className="px-6 py-8 space-y-8 max-w-md mx-auto">
          <header className="space-y-2">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="w-16 h-16 bg-[#315926]/10 rounded-[28px] flex items-center justify-center">
              <PawPrint size={32} className="text-[#315926]" />
            </motion.div>
            <h2 className="text-3xl font-serif text-[#543013]">반려견 등록</h2>
            <p className="text-sm text-[#715a4a]">AI 성장 케어를 시작하려면 반려견 정보를 입력해주세요.</p>
          </header>

          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#715a4a] uppercase tracking-widest mb-2">이름 *</label>
              <input value={setupName} onChange={e => setSetupName(e.target.value)} required
                placeholder="예: 백구, 금순이"
                className="w-full p-4 bg-white border border-[#ebe8e3] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#315926]/20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#715a4a] uppercase tracking-widest mb-2">견종</label>
                <input value={setupBreed} onChange={e => setSetupBreed(e.target.value)} placeholder="진돗개"
                  className="w-full p-4 bg-white border border-[#ebe8e3] rounded-2xl text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#715a4a] uppercase tracking-widest mb-2">모색</label>
                <input value={setupColor} onChange={e => setSetupColor(e.target.value)} placeholder="백구, 황구..."
                  className="w-full p-4 bg-white border border-[#ebe8e3] rounded-2xl text-sm focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#715a4a] uppercase tracking-widest mb-2">생년월일</label>
              <input type="date" value={setupBirth} onChange={e => setSetupBirth(e.target.value)}
                className="w-full p-4 bg-white border border-[#ebe8e3] rounded-2xl text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#715a4a] uppercase tracking-widest mb-2">성별</label>
              <div className="grid grid-cols-3 gap-2">
                {['남아', '여아', '상관없음'].map(g => (
                  <button key={g} type="button" onClick={() => setSetupGender(g)}
                    className={cn(
                      'py-3 rounded-2xl text-sm font-bold border-2 transition-all',
                      setupGender === g ? 'bg-[#315926] border-[#315926] text-white' : 'bg-white border-[#ebe8e3] text-[#715a4a]'
                    )}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={setupSaving || !setupName.trim()}
              className="w-full py-4 bg-[#543013] text-white rounded-2xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 mt-4">
              {setupSaving ? <Loader2 size={18} className="animate-spin" /> : <PawPrint size={18} />}
              {setupSaving ? '등록 중...' : '시작하기'}
            </button>
          </form>
        </main>
      </div>
    );
  }

  const latestWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : null;
  const maxWeight = Math.max(...weightLogs.map(l => Number(l.weight)), latestWeight ?? 0, 5);
  const kcal = latestWeight ? Math.round(70 * Math.pow(Number(latestWeight), 0.75) * 1.6) : 2100;
  const waterMl = latestWeight ? Math.round(Number(latestWeight) * 60) : 850;
  const bowlHeight = latestWeight ? Math.round(Number(latestWeight) * 0.8 + 4) : 12;
  const points = weightLogs.length * 50;
  const rankNames = ['입문 가디언', '초급 가디언', '중급 가디언', '고급 가디언', '레전드 가디언'];
  const rankThresholds = [0, 200, 500, 1000, 2000];
  const rankIdx = rankThresholds.filter(t => points >= t).length - 1;
  const nextRank = rankThresholds[Math.min(rankIdx + 1, rankThresholds.length - 1)];

  return (
    <div className="flex-1 overflow-y-auto bg-[#fcf9f4] pb-24">
      <main className="px-6 py-8 space-y-8 max-w-md mx-auto">

        {/* Header */}
        <section className="flex justify-between items-start">
          <div className="space-y-1">
            <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              className="text-3xl font-serif text-[#543013] leading-tight">
              {pet.name}의 성장일지
            </motion.h1>
            <p className="text-xs text-[#715a4a] font-bold tracking-tight uppercase">
              {pet.breed} · {calcAge(pet.birth_date)}
            </p>
          </div>
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={() => { setPet(null); setShowSetup(true); }}
            className="p-2 rounded-full bg-white border border-[#ebe8e3] text-[#715a4a] text-xs font-bold px-3">
            변경
          </motion.button>
        </section>

        {/* AI Analysis Card */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] p-8 shadow-sm border border-[#ebe8e3] relative overflow-hidden">
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="bg-[#315926]/10 text-[#315926] px-4 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5 uppercase tracking-widest">
                <Heart size={12} fill="currentColor" /> AI Analysis
              </div>
              {latestWeight && (
                <div className="flex items-center gap-1.5 text-[#315926]">
                  <TrendingUp size={16} />
                  <span className="text-sm font-bold">{latestWeight}kg</span>
                </div>
              )}
            </div>

            {aiAnalysis ? (
              <p className="text-sm text-[#715a4a] leading-relaxed whitespace-pre-line">{aiAnalysis}</p>
            ) : (
              <div className="space-y-2">
                <h3 className="text-xl font-serif text-[#543013]">{calcAge(pet.birth_date)}</h3>
                <p className="text-sm text-[#715a4a] leading-relaxed">
                  {weightLogs.length > 0
                    ? `총 ${weightLogs.length}회 체중이 기록되었습니다. AI 분석 버튼을 눌러 맞춤 케어 가이드를 받아보세요.`
                    : '체중을 기록하면 AI가 맞춤 성장 분석을 제공합니다.'}
                </p>
              </div>
            )}

            <button onClick={handleAiAnalysis} disabled={isAnalyzing}
              className="flex items-center justify-center gap-2 py-3 bg-[#315926]/10 text-[#315926] rounded-2xl font-bold text-sm disabled:opacity-50 transition-all hover:bg-[#315926]/20">
              {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {isAnalyzing ? 'AI 분석 중...' : 'AI 성장 분석 받기'}
            </button>

            {latestWeight && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#f0ede9]">
                <div>
                  <p className="text-[10px] text-[#715a4a] font-bold uppercase tracking-widest opacity-60">현재 체중</p>
                  <p className="text-2xl font-serif text-[#543013]">{latestWeight}<span className="text-sm ml-1">kg</span></p>
                </div>
                <div>
                  <p className="text-[10px] text-[#715a4a] font-bold uppercase tracking-widest opacity-60">기록 횟수</p>
                  <p className="text-2xl font-serif text-[#315926]">{weightLogs.length}<span className="text-sm ml-1">회</span></p>
                </div>
              </div>
            )}
          </div>
          <div className="absolute right-[-40px] top-[-20px] opacity-[0.03] text-[#315926]">
            <Activity size="280" />
          </div>
        </motion.section>

        {/* Weight Chart */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#543013] uppercase tracking-widest">체중 추이</h3>
            <button onClick={() => setShowWeightForm(v => !v)}
              className="flex items-center gap-1 text-xs font-bold text-[#315926] bg-[#315926]/10 px-3 py-1.5 rounded-full">
              <Plus size={14} /> 체중 기록
            </button>
          </div>

          {weightLogs.length === 0 ? (
            <div className="bg-[#f0ede9] rounded-[32px] p-8 text-center space-y-3">
              <Activity size={40} className="text-[#715a4a]/30 mx-auto" />
              <p className="text-sm text-[#715a4a] font-medium">체중을 기록하면 성장 그래프가 표시됩니다</p>
              <button onClick={() => setShowWeightForm(true)}
                className="text-[#315926] font-bold text-sm underline">첫 체중 기록하기</button>
            </div>
          ) : (
            <div className="bg-[#f0ede9] rounded-[32px] p-8 h-56 flex items-end justify-between gap-2 relative overflow-hidden">
              {weightLogs.slice(-6).map((log, i, arr) => (
                <div key={log.id} className="flex flex-col items-center gap-2 flex-1 relative z-10 h-full justify-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(Number(log.weight) / (maxWeight * 1.2)) * 100}%` }}
                    transition={{ delay: 0.2 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                    className={cn(
                      'w-full rounded-2xl relative',
                      i === arr.length - 1 ? 'bg-gradient-to-t from-[#315926] to-[#4c7e3d]' : 'bg-[#715a4a]/20'
                    )}>
                    {i === arr.length - 1 && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#315926] text-white text-[9px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap">
                        NOW
                      </div>
                    )}
                  </motion.div>
                  <span className="text-[9px] font-black text-[#715a4a]">{log.weight}kg</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Weight Add Form */}
        <AnimatePresence>
          {showWeightForm && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-[32px] border border-[#ebe8e3] overflow-hidden">
              <form onSubmit={handleAddWeight} className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#543013]">체중 기록 추가</h4>
                  <button type="button" onClick={() => setShowWeightForm(false)}
                    className="p-1 rounded-full text-[#715a4a]"><X size={18} /></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#715a4a] mb-1">체중 (kg) *</label>
                    <input type="number" step="0.1" value={newWeight}
                      onChange={e => setNewWeight(e.target.value)} required placeholder="0.0"
                      className="w-full p-3 bg-[#fcf9f4] border border-[#ebe8e3] rounded-xl text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#715a4a] mb-1">날짜</label>
                    <input type="date" value={newWeightDate} onChange={e => setNewWeightDate(e.target.value)}
                      className="w-full p-3 bg-[#fcf9f4] border border-[#ebe8e3] rounded-xl text-sm focus:outline-none" />
                  </div>
                </div>
                <input value={newWeightNote} onChange={e => setNewWeightNote(e.target.value)}
                  placeholder="메모 (선택)"
                  className="w-full p-3 bg-[#fcf9f4] border border-[#ebe8e3] rounded-xl text-sm focus:outline-none" />
                <button type="submit" disabled={!newWeight || weightSaving}
                  className="w-full py-3 bg-[#543013] text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                  {weightSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {weightSaving ? '저장 중...' : '저장'}
                </button>
              </form>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Today's Guide */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#543013] uppercase tracking-widest">Today's Guide</h3>
            <Info size={14} className="text-[#715a4a] opacity-40" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <motion.div whileHover={{ y: -5 }}
              className="bg-white p-6 rounded-[28px] border border-[#ebe8e3] flex flex-col justify-between min-h-[160px]">
              <div className="w-10 h-10 bg-[#f9dac6] rounded-2xl flex items-center justify-center text-[#543013] rotate-3">
                <Utensils size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-[#715a4a] font-bold uppercase tracking-widest">Diet Target</p>
                <h4 className="text-2xl font-serif text-[#543013]">{kcal}<span className="text-sm ml-1">kcal</span></h4>
                <p className="text-[10px] text-[#715a4a] font-medium leading-tight">
                  {latestWeight ? `사료 ${(Number(latestWeight) * 22).toFixed(0)}g 내외` : '체중 기록 후 계산'}<br />하루 2회 급여 권장
                </p>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -5 }}
              className="bg-white p-6 rounded-[28px] border border-[#ebe8e3] flex flex-col justify-between min-h-[160px]">
              <div className="w-10 h-10 bg-[#e0f2ff] rounded-2xl flex items-center justify-center text-[#0277bd] -rotate-3">
                <Droplet size={20} />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] text-[#715a4a] font-bold uppercase tracking-widest">Hydration</p>
                <p className="text-2xl font-serif text-[#543013]">{waterMl}<span className="text-[10px] font-bold text-[#715a4a] ml-1">ml/day</span></p>
                <p className="text-[10px] text-[#715a4a]">{latestWeight ? `체중 × 60ml` : '체중 기록 후 계산'}</p>
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-[28px] border border-[#ebe8e3] space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#f0ede9] rounded-xl flex items-center justify-center text-[#543013]">
                  <Ruler size={16} />
                </div>
                <span className="text-[10px] text-[#715a4a] font-bold uppercase tracking-widest">Bowl Height</span>
              </div>
              <div>
                <p className="text-xl font-serif text-[#543013]">{bowlHeight}cm</p>
                <p className="text-[10px] text-[#715a4a] leading-tight mt-1">척추 정렬 최적 높이</p>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-[28px] border border-[#ebe8e3] space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#fff1f1] rounded-xl flex items-center justify-center text-[#ba1a1a]">
                  <Calendar size={16} />
                </div>
                <span className="text-[10px] text-[#715a4a] font-bold uppercase tracking-widest">Records</span>
              </div>
              <div>
                <p className="text-xl font-serif text-[#543013]">{weightLogs.length > 0 ? `${weightLogs.length}회 ✓` : '미기록'}</p>
                <p className="text-[10px] text-[#715a4a] leading-tight mt-1">월 1회 이상 체중 기록 권장</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Growth Rank */}
        <section className="bg-[#543013] rounded-[32px] p-8 text-white relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#6f4627] to-[#543013] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10 space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-full backdrop-blur-sm">
                  <Award size={24} className="text-[#f9dac6]" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Current Rank</p>
                  <h4 className="font-serif text-xl">{rankNames[rankIdx]}</h4>
                </div>
              </div>
              <ChevronRight size={20} className="opacity-30 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest opacity-60">
                <span>Level Progress</span>
                <span>{nextRank > points ? Math.floor((points / nextRank) * 100) : 100}%</span>
              </div>
              <div className="h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${nextRank > points ? Math.min((points / nextRank) * 100, 100) : 100}%` }}
                  transition={{ delay: 1, duration: 1.5, ease: 'anticipate' }}
                  className="h-full bg-gradient-to-r from-[#f9dac6] via-[#ffdcc5] to-white rounded-full shadow-[0_0_12px_rgba(249,218,198,0.4)]"
                />
              </div>
              <p className="text-[10px] font-bold text-white/50 text-center pt-1">
                {points}pt 획득 · 체중 기록 1회 = 50pt
              </p>
            </div>
          </div>
          <div className="absolute top-[-40px] left-[-40px] w-40 h-40 border border-white/5 rounded-full" />
          <div className="absolute top-[-60px] left-[-60px] w-60 h-60 border border-white/5 rounded-full" />
          <div className="absolute bottom-[-30px] right-[-30px] w-48 h-48 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl" />
        </section>

      </main>
    </div>
  );
}
