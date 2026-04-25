import { motion } from 'framer-motion';
import { Activity, Heart, TrendingUp, Utensils, Award, ChevronRight, Droplet, Ruler, Calendar, Share2, Info } from 'lucide-react';
import { cn } from './lib/utils';

export function AIGrowthCare() {
  const healthData = {
    name: "백구",
    score: 92,
    age: "4개월차 (청소년기)",
    summary: "백구는 지난달보다 12% 더 빠르게 성장하고 있습니다. 골격 형성이 매우 활발하며, 진도군 표준 분포의 상위 15%에 해당하는 우수한 성장세를 보이고 있습니다.",
    prediction: {
      adultWeight: "18.5 - 20.2 kg",
      status: "정상 범위 예측"
    },
    metrics: {
        weight: [12.5, 12.8, 13.2, 13.5, 14.1],
        targetKcal: 2100,
        targetWater: 850,
        currentWater: 640,
        bowlHeight: 12.5
    },
    checkupCountdown: 14,
    points: 1250,
    nextRankPoints: 2000,
    rankName: "레벨 15 가디언"
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#fcf9f4] pb-24">
      <main className="px-6 py-8 space-y-8 max-w-md mx-auto">
        
        {/* Header Section */}
        <section className="flex justify-between items-start">
          <div className="space-y-1">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-3xl font-serif text-[#543013] leading-tight"
            >
              성장 시뮬레이션
            </motion.h1>
            <p className="text-xs text-[#715a4a] font-bold tracking-tight uppercase">Data-Driven Precision Care</p>
          </div>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full bg-white border border-[#ebe8e3] text-[#715a4a]"
          >
            <Share2 size={20} />
          </motion.button>
        </section>

        {/* AI Health Summary Card */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] p-8 shadow-sm border border-[#ebe8e3] relative overflow-hidden"
        >
          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div className="bg-[#315926]/10 text-[#315926] px-4 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5 uppercase tracking-widest">
                <Heart size={12} fill="currentColor" /> Live Analysis
              </div>
              <div className="flex items-center gap-1.5 text-[#315926]">
                <TrendingUp size={16} />
                <span className="text-sm font-bold">상위 15%</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-serif text-[#543013]">{healthData.age}</h3>
              <p className="text-sm text-[#715a4a] leading-relaxed font-medium">
                {healthData.summary}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#f0ede9]">
                <div>
                    <p className="text-[10px] text-[#715a4a] font-bold uppercase tracking-widest opacity-60">종합 성장 지수</p>
                    <p className="text-2xl font-serif text-[#543013]">{healthData.score}<span className="text-sm ml-1">pts</span></p>
                </div>
                <div>
                    <p className="text-[10px] text-[#715a4a] font-bold uppercase tracking-widest opacity-60">예상 성견 체중</p>
                    <p className="text-lg font-bold text-[#315926]">{healthData.prediction.adultWeight}</p>
                </div>
            </div>
          </div>
          <div className="absolute right-[-40px] top-[-20px] opacity-[0.03] text-[#315926]">
             <Activity size="280" />
          </div>
        </motion.section>

        {/* Growth Chart */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#543013] uppercase tracking-widest flex items-center gap-2">
               성장 추이
            </h3>
            <span className="text-[10px] text-[#715a4a] font-bold bg-[#f0ede9] px-2 py-1 rounded-md uppercase">Latest 3 Months</span>
          </div>

          <div className="bg-[#f0ede9] rounded-[32px] p-8 h-56 flex items-end justify-between gap-4 relative overflow-hidden">
            {healthData.metrics.weight.map((w, i) => (
              <div key={i} className="flex flex-col items-center gap-3 flex-1 relative z-10 h-full justify-end">
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${(w / 18) * 100}%` }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 1, ease: "easeOut" }}
                  className={cn(
                    "w-full rounded-2xl relative group",
                    i === healthData.metrics.weight.length - 1 ? "bg-gradient-to-t from-[#315926] to-[#4c7e3d]" : "bg-[#715a4a]/10"
                  )}
                >
                    {i === healthData.metrics.weight.length - 1 && (
                         <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#315926] text-white text-[10px] font-bold px-2 py-1 rounded-md">
                            NOW
                         </div>
                    )}
                </motion.div>
                <span className="text-[10px] font-black text-[#715a4a]">{w}kg</span>
              </div>
            ))}
            {/* Background dashed line */}
            <div className="absolute left-0 right-0 border-t border-dashed border-[#715a4a]/10" style={{ bottom: '40%' }} />
            <div className="absolute left-0 right-0 border-t border-dashed border-[#715a4a]/10" style={{ bottom: '70%' }} />
          </div>
        </section>

        {/* Today's Precision Care */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#543013] uppercase tracking-widest">Today's Precision Guide</h3>
            <Info size={14} className="text-[#715a4a] opacity-40" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             {/* Diet Card */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white p-6 rounded-[28px] border border-[#ebe8e3] flex flex-col justify-between min-h-[160px]"
            >
              <div className="w-10 h-10 bg-[#f9dac6] rounded-2xl flex items-center justify-center text-[#543013] rotate-3">
                <Utensils size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-[#715a4a] font-bold uppercase tracking-widest">Diet Target</p>
                <h4 className="text-2xl font-serif text-[#543013]">{healthData.metrics.targetKcal}<span className="text-sm ml-1">kcal</span></h4>
                <p className="text-[10px] text-[#715a4a] font-medium leading-tight">주니어 전용 사료 345g<br/>하루 2회 급여 권장</p>
              </div>
            </motion.div>

            {/* Water Card */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white p-6 rounded-[28px] border border-[#ebe8e3] flex flex-col justify-between min-h-[160px]"
            >
              <div className="w-10 h-10 bg-[#e0f2ff] rounded-2xl flex items-center justify-center text-[#0277bd] -rotate-3">
                <Droplet size={20} />
              </div>
              <div className="space-y-2">
                <div>
                   <p className="text-[10px] text-[#715a4a] font-bold uppercase tracking-widest">Hydration</p>
                   <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-serif text-[#543013]">{healthData.metrics.currentWater}</span>
                        <span className="text-[10px] font-bold text-[#715a4a]">/ {healthData.metrics.targetWater}ml</span>
                   </div>
                </div>
                <div className="h-1.5 bg-[#f0ede9] rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(healthData.metrics.currentWater / healthData.metrics.targetWater) * 100}%` }}
                        className="h-full bg-[#0277bd]"
                    />
                </div>
              </div>
            </motion.div>
          </div>

          {/* New Physical Care Row */}
          <div className="grid grid-cols-2 gap-4">
               {/* Bowl Height Card */}
                <motion.div 
                whileHover={{ y: -5 }}
                className="bg-white p-6 rounded-[28px] border border-[#ebe8e3] space-y-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#f0ede9] rounded-xl flex items-center justify-center text-[#543013]">
                            <Ruler size={16} />
                        </div>
                        <span className="text-[10px] text-[#715a4a] font-bold uppercase tracking-widest">Bowl Height</span>
                    </div>
                    <div>
                        <p className="text-xl font-serif text-[#543013]">{healthData.metrics.bowlHeight}cm</p>
                        <p className="text-[10px] text-[#715a4a] leading-tight mt-1">척추 정렬 및 소화기능<br/>개선 최적 높이</p>
                    </div>
                </motion.div>

                {/* Checkup Card */}
                <motion.div 
                whileHover={{ y: -5 }}
                className="bg-white p-6 rounded-[28px] border border-[#ebe8e3] space-y-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#fff1f1] rounded-xl flex items-center justify-center text-[#ba1a1a]">
                            <Calendar size={16} />
                        </div>
                        <span className="text-[10px] text-[#715a4a] font-bold uppercase tracking-widest">Check-up</span>
                    </div>
                    <div>
                        <p className="text-xl font-serif text-[#543013]">D-{healthData.checkupCountdown}</p>
                        <p className="text-[10px] text-[#715a4a] leading-tight mt-1">2차 정기 검진 및<br/>예방 접종 예정</p>
                    </div>
                </motion.div>
          </div>
        </section>

        {/* Growth Points Rank */}
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
                   <h4 className="font-serif text-xl">{healthData.rankName}</h4>
                </div>
              </div>
              <ChevronRight size={20} className="opacity-30 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest opacity-60">
                 <span>Level Progress</span>
                 <span>{Math.floor((healthData.points / healthData.nextRankPoints) * 100)}%</span>
              </div>
              <div className="h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(healthData.points / healthData.nextRankPoints) * 100}%` }}
                  transition={{ delay: 1, duration: 1.5, ease: "anticipate" }}
                  className="h-full bg-gradient-to-r from-[#f9dac6] via-[#ffdcc5] to-white rounded-full shadow-[0_0_12px_rgba(249,218,198,0.4)]"
                />
              </div>
              <p className="text-[10px] font-bold text-white/50 text-center pt-1">
                다음 랭크까지 {healthData.nextRankPoints - healthData.points} 포인트를 더 모으세요
              </p>
            </div>
          </div>
          
          {/* Subtle nature-inspired circular patterns */}
          <div className="absolute top-[-40px] left-[-40px] w-40 h-40 border border-white/5 rounded-full" />
          <div className="absolute top-[-60px] left-[-60px] w-60 h-60 border border-white/5 rounded-full" />
          <div className="absolute bottom-[-30px] right-[-30px] w-48 h-48 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl" />
        </section>

      </main>
    </div>
  );
}
