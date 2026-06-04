
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { userApi } from '../api/endpoints';

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    userAccount: '',
    userPassword: '',
    checkPassword: '',
  });
  const navigate = useNavigate();

  const validatePassword = (password: string) => {
    return {
      length: password.length >= 8,
    };
  };

  const passwordValidation = validatePassword(formData.userPassword);
  const passwordsMatch = formData.userPassword === formData.checkPassword && formData.checkPassword.length > 0;
  const accountValid = formData.userAccount.length >= 4;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (formData.userPassword !== formData.checkPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (formData.userAccount.length < 4) {
      setError('用户账号过短，至少4位');
      return;
    }
    if (formData.userPassword.length < 8) {
      setError('用户密码过短，至少8位');
      return;
    }

    setLoading(true);

    userApi
      .register(formData)
      .then(() => {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      })
      .catch((err) => {
        setError(err.response?.data?.message || '注册失败，请重试');
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">创建账号</h1>
            <p className="text-gray-600">加入我们的社区，分享精彩内容</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>注册成功！正在跳转到登录页...</span>
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
                <span className={`ml-2 text-xs ${accountValid ? 'text-green-600' : 'text-gray-400'}`}>
                  至少4位
                </span>
              </label>
              <input
                type="text"
                name="userAccount"
                value={formData.userAccount}
                onChange={handleChange}
                required
                autoComplete="username"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  formData.userAccount.length > 0 
                    ? (accountValid ? 'border-green-300' : 'border-red-300')
                    : 'border-gray-300'
                }`}
                placeholder="请输入账号"
              />
              {formData.userAccount.length > 0 && (
                <div className="mt-2 flex items-center space-x-1">
                  {accountValid ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-xs ${accountValid ? 'text-green-600' : 'text-red-600'}`}>
                    {accountValid ? '账号长度符合要求' : '账号太短，至少需要4位'}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码
                <span className={`ml-2 text-xs ${passwordValidation.length ? 'text-green-600' : 'text-gray-400'}`}>
                  至少8位
                </span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="userPassword"
                  value={formData.userPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 transition-all ${
                    formData.userPassword.length > 0 
                      ? (passwordValidation.length ? 'border-green-300' : 'border-red-300')
                      : 'border-gray-300'
                  }`}
                  placeholder="请输入密码（至少8位）"
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
              {formData.userPassword.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center space-x-1">
                    {passwordValidation.length ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-xs ${passwordValidation.length ? 'text-green-600' : 'text-red-600'}`}>
                      密码长度至少8位
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                确认密码
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="checkPassword"
                  value={formData.checkPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 transition-all ${
                    formData.checkPassword.length > 0 
                      ? (passwordsMatch ? 'border-green-300' : 'border-red-300')
                      : 'border-gray-300'
                  }`}
                  placeholder="请再次输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {formData.checkPassword.length > 0 && (
                <div className="mt-2 flex items-center space-x-1">
                  {passwordsMatch ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-xs ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordsMatch ? '两次输入的密码一致' : '两次输入的密码不一致'}
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>注册中...</span>
                </div>
              ) : success ? (
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>注册成功！</span>
                </div>
              ) : (
                '注册'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              已有账号？{' '}
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                立即登录
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
