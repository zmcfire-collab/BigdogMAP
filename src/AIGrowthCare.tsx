import { motion } from 'framer-motion';
import { Activity, Heart, TrendingUp, Utensils, Zap, Award, ChevronRight } from 'lucide-react';
import { cn } from './lib/utils';

export function AIGrowthCare() {
  const healthData = {
    name: "백구",
    score: 92,
    summary: "백구는 지난달보다 12% 더 빠르게 성장하고 있습니다. 근육량이 완벽하게 발달하고 있으며, 현재 영양 상태가 매우 양호합니다.",
    weight: [12.5, 12.8, 13.2, 13.5, 14.1],
    points: 1250,
    nextRankPoints: 2000,
    rankName: "레벨 15 가디언"
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#fcf9f4] pb-24">
      <main className="px-6 py-8 space-y-8 max-w-md mx-auto">
        
        {/* Header Section */}
        <section className="space-y-2">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-serif text-[#543013] leading-tight"
          >
            AI 성장케어
          </motion.h1>
          <p className="text-sm text-[#715a4a] font-medium">데이터기반 백구 맞춤형 가이드</p>
        </section>

        {/* AI Health Summary Card */}
        <motion.section 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[32px] p-8 shadow-sm border border-[#ebe8e3] relative overflow-hidden"
        >
          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex justify-between items-start">
              <div className="bg-[#315926]/10 text-[#315926] px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
                <Heart size={14} fill="currentColor" /> AI 분석 완료
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[#715a4a] font-bold uppercase tracking-widest">Health Score</p>
                <p className="text-3xl font-serif text-[#543013]">{healthData.score}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-[#543013]">탁월한 성장 곡선</h3>
              <p className="text-sm text-[#715a4a] leading-relaxed">
                {healthData.summary}
              </p>
            </div>

            <button className="w-full bg-[#543013] text-white py-4 rounded-full font-bold text-sm shadow-lg active:scale-95 transition-all">
              상세 리포트 보기
            </button>
          </div>
          <div className="absolute right-[-20px] bottom-[-20px] opacity-[0.03] text-[#543013]">
             <Activity size="240" />
          </div>
        </motion.section>

        {/* Growth Chart */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#543013] flex items-center gap-2">
              <TrendingUp size={20} className="text-[#315926]" /> 성장 추이
            </h3>
            <span className="text-xs text-[#715a4a] font-bold">최근 3개월</span>
          </div>

          <div className="bg-[#f0ede9] rounded-[32px] p-6 h-48 flex items-end justify-between gap-2 relative overflow-hidden">
            {healthData.weight.map((w, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1 relative z-10">
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${(w / 15) * 100}%` }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                  className={cn(
                    "w-full rounded-2xl transition-colors",
                    i === healthData.weight.length - 1 ? "bg-[#315926]" : "bg-[#715a4a]/20"
                  )}
                />
                <span className="text-[10px] font-bold text-[#715a4a]">{w}kg</span>
              </div>
            ))}
            {/* Organic curve decoration */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-10">
              <path d="M0 100 Q 100 50 200 80 T 400 30" stroke="#543013" strokeWidth="4" fill="none" />
            </svg>
          </div>
        </section>

        {/* Today's Care Guide */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-[#543013]">오늘의 케어 가이드</h3>
          <div className="grid grid-cols-2 gap-4">
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white p-6 rounded-[24px] border border-[#ebe8e3] space-y-4"
            >
              <div className="w-10 h-10 bg-[#f9dac6] rounded-full flex items-center justify-center text-[#543013]">
                <Utensils size={20} />
              </div>
              <div>
                <p className="text-[10px] text-[#715a4a] font-bold uppercase tracking-widest">Diet</p>
                <h4 className="font-bold text-[#543013]">맞춤 권장량</h4>
                <p className="text-xs text-[#715a4a] mt-1">주니어 사료 320g</p>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white p-6 rounded-[24px] border border-[#ebe8e3] space-y-4"
            >
              <div className="w-10 h-10 bg-[#c0f0ad] rounded-full flex items-center justify-center text-[#315926]">
                <Zap size={20} />
              </div>
              <div>
                <p className="text-[10px] text-[#715a4a] font-bold uppercase tracking-widest">Exercise</p>
                <h4 className="font-bold text-[#543013]">추천 운동</h4>
                <p className="text-xs text-[#715a4a] mt-1">숲길 산책 45분</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Growth Points */}
        <section className="bg-[#543013] rounded-[32px] p-8 text-white relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Award size={24} className="text-[#f9dac6]" />
                <span className="font-serif text-lg">{healthData.rankName}</span>
              </div>
              <ChevronRight size={20} className="opacity-50" />
            </div>

            <div className="space-y-2">
              <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(healthData.points / healthData.nextRankPoints) * 100}%` }}
                  transition={{ delay: 1, duration: 1.5 }}
                  className="h-full bg-gradient-to-r from-[#f9dac6] to-white"
                />
              </div>
              <p className="text-[11px] font-bold opacity-70 text-right">
                다음 랭크까지 {healthData.nextRankPoints - healthData.points} 포인트 남음
              </p>
            </div>
          </div>
          {/* Decorative circles */}
          <div className="absolute top-[-20px] left-[-20px] w-32 h-32 bg-white/5 rounded-full" />
          <div className="absolute bottom-[-40px] right-[-40px] w-48 h-48 bg-white/5 rounded-full" />
        </section>

      </main>
    </div>
  );
}
