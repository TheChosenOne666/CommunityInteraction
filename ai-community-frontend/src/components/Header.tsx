import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Plus,
  User,
  Search,
  Menu,
  X,
  LogOut,
  TrendingUp,
  Flame,
  Clock,
} from 'lucide-react';
import { useAppStore } from '../store';
import { userApi } from '../api/endpoints';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await userApi.logout();
      logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
    setIsMenuOpen(false);
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-lg border-b border-gray-100 shadow-sm'
          : 'bg-white border-b border-gray-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors shrink-0"
          >
            <img src="/favicon.svg" className="w-9 h-9 rounded-xl shadow-md" alt="小楼社区" />
            <span className="hidden sm:inline">小楼社区</span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                location.pathname === '/'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>首页</span>
            </Link>
          </div>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-sm mx-8">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索帖子..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all"
              />
            </form>
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to="/post/create"
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/30 transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>发布</span>
                </Link>

                <div className="relative group">
                  <button className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-colors">
                    {user.userAvatar ? (
                      <img
                        src={user.userAvatar}
                        alt={user.userName}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-100"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-700">
                      {user.userName}
                    </span>
                  </button>

                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden">
                    <div className="py-2">
                      <div className="px-4 py-3 border-b border-gray-50">
                        <p className="text-sm font-medium text-gray-900">
                          {user.userName}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {user.userProfile || '社区成员'}
                        </p>
                      </div>
                      <Link
                        to="/profile"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <User className="w-4 h-4 text-gray-400" />
                        <span>个人中心</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>退出登录</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm shadow-blue-500/20 transition-all"
                >
                  注册
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg animate-fade-in-up">
          <div className="px-4 py-4 space-y-3">
            <form onSubmit={handleSearch} className="mb-2">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索帖子..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
            </form>

            <Link
              to="/"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 text-sm"
              onClick={() => setIsMenuOpen(false)}
            >
              <Home className="w-5 h-5" />
              <span>首页</span>
            </Link>

            {user ? (
              <>
                <Link
                  to="/post/create"
                  className="flex items-center gap-2 px-3 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Plus className="w-5 h-5" />
                  <span>发布帖子</span>
                </Link>
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 text-sm"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="w-5 h-5" />
                  <span>个人中心</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 w-full text-sm"
                >
                  <LogOut className="w-5 h-5" />
                  <span>退出登录</span>
                </button>
              </>
            ) : (
              <div className="flex gap-2 pt-1">
                <Link
                  to="/login"
                  className="flex-1 px-4 py-2.5 text-center text-sm text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className="flex-1 px-4 py-2.5 text-center text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                  onClick={() => setIsMenuOpen(false)}
                >
                  注册
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
