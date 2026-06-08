
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
      length: password.length >= 8 && password.length <= 64,
      hasLetter: /[a-zA-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
    };
  };

  const validateAccount = (account: string) => {
    return {
      length: account.length >= 4 && account.length <= 20,
      format: /^[a-zA-Z0-9_]+$/.test(account),
    };
  };

  const passwordValidation = validatePassword(formData.userPassword);
  const accountValidation = validateAccount(formData.userAccount);
  const passwordsMatch = formData.userPassword === formData.checkPassword && formData.checkPassword.length > 0;
  const allValid =
    accountValidation.length && accountValidation.format &&
    passwordValidation.length && passwordValidation.hasLetter && passwordValidation.hasNumber &&
    passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!accountValidation.length) {
      setError('账号长度需在 4-20 位之间');
      return;
    }
    if (!accountValidation.format) {
      setError('账号只能包含字母、数字和下划线');
      return;
    }
    if (formData.userPassword !== formData.checkPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    if (!passwordValidation.length) {
      setError('密码长度需在 8-64 位之间');
      return;
    }
    if (!passwordValidation.hasLetter || !passwordValidation.hasNumber) {
      setError('密码需同时包含字母和数字');
      return;
    }

    setLoading(true);

    userApi
      .register(formData)
      .then((res) => {
        if (res.data.code !== 0) {
          setError(res.data.message || '注册失败，请重试');
          return;
        }
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      })
      .catch((err) => {
        setError(err.response?.data?.message || '网络错误，请重试');
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
                <span className={`ml-2 text-xs ${accountValidation.length && accountValidation.format ? 'text-green-600' : 'text-gray-400'}`}>
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
                    ? (accountValidation.length && accountValidation.format ? 'border-green-300' : 'border-red-300')
                    : 'border-gray-300'
                }`}
                placeholder="请输入账号"
              />
              {formData.userAccount.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center space-x-1">
                    {accountValidation.length ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-xs ${accountValidation.length ? 'text-green-600' : 'text-red-600'}`}>
                      4-20 位字符
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {accountValidation.format ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-xs ${accountValidation.format ? 'text-green-600' : 'text-red-600'}`}>
                      只能包含字母、数字、下划线
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码
                <span className={`ml-2 text-xs ${passwordValidation.length && passwordValidation.hasLetter && passwordValidation.hasNumber ? 'text-green-600' : 'text-gray-400'}`}>
                  8-64位，含字母和数字
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
                      ? (passwordValidation.length && passwordValidation.hasLetter && passwordValidation.hasNumber ? 'border-green-300' : 'border-red-300')
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
                      8-64 位
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {passwordValidation.hasLetter ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-xs ${passwordValidation.hasLetter ? 'text-green-600' : 'text-red-600'}`}>
                      包含字母
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {passwordValidation.hasNumber ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-xs ${passwordValidation.hasNumber ? 'text-green-600' : 'text-red-600'}`}>
                      包含数字
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
              disabled={loading || success || !allValid}
              className={`w-full py-3 rounded-lg transition-colors font-medium ${
                allValid && !loading && !success
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
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
