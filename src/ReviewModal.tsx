import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Star, Send, User } from 'lucide-react';
import { supabase } from './supabase';

interface Review {
  id: string;
  user_nickname: string;
  user_pet_breed: string;
  user_pet_weight: number | null;
  content: string;
  rating: number;
  created_at: string;
}

interface ReviewModalProps {
  place: { id: string; name: string };
  onClose: () => void;
}

export function ReviewModal({ place, onClose }: ReviewModalProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [nickname, setNickname] = useState('');
  const [petBreed, setPetBreed] = useState('');
  const [petWeight, setPetWeight] = useState('');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const isRealPlace = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(place.id);

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReviews = async () => {
    if (!isRealPlace) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('place_id', place.id)
      .order('created_at', { ascending: false });
    if (data) setReviews(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !nickname.trim() || !isRealPlace) return;
    setSubmitting(true);
    const { error } = await supabase.from('reviews').insert([{
      place_id: place.id,
      user_nickname: nickname.trim(),
      user_pet_breed: petBreed.trim() || '진돗개',
      user_pet_weight: petWeight ? parseFloat(petWeight) : null,
      content: content.trim(),
      rating,
    }]);
    if (!error) {
      await fetchReviews();
      setShowForm(false);
      setNickname(''); setPetBreed(''); setPetWeight(''); setContent(''); setRating(5);
    }
    setSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[3000] bg-black/50 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full bg-white rounded-t-[32px] max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-[#ebe8e3]">
          <h3 className="text-xl font-sans text-[#543013]">{place.name} 리뷰</h3>
          <button onClick={onClose} className="p-2 rounded-full bg-[#f0ede9] text-[#715a4a]">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <p className="text-center text-[#715a4a] py-8">불러오는 중...</p>
          ) : !isRealPlace ? (
            <p className="text-center text-[#715a4a] text-sm py-8 opacity-60">
              샘플 장소입니다. 실제 등록된 장소에서 리뷰를 남길 수 있어요.
            </p>
          ) : reviews.length === 0 && !showForm ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-[#715a4a] font-medium">아직 리뷰가 없어요.</p>
              <p className="text-sm text-[#715a4a] opacity-60">첫 번째 리뷰를 남겨보세요!</p>
            </div>
          ) : (
            reviews.map(review => (
              <div key={review.id} className="bg-[#fcf9f4] rounded-[20px] p-4 space-y-2 border border-[#ebe8e3]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#f0ede9] flex items-center justify-center text-[#715a4a]">
                      <User size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#543013]">{review.user_nickname}</p>
                      <p className="text-[10px] text-[#715a4a]">
                        {review.user_pet_breed}{review.user_pet_weight ? ` · ${review.user_pet_weight}kg` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} size={12}
                        className={s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-[#715a4a] leading-relaxed">{review.content}</p>
              </div>
            ))
          )}

          {showForm && isRealPlace && (
            <form onSubmit={handleSubmit} className="bg-white border border-[#ebe8e3] rounded-[20px] p-5 space-y-3">
              <h4 className="font-bold text-[#543013] text-sm">리뷰 작성</h4>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} type="button" onClick={() => setRating(s)}>
                    <Star size={24} className={s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
                  </button>
                ))}
              </div>
              <input value={nickname} onChange={e => setNickname(e.target.value)}
                placeholder="닉네임 *" required
                className="w-full p-3 bg-[#fcf9f4] border border-[#ebe8e3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#315926]/20" />
              <div className="grid grid-cols-2 gap-2">
                <input value={petBreed} onChange={e => setPetBreed(e.target.value)}
                  placeholder="견종 (예: 백구)"
                  className="p-3 bg-[#fcf9f4] border border-[#ebe8e3] rounded-xl text-sm focus:outline-none" />
                <input value={petWeight} onChange={e => setPetWeight(e.target.value)}
                  placeholder="체중 (kg)" type="number" step="0.1"
                  className="p-3 bg-[#fcf9f4] border border-[#ebe8e3] rounded-xl text-sm focus:outline-none" />
              </div>
              <textarea value={content} onChange={e => setContent(e.target.value)}
                placeholder="방문 후기를 남겨주세요 *" required rows={3}
                className="w-full p-3 bg-[#fcf9f4] border border-[#ebe8e3] rounded-xl text-sm focus:outline-none resize-none" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-3 border border-[#ebe8e3] rounded-xl text-sm font-bold text-[#715a4a]">
                  취소
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-3 bg-[#543013] text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                  <Send size={14} /> {submitting ? '등록 중...' : '등록'}
                </button>
              </div>
            </form>
          )}
        </div>

        {!showForm && isRealPlace && (
          <div className="p-6 border-t border-[#ebe8e3]">
            <button onClick={() => setShowForm(true)}
              className="w-full py-4 bg-[#543013] text-white rounded-[20px] font-bold flex items-center justify-center gap-2">
              <Star size={18} /> 리뷰 작성하기
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
