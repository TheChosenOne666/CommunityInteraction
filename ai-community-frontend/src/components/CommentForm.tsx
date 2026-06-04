import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useAppStore } from '../store';
import { commentApi } from '../api/endpoints';

interface CommentFormProps {
  postId: string;
  parentId?: string;
  replyToUserId?: string;
  replyToUserName?: string;
  placeholder?: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function CommentForm({
  postId,
  parentId = '0',
  replyToUserId,
  replyToUserName,
  placeholder = '写下你的评论...',
  onSuccess,
  onCancel,
}: CommentFormProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;
    setLoading(true);
    setError('');
    try {
      await commentApi.add({
        content: content.trim(),
        postId,
        parentId,
        replyToUserId,
      });
      setContent('');
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || '评论失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700 text-sm">
        <a href="/login" className="text-amber-800 font-medium underline">登录</a>后即可参与评论
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {replyToUserName && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>回复</span>
          <span className="font-medium text-blue-600">@{replyToUserName}</span>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              取消
            </button>
          )}
        </div>
      )}

      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          rows={replyToUserName ? 2 : 3}
          maxLength={2048}
          className="w-full px-4 py-3 pr-24 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm bg-gray-50 hover:bg-white focus:bg-white transition-colors"
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <span className="text-xs text-gray-400">{content.length}/2048</span>
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{loading ? '发送中' : '发送'}</span>
          </button>
        </div>
      </div>
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
    </form>
  );
}
