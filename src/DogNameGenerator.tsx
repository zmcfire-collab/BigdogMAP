/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  Dog,
  BadgeCheck,
  ScrollText,
  FileEdit,
  Sparkles,
  Stars,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './lib/utils';

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
  const [names, setNames] = useState<DogName[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNames(INITIAL_NAMES);
  }, []);

  const generateNames = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const prompt = `반려견(특히 진돗개)의 이름을 추천해주세요.
      견종: ${breed || '진돗개'}
      성별: ${gender}
      모색: ${color}
      특징: ${traits || '용맹함, 영리함'}
      선호 돌림자: ${suffix || '없음'}
      글자 수: ${length}

      ${gender === '남아' ? '남성적이고 듬직한 느낌의' : gender === '여아' ? '여성적이고 부드러운 느낌의' : '한국적인 감성이 담긴'} 아름답고 의미 있는 이름 15개를 추천해주세요.
      가장 추천하는 이름 하나는 isBest: true로 표시해주세요.
      JSON 형식으로 응답해주세요. 응답은 반드시 [{ "name": "...", "meaning": "...", "isBest": boolean }, ...] 형식이어야 합니다. 마크다운 기호 없이 순수 JSON만 응답하세요.`;

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemma4:e2b',
          prompt: prompt,
          stream: false,
          format: 'json'
        }),
      });

      if (!response.ok) {
        throw new Error('Ollama 서버에 연결할 수 없습니다. Ollama가 실행 중인지, OLLAMA_ORIGINS 설정이 완료되었는지 확인해 주세요.');
      }

      const data = await response.json();
      const result = JSON.parse(data.response || '[]');
      setNames(result);
    } catch (err) {
      console.error(err);
      setError('이름 생성 중 오류가 발생했습니다. Ollama 상태와 설정을 확인해 주세요.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#fcf9f4] pb-6">
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">

        {/* Status Indicator */}
        <div className="bg-[#35618f]/10 border border-[#35618f]/20 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <p className="text-xs font-bold text-[#35618f]">Local Gemma 4 E2B 활성화됨</p>
          </div>
          <span className="text-[10px] text-[#51443c] opacity-60">Ollama API v0.20.5</span>
        </div>

        {/* Hero */}
        <section className="bg-[#f0ede8] rounded-[1.5rem] p-6 flex gap-4 items-center">
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="flex-1">
            <h1 className="text-2xl font-extrabold text-[#6f4627] leading-tight mb-2">
              반려견을 위한<br />세상에 하나뿐인 이름
            </h1>
            <p className="text-[#51443c] text-sm mb-3">AI가 견종과 성향을 분석하여 가장 어울리는 이름을 제안합니다.</p>
            <div className="flex items-center gap-3 text-xs font-semibold text-[#35618f]">
              <span className="flex items-center gap-1"><BadgeCheck className="w-3 h-3" /> AI 기반 추천</span>
              <span className="flex items-center gap-1"><ScrollText className="w-3 h-3" /> 한국적 감성</span>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg flex-shrink-0">
              <img
                src="https://images.unsplash.com/photo-1591768575198-88dac53fbd0a?auto=format&fit=crop&q=80&w=200"
                className="w-full h-full object-cover"
                alt="White Jindo Dog"
                referrerPolicy="no-referrer"
              />
            </div>
          </motion.div>
        </section>

        {/* Input Form */}
        <section className="bg-[#e5e2dd]/30 backdrop-blur-sm p-6 rounded-[1.5rem] border border-black/5 space-y-5">
          <h2 className="text-lg font-bold text-[#6f4627] flex items-center gap-2">
            <FileEdit className="w-5 h-5" /> 이름 정보 입력
          </h2>

          <div>
            <label className="block text-xs font-bold text-[#6f4627] mb-2 ml-1">견종 (Breed)</label>
            <input
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              className="w-full bg-white rounded-2xl py-3 px-5 text-sm shadow-sm border-none focus:outline-none focus:ring-2 focus:ring-[#6f4627]/20"
              placeholder="예: 진돗개 (백구)"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#6f4627] mb-2 ml-1">성별 (Gender)</label>
            <div className="grid grid-cols-3 gap-2">
              {['남아', '여아', '상관없음'].map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={cn(
                    'py-2.5 px-3 rounded-xl font-bold text-sm transition-all border-2',
                    gender === g
                      ? 'bg-white border-[#6f4627] text-[#6f4627] shadow-md'
                      : 'bg-white border-transparent text-stone-500 shadow-sm'
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#6f4627] mb-2 ml-1">모색 (Color)</label>
            <div className="grid grid-cols-3 gap-2">
              {['백구', '황구', '흑구'].map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'py-2.5 px-3 rounded-xl font-bold text-sm transition-all border-2',
                    color === c
                      ? 'bg-white border-[#6f4627] text-[#6f4627] shadow-md'
                      : 'bg-white border-transparent text-stone-500 shadow-sm'
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#6f4627] mb-2 ml-1">특징 (Characteristics)</label>
            <input
              value={traits}
              onChange={(e) => setTraits(e.target.value)}
              className="w-full bg-white rounded-2xl py-3 px-5 text-sm shadow-sm border-none focus:outline-none focus:ring-2 focus:ring-[#6f4627]/20"
              placeholder="예: 용맹함, 영리함, 충성심"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#6f4627] mb-2 ml-1">선호 돌림자</label>
              <input
                value={suffix}
                onChange={(e) => setSuffix(e.target.value)}
                className="w-full bg-white rounded-2xl py-3 px-5 text-sm shadow-sm border-none focus:outline-none focus:ring-2 focus:ring-[#6f4627]/20"
                placeholder="예: '백', '강'"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6f4627] mb-2 ml-1">글자 수</label>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className="w-full bg-white rounded-2xl py-3 px-5 text-sm shadow-sm border-none focus:outline-none focus:ring-2 focus:ring-[#6f4627]/20 appearance-none"
              >
                <option>2글자</option>
                <option>3글자</option>
                <option>상관없음</option>
              </select>
            </div>
          </div>

          <button
            onClick={generateNames}
            disabled={isGenerating}
            className="w-full bg-[#6f4627] hover:bg-[#8b5e3c] text-white font-bold py-4 rounded-full flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            AI 이름 생성하기
          </button>

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
        </section>

        {/* Results */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#6f4627]">AI 추천 이름 리스트</h2>
            <span className="bg-[#a0cafe] text-[#285582] text-xs font-bold px-3 py-1 rounded-full">
              총 {names.length}개
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence mode="popLayout">
              {names.map((item, idx) => (
                <motion.div
                  key={item.name + idx}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.04 }}
                  className={cn(item.isBest ? 'col-span-2' : 'col-span-1')}
                >
                  {item.isBest ? (
                    <div className="bg-gradient-to-br from-[#6f4627] to-[#8b5e3c] p-6 rounded-[1.5rem] text-white shadow-xl flex flex-col justify-between h-40">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold tracking-widest opacity-80 uppercase">Best Pick</span>
                        <Stars className="w-5 h-5 fill-current" />
                      </div>
                      <div>
                        <p className="text-4xl font-extrabold mb-1">{item.name}</p>
                        <p className="text-xs opacity-70">{item.meaning}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-4 rounded-[1.5rem] shadow-sm flex flex-col items-center justify-center text-center hover:scale-105 transition-transform border-b-4 border-[#6f4627]/5 min-h-[110px]">
                      <p className="text-2xl font-bold text-[#6f4627] mb-1">{item.name}</p>
                      <p className="text-[10px] text-stone-400 line-clamp-2">{item.meaning}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={generateNames}
              disabled={isGenerating}
              className="bg-[#f6f3ee] text-[#6f4627] border border-[#6f4627]/20 px-8 py-3 rounded-full font-bold hover:bg-[#e5e2dd] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              더 많은 이름 보기
            </button>
          </div>
        </section>

        {/* Bottom Feature Block */}
        <section className="bg-[#315926]/5 border border-[#315926]/10 rounded-[1.5rem] p-6 flex gap-4 items-center">
          <img
            src="https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&q=80&w=400"
            className="w-28 h-20 rounded-2xl object-cover shadow-md flex-shrink-0"
            alt="Jindo puppy"
            referrerPolicy="no-referrer"
          />
          <div>
            <span className="text-[#315926] font-bold text-xs tracking-widest uppercase">Tradition meets AI</span>
            <h3 className="text-base font-bold text-[#6f4627] mt-1 mb-2">전통과 현대의 조화</h3>
            <p className="text-xs text-[#51443c] leading-relaxed">
              국견 진돗개의 기품을 살릴 수 있도록 AI가 고문헌과 현대 트렌드 데이터를 결합하여 최적의 이름을 선별합니다.
            </p>
          </div>
        </section>

        {/* Dog icon decoration */}
        <div className="flex justify-center pb-4 opacity-20">
          <Dog className="w-10 h-10 text-[#6f4627]" />
        </div>
      </div>
    </div>
  );
}
