import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Heart,
  Bookmark,
  MessageSquare,
  User,
  ArrowLeft,
  Loader2,
  Edit,
  Trash2,
  Share2,
  Eye,
} from 'lucide-react';
import { postApi, thumbApi, postFavourApi, commentApi } from '../api/endpoints';
import { PostVO } from '../types';
import { useAppStore } from '../store';
import { formatDate } from '../utils';
import CommentSection from '../components/CommentSection';

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostVO | null>(null);
  const postRef = useRef<PostVO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const { user } = useAppStore();

  const loadPost = async () => {
    if (!id) {
      setError('帖子ID不存在');
      setLoading(false);
      return;
    }
    console.log('正在加载帖子详情，ID:', id);
    setLoading(true);
    setError(null);
    try {
      const [postRes, countRes] = await Promise.allSettled([
        postApi.getDetail(id),
        commentApi.getCount(id),
      ]);
      if (postRes.status === 'fulfilled') {
        setPost(postRes.value.data.data);
      } else {
        throw postRes.reason;
      }
      if (countRes.status === 'fulfilled') {
        setCommentCount(countRes.value.data.data || 0);
      }
    } catch (err: any) {
      console.error('Failed to load post:', err);
      console.error('错误详情:', err.response);
      setError(err.response?.data?.message || '帖子加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPost();
  }, [id]);

  // 同步 postRef
  useEffect(() => {
    postRef.current = post;
  }, [post]);

  const handleThumb = async () => {
    if (!user) return;
    setActionLoading(true);
    // 先读当前 post 快照（用于 API 调用方向判断）
    const currentPost = postRef.current;
    if (!currentPost) return;
    const isThumbed = currentPost.hasThumb;

    // 乐观更新
    setPost((prev) =>
      prev
        ? {
            ...prev,
            hasThumb: !isThumbed,
            thumbNum: isThumbed ? Math.max(0, prev.thumbNum - 1) : prev.thumbNum + 1,
          }
        : prev
    );

    try {
      if (isThumbed) {
        await thumbApi.undoThumb({ postId: currentPost.id });
      } else {
        await thumbApi.doThumb({ postId: currentPost.id });
      }
    } catch (error) {
      // 回滚
      console.error('Failed to toggle thumb:', error);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              hasThumb: isThumbed,
              thumbNum: isThumbed ? prev.thumbNum + 1 : Math.max(0, prev.thumbNum - 1),
            }
          : prev
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleFavour = async () => {
    if (!user) return;
    setActionLoading(true);
    const currentPost = postRef.current;
    if (!currentPost) return;
    const isFavoured = currentPost.hasFavour;

    // 乐观更新
    setPost((prev) =>
      prev
        ? {
            ...prev,
            hasFavour: !isFavoured,
            favourNum: isFavoured ? Math.max(0, prev.favourNum - 1) : prev.favourNum + 1,
          }
        : prev
    );

    try {
      if (isFavoured) {
        // Note: the backend might have a single toggle endpoint
        await postFavourApi.doFavour({ postId: currentPost.id });
      } else {
        await postFavourApi.doFavour({ postId: currentPost.id });
      }
    } catch (error) {
      console.error('Failed to toggle favour:', error);
      // 回滚
      setPost((prev) =>
        prev
          ? {
              ...prev,
              hasFavour: isFavoured,
              favourNum: isFavoured ? prev.favourNum + 1 : Math.max(0, prev.favourNum - 1),
            }
          : prev
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!post || !window.confirm('确定要删除这篇帖子吗？')) return;
    try {
      await postApi.delete({ id: post.id });
      navigate('/');
    } catch (error) {
      console.error('Failed to delete post:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <p className="text-red-700 mb-2">{error}</p>
            <p className="text-red-500 text-sm">请确认后端服务是否已启动</p>
          </div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={loadPost}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              重试
            </button>
            <Link
              to="/"
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              返回首页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">帖子不存在或已被删除</p>
          <Link
            to="/"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user && user.id === post.userId;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-gray-600 hover:text-blue-600 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>返回</span>
        </Link>

        <article className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {post.title}
                </h1>
                <div className="flex items-center space-x-3">
                  {post.user?.userAvatar ? (
                    <img
                      src={post.user.userAvatar}
                      alt={post.user.userName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {post.user?.userName || '匿名用户'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(post.createTime)}
                    </p>
                  </div>
                </div>
              </div>

              {isOwner && (
                <div className="flex items-center space-x-2">
                  <Link
                    to={`/post/${post.id}/edit`}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit className="w-5 h-5" />
                  </Link>
                  <button
                    onClick={handleDelete}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {post.tagList && post.tagList.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {post.tagList.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div
              className="prose-content text-gray-700"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            <div className="flex items-center space-x-6 mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleThumb}
                disabled={actionLoading || !user}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  post.hasThumb
                    ? 'bg-red-50 text-red-600'
                    : 'text-gray-600 hover:bg-gray-100'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Heart
                  className={`w-5 h-5 ${post.hasThumb ? 'fill-current' : ''}`}
                />
                <span>{post.thumbNum}</span>
              </button>

              <button
                onClick={handleFavour}
                disabled={actionLoading || !user}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  post.hasFavour
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-600 hover:bg-gray-100'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Bookmark
                  className={`w-5 h-5 ${post.hasFavour ? 'fill-current' : ''}`}
                />
                <span>{post.favourNum}</span>
              </button>

              <div className="flex items-center space-x-2 px-4 py-2 text-gray-600">
                <MessageSquare className="w-5 h-5" />
                <span>{commentCount}</span>
              </div>

              <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-blue-600 transition-colors">
                <Share2 className="w-5 h-5" />
                <span>分享</span>
              </button>
            </div>
          </div>
        </article>

        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <CommentSection postId={post.id} />
        </div>
      </div>
    </div>
  );
}
