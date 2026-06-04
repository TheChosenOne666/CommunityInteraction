import { useState, useEffect } from 'react';
import { MessageCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { CommentVO } from '../types';
import { commentApi } from '../api/endpoints';
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';

interface CommentSectionProps {
  postId: string;
}

export default function CommentSection({ postId }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentVO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const loadComments = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await commentApi.getList({
        postId,
        current: page,
        pageSize,
      });
      setComments(res.data.data.records || []);
      setTotal(res.data.data.total || 0);
      setCurrent(page);
    } catch (err: any) {
      console.error('Failed to load comments:', err);
      setError(err.response?.data?.message || '加载评论失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments(1);
  }, [postId]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="w-5 h-5 text-gray-700" />
        <h2 className="text-lg font-semibold text-gray-900">
          评论 {total > 0 && <span className="text-blue-600">({total})</span>}
        </h2>
      </div>

      {/* Comment Form */}
      <div className="mb-8">
        <CommentForm
          postId={postId}
          onSuccess={() => loadComments(1)}
        />
      </div>

      {/* Comment List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500 mb-3">{error}</p>
          <button
            onClick={() => loadComments(current)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            重试
          </button>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-16">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">暂无评论，快来抢沙发吧！</p>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postId={postId}
                onRefresh={() => loadComments(current)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={() => loadComments(current - 1)}
                disabled={current <= 1}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>上一页</span>
              </button>
              <span className="text-sm text-gray-500">
                {current} / {totalPages}
              </span>
              <button
                onClick={() => loadComments(current + 1)}
                disabled={current >= totalPages}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span>下一页</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
