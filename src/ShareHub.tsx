import { motion } from 'framer-motion';
import { Share2, Download, Copy, Check, Heart, MessageCircle, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { cn } from './lib/utils';

export function ShareHub() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // fallback
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async (platform: string) => {
    const shareData = {
      title: '대견할지도 — 진돗개 친화 장소 지도',
      text: '진돗개와 함께 가기 좋은 장소를 발견했어요! 🐾',
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // 사용자가 취소하거나 지원 안 되면 플랫폼 URL로 이동
      }
    }

    const fallbacks: Record<string, string> = {
      Instagram: 'https://www.instagram.com/',
      TikTok: 'https://www.tiktok.com/',
      Youtube: 'https://www.youtube.com/',
    };
    window.open(fallbacks[platform] ?? window.location.href, '_blank');
  };

  return (
    <div className="space-y-8 py-4">
      <section className="bg-white rounded-[32px] p-8 border border-[#ebe8e3] shadow-sm space-y-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
             <h3 className="text-xl font-sans text-[#543013]">멀티 채널 공유</h3>
             <p className="text-xs text-[#715a4a] leading-relaxed">한 번의 기록으로 모든 소셜 채널에<br/>우리 아이의 일상을 공유하세요.</p>
          </div>
          <div className="w-12 h-12 bg-[#315926]/10 rounded-2xl flex items-center justify-center text-[#315926]">
             <Share2 size={24} />
          </div>
        </div>

        {/* Channel Selection */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <Instagram />, label: 'Instagram', color: 'bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]' },
            { icon: <TikTok />, label: 'TikTok', color: 'bg-black' },
            { icon: <Youtube />, label: 'Shorts', color: 'bg-[#ff0000]' }
          ].map((channel, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleShare(channel.label)}
              className="flex flex-col items-center gap-2 p-4 rounded-[24px] bg-[#fcf9f4] border border-[#ebe8e3] group transition-all hover:bg-white hover:shadow-md"
            >
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm", channel.color)}>
                 {channel.icon}
              </div>
              <span className="text-[10px] font-bold text-[#715a4a]">{channel.label}</span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Preview Section */}
      <section className="space-y-4">
        <h4 className="text-sm font-bold text-[#543013] uppercase tracking-widest px-1">TikTok Export Preview</h4>
        <div className="relative aspect-[9/16] bg-black rounded-[40px] overflow-hidden shadow-2xl border-[6px] border-[#ebe8e3]">
            <img 
                src="https://images.unsplash.com/photo-1591768575198-88dac53fbd0a?auto=format&fit=crop&q=80&w=600" 
                className="w-full h-full object-cover opacity-80"
                alt="Preview"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            
            {/* Mock TikTok Overlay */}
            <div className="absolute right-4 bottom-32 space-y-6 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-white/20" />
                <div className="space-y-1 flex flex-col items-center">
                    <Heart size={28} className="text-white fill-white" />
                    <span className="text-white text-[10px] font-bold">12.5k</span>
                </div>
                <div className="space-y-1 flex flex-col items-center">
                    <MessageCircle size={28} className="text-white fill-white" />
                    <span className="text-white text-[10px] font-bold">482</span>
                </div>
                <Share2 size={28} className="text-white fill-white" />
            </div>

            <div className="absolute left-6 bottom-12 space-y-2">
                <h5 className="text-white font-bold">@baekgu_dad</h5>
                <p className="text-xs text-white/90 leading-tight">금순이의 첫 마당 나들이 🌿<br/>#진돗개 #대견할지도 #AIGrowth</p>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center">
                        <Sparkles size={10} className="text-white" />
                    </div>
                    <span className="text-white text-[10px] italic">Original Sound - Jindo Music</span>
                </div>
            </div>
        </div>
      </section>

      {/* Export Options */}
      <section className="grid grid-cols-2 gap-4 pb-12">
          <button
            onClick={handleCopy}
            className="bg-white p-4 rounded-[24px] border border-[#ebe8e3] flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all text-[#715a4a] hover:text-[#543013]"
          >
            {copied ? <Check className="text-[#315926]" /> : <Copy />}
            <span className="text-xs font-bold">{copied ? '복사됨!' : '링크 복사'}</span>
          </button>
          <button
            onClick={() => handleShare('')}
            className="bg-[#543013] p-4 rounded-[24px] flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all text-[#f9dac6] hover:bg-[#6f4627]"
          >
            <Download />
            <span className="text-xs font-bold text-white">공유하기</span>
          </button>
      </section>
    </div>
  );
}

const TikTok = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.59-1.01V14.2c.03 4.03-2.21 7.72-5.9 9.31-3.69 1.59-8.1.53-10.74-2.53C-.1 17.8-.3 13.04 1.43 9.4 3.16 5.76 7.42 3.63 11.38 4.6v4.17c-2.34-.54-4.83.33-6.19 2.37-1.36 2.04-1.29 4.79.16 6.74 1.45 1.95 4.13 2.78 6.47 2.01 2.34-.77 3.96-3.14 3.93-5.61V.02z"/></svg>;
const Instagram = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>;
const Youtube = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.612 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>;
