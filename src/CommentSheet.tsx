import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Send, User } from 'lucide-react';
import { supabase } from './supabase';

interface Comment {
  id: string;
  user_name: string;
  content: string;
  created_at: string;
}

interface CommentSheetProps {
  postId: string;
  onClose: () => void;
  onCountChange: (count: number) => void;
}

export function CommentSheet({ postId, onClose, onCountChange }: CommentSheetProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isDummy = postId.startsWith('dummy');

  useEffect(() => {
    if (isDummy) { setLoading(false); return; }
    fetchComments();
  }, []);

  const fetchComments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    const list = data ?? [];
    setComments(list);
    onCountChange(list.length);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isDummy) return;
    setSubmitting(true);
    const { error } = await supabase.from('comments').insert([{
      post_id: postId,
      user_name: userName.trim() || '진도 보호자',
      content: content.trim(),
    }]);
    if (!error) {
      setContent('');
      await fetchComments();
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
        className="w-full bg-white rounded-t-[32px] max-h-[70vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-5 border-b border-[#ebe8e3]">
          <h3 className="font-bold text-[#543013]">
            댓글{comments.length > 0 ? ` (${comments.length})` : ''}
          </h3>
          <button onClick={onClose} className="p-2 rounded-full bg-[#f0ede9] text-[#715a4a]">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isDummy ? (
            <p className="text-center text-[#715a4a] text-sm py-6 opacity-60">
              샘플 게시물입니다. 직접 업로드한 게시물에서 댓글을 사용할 수 있어요!
            </p>
          ) : loading ? (
            <p className="text-center text-[#715a4a] text-sm py-6">불러오는 중...</p>
          ) : comments.length === 0 ? (
            <p className="text-center text-[#715a4a] text-sm py-6 opacity-60">
              첫 번째 댓글을 남겨보세요!
            </p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#f0ede9] flex items-center justify-center flex-shrink-0">
                  <User size={14} className="text-[#715a4a]" />
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-[#543013]">{c.user_name}</span>
                    <span className="text-[10px] text-[#715a4a] opacity-50">
                      {new Date(c.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <p className="text-sm text-[#715a4a] mt-0.5">{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {!isDummy && (
          <form onSubmit={handleSubmit} className="p-4 border-t border-[#ebe8e3] space-y-2">
            <input value={userName} onChange={e => setUserName(e.target.value)}
              placeholder="이름 (선택)"
              className="w-full px-4 py-2 text-sm bg-[#fcf9f4] border border-[#ebe8e3] rounded-xl focus:outline-none" />
            <div className="flex gap-2">
              <input value={content} onChange={e => setContent(e.target.value)}
                placeholder="댓글을 입력하세요..." required
                className="flex-1 px-4 py-3 text-sm bg-[#fcf9f4] border border-[#ebe8e3] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#315926]/20" />
              <button type="submit" disabled={!content.trim() || submitting}
                className="w-12 h-12 bg-[#315926] text-white rounded-2xl flex items-center justify-center disabled:opacity-40 flex-shrink-0">
                <Send size={16} />
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
