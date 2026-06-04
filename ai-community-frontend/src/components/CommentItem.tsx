import { useState, useEffect } from 'react';
import { Heart, MessageCircle, ChevronDown, ChevronUp, Trash2, User } from 'lucide-react';
import { CommentVO } from '../types';
import { useAppStore } from '../store';
import { commentApi } from '../api/endpoints';
import { formatDate } from '../utils';
import CommentForm from './CommentForm';

interface CommentItemProps {
  comment: CommentVO;
  postId: string;
  onRefresh: () => void;
  isReply?: boolean;
}

export default function CommentItem({
  comment,
  postId,
  onRefresh,
  isReply = false,
}: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [allReplies, setAllReplies] = useState<CommentVO[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [thumbLoading, setThumbLoading] = useState(false);
  const [localThumbed, setLocalThumbed] = useState(comment.hasThumb);
  const [localThumbNum, setLocalThumbNum] = useState(comment.thumbNum);
  const { user } = useAppStore();

  // Sync from props when comment changes (e.g. on refresh)
  useEffect(() => {
    setLocalThumbed(comment.hasThumb);
    setLocalThumbNum(comment.thumbNum);
  }, [comment.id, comment.hasThumb, comment.thumbNum]);

  const handleThumb = async () => {
    if (!user) return;
    setThumbLoading(true);

    // 乐观更新
    const wasThumbed = localThumbed;
    if (wasThumbed) {
      setLocalThumbNum(prev => Math.max(0, prev - 1));
      setLocalThumbed(false);
    } else {
      setLocalThumbNum(prev => prev + 1);
      setLocalThumbed(true);
    }

    try {
      await commentApi.thumb({ commentId: comment.id });
    } catch (err) {
      // 回滚
      setLocalThumbNum(comment.thumbNum);
      setLocalThumbed(comment.hasThumb);
      console.error('Failed to toggle comment thumb:', err);
    } finally {
      setThumbLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('确定要删除这条评论吗？')) return;
    try {
      await commentApi.delete(comment.id);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const loadAllReplies = async () => {
    setLoadingReplies(true);
    try {
      const res = await commentApi.getReplies(comment.id, 1, 50);
      setAllReplies(res.data.data.records || []);
      setShowAllReplies(true);
    } catch (err) {
      console.error('Failed to load replies:', err);
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleReplySuccess = () => {
    setShowReplyForm(false);
    onRefresh();
  };

  const isOwner = user && user.id === comment.userId;

  return (
    <div className={`${isReply ? 'ml-12' : ''}`}>
      <div className="flex gap-3">
        {/* Avatar */}
        {comment.user?.userAvatar ? (
          <img
            src={comment.user.userAvatar}
            alt={comment.user.userName}
            className={`${isReply ? 'w-7 h-7' : 'w-9 h-9'} rounded-full object-cover flex-shrink-0`}
          />
        ) : (
          <div className={`${isReply ? 'w-7 h-7' : 'w-9 h-9'} bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0`}>
            <User className={`${isReply ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5'} text-white`} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-gray-900">
              {comment.user?.userName || '匿名用户'}
            </span>
            {comment.replyToUser && (
              <>
                <span className="text-gray-400 text-xs">回复</span>
                <span className="text-blue-600 text-sm font-medium">
                  @{comment.replyToUser.userName}
                </span>
              </>
            )}
            <span className="text-xs text-gray-400">
              {formatDate(comment.createTime)}
            </span>
          </div>

          {/* Content */}
          <p className="text-gray-700 text-sm mt-1.5 leading-relaxed whitespace-pre-wrap break-words">
            {comment.content}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={handleThumb}
              disabled={thumbLoading || !user}
              className={`flex items-center gap-1 text-xs transition-colors ${
                localThumbed
                  ? 'text-red-500'
                  : 'text-gray-400 hover:text-red-500'
              } disabled:opacity-50`}
            >
              <Heart
                className={`w-3.5 h-3.5 ${localThumbed ? 'fill-current' : ''}`}
              />
              {localThumbNum > 0 && <span>{localThumbNum}</span>}
            </button>

            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>回复</span>
            </button>

            {isOwner && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>删除</span>
              </button>
            )}
          </div>

          {/* Reply Form */}
          {showReplyForm && (
            <div className="mt-3">
              <CommentForm
                postId={postId}
                parentId={comment.id}
                replyToUserId={comment.userId}
                replyToUserName={comment.user?.userName}
                placeholder={`回复 @${comment.user?.userName}...`}
                onSuccess={handleReplySuccess}
                onCancel={() => setShowReplyForm(false)}
              />
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  onRefresh={onRefresh}
                  isReply
                />
              ))}

              {/* Show More Replies */}
              {!isReply && comment.replyCount > (comment.replies?.length || 0) && (
                <button
                  onClick={showAllReplies ? () => setShowAllReplies(false) : loadAllReplies}
                  className="ml-12 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {loadingReplies ? (
                    <span className="animate-pulse">加载中...</span>
                  ) : showAllReplies ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>收起回复</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>查看全部 {comment.replyCount} 条回复</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Expanded Replies */}
          {showAllReplies && allReplies.length > 0 && (
            <div className="mt-3 space-y-3">
              {allReplies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  onRefresh={onRefresh}
                  isReply
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
