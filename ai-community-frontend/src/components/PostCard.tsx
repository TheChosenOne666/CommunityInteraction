import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Bookmark, MessageSquare, User, Eye } from 'lucide-react';
import { PostVO } from '../types';
import { commentApi, thumbApi } from '../api/endpoints';
import { useAppStore } from '../store';
import { formatDate, truncateText, stripHtml } from '../utils';

interface PostCardProps {
  post: PostVO;
  showActions?: boolean;
}

export default function PostCard({ post, showActions = true }: PostCardProps) {
  const [commentCount, setCommentCount] = useState(0);
  const [localThumbed, setLocalThumbed] = useState(post.hasThumb);
  const [localThumbNum, setLocalThumbNum] = useState(post.thumbNum);
  const { user } = useAppStore();

  // Sync from props when post changes
  useEffect(() => {
    setLocalThumbed(post.hasThumb);
    setLocalThumbNum(post.thumbNum);
  }, [post.id, post.hasThumb, post.thumbNum]);

  useEffect(() => {
    let cancelled = false;
    commentApi.getCount(post.id).then(res => {
      if (!cancelled) setCommentCount(res.data.data || 0);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [post.id]);

  const handleThumb = async (e: React.MouseEvent) => {
    e.preventDefault(); // 阻止 Link 导航
    e.stopPropagation();
    if (!user) return;

    // 乐观更新
    if (localThumbed) {
      setLocalThumbed(false);
      setLocalThumbNum(Math.max(0, localThumbNum - 1));
    } else {
      setLocalThumbed(true);
      setLocalThumbNum(localThumbNum + 1);
    }

    try {
      if (localThumbed) {
        await thumbApi.undoThumb({ postId: post.id });
      } else {
        await thumbApi.doThumb({ postId: post.id });
      }
    } catch (err) {
      // 回滚
      setLocalThumbed(post.hasThumb);
      setLocalThumbNum(post.thumbNum);
      console.error('点赞操作失败:', err);
    }
  };
  return (
    <Link to={`/post/${post.id}`} className="block group">
      <article className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-100 transition-all duration-300 overflow-hidden">
        <div className="p-6">
          {/* Author Row */}
          <div className="flex items-center gap-3 mb-4">
            {post.user?.userAvatar ? (
              <img
                src={post.user.userAvatar}
                alt={post.user.userName}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-100"
              />
            ) : (
              <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center ring-2 ring-blue-100">
                <User className="w-4.5 h-4.5 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {post.user?.userName || '匿名用户'}
              </p>
              <p className="text-xs text-gray-400">
                {formatDate(post.createTime)}
              </p>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-lg font-bold text-gray-900 mb-2.5 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
            {post.title}
          </h2>

          {/* Content Preview */}
          <p className="text-gray-500 text-sm mb-4 line-clamp-3 leading-relaxed">
            {truncateText(stripHtml(post.content), 160)}
          </p>

          {/* Tags & Stats */}
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1.5">
              {post.tagList && post.tagList.length > 0 ? (
                post.tagList.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-md font-medium"
                  >
                    {tag}
                  </span>
                ))
              ) : null}
            </div>

            {showActions && (
              <div className="flex items-center gap-4 text-gray-400 text-xs">
                <button
                  onClick={handleThumb}
                  className={`flex items-center gap-1 transition-colors hover:text-red-500 ${localThumbed ? 'text-red-500' : ''}`}
                  title={user ? (localThumbed ? '取消点赞' : '点赞') : '请先登录'}
                >
                  <Heart className={`w-3.5 h-3.5 ${localThumbed ? 'fill-current' : ''}`} />
                  <span>{localThumbNum}</span>
                </button>
                <div className={`flex items-center gap-1 ${post.hasFavour ? 'text-orange-500' : ''}`}>
                  <Bookmark className={`w-3.5 h-3.5 ${post.hasFavour ? 'fill-current' : ''}`} />
                  <span>{post.favourNum}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{commentCount}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
