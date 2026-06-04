import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Flame, Clock, Plus, Compass, MessageCircle } from 'lucide-react';
import { postApi } from '../api/endpoints';
import { PostVO } from '../types';
import PostList from '../components/PostList';
import { useAppStore } from '../store';

type SortTab = 'latest' | 'hot' | 'trending';

export default function Home() {
  const [posts, setPosts] = useState<PostVO[]>([]);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState<SortTab>('latest');
  const [error, setError] = useState<string | null>(null);
  const { user } = useAppStore();

  const loadPosts = async (page = 1, append = false, tab: SortTab = activeTab) => {
    setLoading(true);
    setError(null);
    try {
      let sortField = 'createTime';
      let sortOrder = 'desc';
      if (tab === 'hot') {
        sortField = 'thumbNum';
      } else if (tab === 'trending') {
        sortField = 'favourNum';
      }

      const response = await postApi.getList({
        current: page,
        pageSize: 10,
        sortField,
        sortOrder: sortField === 'createTime' ? 'desc' : 'desc',
      });
      const newPosts = response.data.data.records || [];
      setPosts(append ? [...posts, ...newPosts] : newPosts);
      setHasMore(newPosts.length === 10);
      setCurrent(page);
    } catch (err: any) {
      console.error('加载帖子失败:', err);
      if (err.message?.includes('Network Error') || err.code === 'ERR_NETWORK') {
        setError('无法连接到服务器，请确保后端服务已启动！');
      } else {
        setError(err.response?.data?.message || '加载帖子失败');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts(1, false, activeTab);
  }, [activeTab]);

  const handleLoadMore = () => {
    loadPosts(current + 1, true);
  };

  const tabs: { id: SortTab; label: string; icon: typeof TrendingUp }[] = [
    { id: 'latest', label: '最新', icon: Clock },
    { id: 'hot', label: '热门', icon: Flame },
    { id: 'trending', label: '推荐', icon: TrendingUp },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-blue-50/50 via-white to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-8 py-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Hero Banner */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 rounded-2xl p-8 mb-8 text-white shadow-lg shadow-blue-500/20">
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <MessageCircle className="w-7 h-7 text-white/90" />
                欢迎来到小楼社区
              </h1>
              <p className="text-blue-100 text-lg mb-6">
                分享技术知识，交流开发经验，与志同道合的开发者一起成长
              </p>
              {user ? (
                <Link
                  to="/post/create"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl text-sm font-medium border border-white/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>发布你的第一篇帖子</span>
                </Link>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    to="/register"
                    className="px-5 py-2.5 bg-white text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-50 transition-all shadow-sm"
                  >
                    立即注册
                  </Link>
                  <Link
                    to="/login"
                    className="px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl text-sm font-medium border border-white/20 transition-all"
                  >
                    已有账号？登录
                  </Link>
                </div>
              )}
            </div>

            {/* Sort Tabs */}
            <div className="flex items-center gap-1 mb-6 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setPosts([]);
                      setCurrent(1);
                    }}
                    className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Post List */}
            <PostList
              posts={posts}
              loading={loading && posts.length === 0}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
            />

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mt-6">
                <div className="flex items-center gap-2">
                  <span>{error}</span>
                  <button
                    onClick={() => loadPosts(1, false)}
                    className="text-red-600 hover:text-red-800 underline text-sm"
                  >
                    重试
                  </button>
                </div>
                <div className="mt-1 text-sm text-red-500">
                  请确认后端服务已启动在 http://localhost:8080
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block w-80 shrink-0">
            {/* Quick Actions Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-600" />
                <span>快捷入口</span>
              </h3>
              <div className="space-y-2">
                <Link
                  to="/post/create"
                  className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all group"
                >
                  <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">发布帖子</p>
                    <p className="text-xs text-gray-500">分享你的技术见解</p>
                  </div>
                </Link>
                <Link
                  to="/search"
                  className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all group"
                >
                  <div className="w-9 h-9 bg-gray-200 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Compass className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">探索发现</p>
                    <p className="text-xs text-gray-500">浏览更多精彩内容</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Hot Tags Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-96">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span>热门话题</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {['Java', 'Spring Boot', 'React', 'Vue', 'TypeScript', 'Python', 'AI', '数据库', '微服务', '面试'].map(
                  (tag) => (
                    <Link
                      key={tag}
                      to={`/search?q=${encodeURIComponent(tag)}`}
                      className="px-3 py-1.5 bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 text-xs rounded-lg transition-all border border-gray-100 hover:border-blue-200"
                    >
                      {tag}
                    </Link>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
