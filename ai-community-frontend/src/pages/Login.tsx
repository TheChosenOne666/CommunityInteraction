
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { userApi } from '../api/endpoints';
import { useAppStore } from '../store';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    userAccount: '',
    userPassword: '',
  });
  const navigate = useNavigate();
  const { setUser } = useAppStore();

  const canSubmit = formData.userAccount.length >= 4 && formData.userPassword.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (formData.userAccount.length < 4) {
      setError('账号错误，至少4位');
      return;
    }
    if (formData.userPassword.length < 8) {
      setError('密码错误，至少8位');
      return;
    }

    setLoading(true);

    userApi
      .login(formData)
      .then((response) => {
        setUser(response.data.data);
        setSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 1000);
      })
      .catch((err) => {
        setError(err.response?.data?.message || '登录失败，请检查账号密码');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError('');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">欢迎回来</h1>
            <p className="text-gray-600">登录您的社区账户，继续精彩旅程</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>登录成功！正在跳转...</span>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                账号
                <span className="ml-2 text-xs text-gray-400">至少4位</span>
              </label>
              <input
                type="text"
                name="userAccount"
                value={formData.userAccount}
                onChange={handleChange}
                required
                autoComplete="username"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="请输入账号"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码
                <span className="ml-2 text-xs text-gray-400">至少8位</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="userPassword"
                  value={formData.userPassword}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 transition-all"
                  placeholder="请输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success || !canSubmit}
              className={`w-full py-3 rounded-lg transition-colors font-medium ${
                canSubmit && !loading && !success
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>登录中...</span>
                </div>
              ) : success ? (
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>登录成功！</span>
                </div>
              ) : (
                '登录'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              还没有账号？{' '}
              <Link
                to="/register"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                立即注册
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
