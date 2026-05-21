import { useState, useEffect } from 'react';
import { Dog, BadgeCheck, ScrollText, FileEdit, Sparkles, Stars, RotateCcw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './lib/utils';
import { APP_CONFIG } from './config';

interface DogName {
  name: string;
  meaning: string;
  isBest?: boolean;
}

const INITIAL_NAMES: DogName[] = [
  { name: '백두', meaning: '용맹하고 높은 산의 기운을 담은 이름', isBest: true },
  { name: '마루', meaning: '하늘의 꼭대기' },
  { name: '가온', meaning: '세상의 중심' },
  { name: '다온', meaning: '좋은 일이 오는' },
  { name: '누리', meaning: '온 세상' },
  { name: '도담', meaning: '건강하게 자라라는 뜻' },
  { name: '바람', meaning: '자유롭고 시원한 기운' },
  { name: '솔', meaning: '소나무처럼 푸르고 곧은' },
  { name: '아라', meaning: '바다의 순우리말' },
  { name: '단우', meaning: '단단하고 듬직한' },
];

export function DogNameGenerator() {
  const [breed, setBreed] = useState('');
  const [gender, setGender] = useState('상관없음');
  const [color, setColor] = useState('백구');
  const [traits, setTraits] = useState('');
  const [suffix, setSuffix] = useState('');
  const [length, setLength] = useState('2글자');
  const [isGenerating, setIsGenerating] = useState(false);
  const [names, setNames] = useState<DogName[]>(INITIAL_NAMES);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'local' | 'cloud' | 'none'>('none');

  // Ollama 로컬 서버 상태 확인
  useEffect(() => {
    fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(1500) })
      .then(() => setSource('local'))
      .catch(() => setSource('cloud'));
  }, []);

  const buildPrompt = () => `
반려견(특히 진돗개)의 이름을 추천해주세요.
견종: ${breed || '진돗개'}
성별: ${gender}
모색: ${color}
특징: ${traits || '용맹함, 영리함'}
선호 돌림자: ${suffix || '없음'}
글자 수: ${length}

${gender === '남아' ? '남성적이고 듬직한 느낌의' : gender === '여아' ? '여성적이고 부드러운 느낌의' : '한국적인 감성이 담긴'} 아름답고 의미 있는 이름 15개를 추천해주세요.
가장 추천하는 이름 하나는 isBest: true로 표시해주세요.
JSON 배열만 반환하세요. 형식: [{ "name": "...", "meaning": "...", "isBest": boolean }, ...]
마크다운 없이 순수 JSON만 응답하세요.`.trim();

  const parseNames = (raw: string): DogName[] => {
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) return [];
      const parsed = JSON.parse(match[0]);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('JSON parsing failed:', e, raw);
      throw new Error('JSON_PARSE_ERROR');
    }
  };

  const generateViaLocal = async (): Promise<DogName[]> => {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gemma4:e2b', prompt: buildPrompt(), stream: false, format: 'json' }),
    });
    if (!res.ok) throw new Error('Ollama 응답 오류');
    const data = await res.json();
    return parseNames(data.response || '[]');
  };

  const generateViaCloud = async (): Promise<DogName[]> => {
    const apiKey = APP_CONFIG.GEMINI_API_KEY;
    if (!apiKey) throw new Error('API 키가 설정되지 않았습니다.');
    const { GoogleGenAI } = await import('@google/genai');
    const genAI = new GoogleGenAI({ apiKey });
    const res = await genAI.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: buildPrompt(),
    });
    return parseNames(res.text ?? '[]');
  };

  const generateNames = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const result = source === 'local'
        ? await generateViaLocal()
        : await generateViaCloud();
      if (result.length === 0) throw new Error('빈 결과');
      setNames(result);
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error && err.message === 'JSON_PARSE_ERROR') {
        setError('AI가 올바르지 않은 형식을 반환했습니다. 다시 시도해주세요.');
      } else {
        setError(
          source === 'local'
            ? 'Ollama 연결 실패. Ollama가 실행 중인지 확인하거나 재시도해주세요.'
            : 'AI 이름 생성 중 오류가 발생했습니다. API 키를 확인해주세요.'
        );
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-4">
      {/* AI 소스 상태 */}
      <div className={cn(
        'rounded-2xl p-3 flex items-center justify-between',
        source === 'local' ? 'bg-[#315926]/10 border border-[#315926]/20' : 'bg-[#8B5E3C]/10 border border-[#8B5E3C]/20'
      )}>
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full animate-pulse', source === 'local' ? 'bg-green-500' : 'bg-[#8B5E3C]')} />
          <p className="text-xs font-bold text-[#543013]">
            {source === 'local' ? 'Gemma 4 로컬 실행 중' : 'Gemini Cloud 사용 중'}
          </p>
        </div>
        <span className="text-[10px] text-[#715a4a] opacity-60">
          {source === 'local' ? 'Ollama 로컬' : 'Gemini API'}
        </span>
      </div>

      {/* 히어로 */}
      <section className="bg-[#f0ede8] rounded-3xl p-5 flex gap-4 items-center">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#6f4627] leading-tight mb-1.5">
            반려견을 위한<br />세상에 하나뿐인 이름
          </h1>
          <p className="text-[#51443c] text-xs mb-3">AI가 견종과 성향을 분석하여 가장 어울리는 이름을 제안합니다.</p>
          <div className="flex items-center gap-3 text-[10px] font-bold text-[#35618f]">
            <span className="flex items-center gap-1"><BadgeCheck className="w-3 h-3" /> AI 기반 추천</span>
            <span className="flex items-center gap-1"><ScrollText className="w-3 h-3" /> 한국적 감성</span>
          </div>
        </div>
        <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
          <img src="https://images.unsplash.com/photo-1591768575198-88dac53fbd0a?auto=format&fit=crop&q=80&w=200"
            className="w-full h-full object-cover" alt="White Jindo Dog" referrerPolicy="no-referrer" />
        </div>
      </section>

      {/* 입력 폼 */}
      <section className="bg-[#f0ede9]/60 p-5 rounded-3xl border border-black/5 space-y-4">
        <h2 className="text-base font-bold text-[#6f4627] flex items-center gap-2">
          <FileEdit className="w-4 h-4" /> 이름 정보 입력
        </h2>

        <div>
          <label className="block text-xs font-bold text-[#6f4627] mb-1.5">견종</label>
          <input value={breed} onChange={e => setBreed(e.target.value)}
            className="w-full bg-white rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#6f4627]/20"
            placeholder="예: 진돗개 (백구)" />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#6f4627] mb-1.5">성별</label>
          <div className="grid grid-cols-3 gap-2">
            {['남아', '여아', '상관없음'].map(g => (
              <button key={g} onClick={() => setGender(g)}
                className={cn('py-2.5 px-3 rounded-xl font-bold text-sm transition-all border-2',
                  gender === g ? 'bg-white border-[#6f4627] text-[#6f4627] shadow-md' : 'bg-white border-transparent text-stone-400 shadow-sm')}>
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#6f4627] mb-1.5">모색</label>
          <input value={color} onChange={e => setColor(e.target.value)}
            className="w-full bg-white rounded-2xl py-3 px-4 text-sm focus:outline-none"
            placeholder="예: 백구, 황구, 재구, 호구" />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#6f4627] mb-1.5">특징</label>
          <input value={traits} onChange={e => setTraits(e.target.value)}
            className="w-full bg-white rounded-2xl py-3 px-4 text-sm focus:outline-none"
            placeholder="예: 용맹함, 영리함, 충성심" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#6f4627] mb-1.5">선호 돌림자</label>
            <input value={suffix} onChange={e => setSuffix(e.target.value)}
              className="w-full bg-white rounded-2xl py-3 px-4 text-sm focus:outline-none"
              placeholder="예: '백', '강'" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#6f4627] mb-1.5">글자 수</label>
            <select value={length} onChange={e => setLength(e.target.value)}
              className="w-full bg-white rounded-2xl py-3 px-4 text-sm focus:outline-none appearance-none">
              <option>2글자</option>
              <option>3글자</option>
              <option>상관없음</option>
            </select>
          </div>
        </div>

        <button onClick={generateNames} disabled={isGenerating}
          className="w-full bg-[#6f4627] hover:bg-[#8b5e3c] text-white font-bold py-4 rounded-full flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-60">
          {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          AI 이름 생성하기
        </button>

        {error && <p className="text-red-500 text-xs text-center">{error}</p>}
      </section>

      {/* 결과 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#6f4627]">AI 추천 이름</h2>
          <span className="bg-[#a0cafe] text-[#285582] text-xs font-bold px-3 py-1 rounded-full">총 {names.length}개</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <AnimatePresence mode="popLayout">
            {names.map((item, idx) => (
              <motion.div key={item.name + idx} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: idx * 0.04 }}
                className={cn(item.isBest ? 'col-span-2' : 'col-span-1')}>
                {item.isBest ? (
                  <div className="bg-gradient-to-br from-[#6f4627] to-[#8b5e3c] p-6 rounded-3xl text-white shadow-xl flex flex-col justify-between h-36">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold tracking-widest opacity-80 uppercase">Best Pick</span>
                      <Stars className="w-4 h-4 fill-current" />
                    </div>
                    <div>
                      <p className="text-4xl font-extrabold mb-1">{item.name}</p>
                      <p className="text-xs opacity-70">{item.meaning}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-4 rounded-3xl flex flex-col items-center justify-center text-center hover:scale-105 transition-transform border-b-4 border-[#6f4627]/5 min-h-[100px]">
                    <p className="text-2xl font-bold text-[#6f4627] mb-1">{item.name}</p>
                    <p className="text-[10px] text-stone-400 line-clamp-2">{item.meaning}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="mt-5 flex justify-center">
          <button onClick={generateNames} disabled={isGenerating}
            className="bg-[#f6f3ee] text-[#6f4627] border border-[#6f4627]/20 px-8 py-3 rounded-full font-bold hover:bg-[#e5e2dd] transition-colors flex items-center gap-2 disabled:opacity-50">
            <RotateCcw className="w-4 h-4" /> 더 많은 이름 보기
          </button>
        </div>
      </section>

      <div className="flex justify-center opacity-20 pb-2">
        <Dog className="w-8 h-8 text-[#6f4627]" />
      </div>
    </div>
  );
}
