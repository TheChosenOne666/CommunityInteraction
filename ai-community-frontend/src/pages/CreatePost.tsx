import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, X, Hash, Plus } from 'lucide-react';
import { postApi } from '../api/endpoints';
import { useAppStore } from '../store';

export default function CreatePost() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const slotRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null, null]);
  const navigate = useNavigate();
  const { user } = useAppStore();

  // 更新某个槽位的标签值
  const updateTag = (index: number, value: string) => {
    const cleaned = value.trim().replace(/^#/, '').slice(0, 20);
    setTags((prev) => {
      const copy = [...prev];
      if (cleaned.length > 0) {
        copy[index] = cleaned;
      } else {
        // 清空则删除
        copy.splice(index, 1);
      }
      return copy;
    });
    // 按回车后聚焦下一个空槽
    if (cleaned.length > 0 && index < 4) {
      setTimeout(() => slotRefs.current[index + 1]?.focus(), 50);
    }
  };

  // 点击某个已填标签删除
  const removeTag = (index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index));
    // 聚焦被删位置
    setTimeout(() => slotRefs.current[index]?.focus(), 50);
  };

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">请先登录后再发布帖子</p>
          <Link
            to="/login"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            前往登录
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('请输入帖子标题');
      return;
    }
    if (title.length > 80) {
      setError('标题不能超过80个字符');
      return;
    }
    if (!content.trim()) {
      setError('请输入帖子内容');
      return;
    }
    if (content.length > 8192) {
      setError('内容不能超过8192个字符');
      return;
    }

    setLoading(true);
    try {
      const response = await postApi.add({
        title: title.trim(),
        content: content.trim(),
        tags: tags.length > 0 ? tags : undefined,
      });

      const newPostId = response.data.data;
      if (!newPostId) {
        throw new Error('未获取到帖子ID');
      }

      navigate('/');
    } catch (err: any) {
      console.error('发布帖子失败:', err);
      setError(err.response?.data?.message || '发布失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回 */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-6 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回首页</span>
        </Link>

        {/* 表单卡片 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* 顶部 */}
          <div className="px-8 pt-8 pb-4 border-b border-gray-50">
            <h1 className="text-2xl font-bold text-gray-900">发布帖子</h1>
            <p className="text-sm text-gray-500 mt-1">
              分享你的技术见解、项目经验或有趣发现
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-500" />
                {error}
              </div>
            )}

            {/* 标题 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  标题 <span className="text-red-400">*</span>
                </label>
                <span className={`text-xs ${title.length > 80 ? 'text-red-400' : 'text-gray-400'}`}>
                  {title.length}/80
                </span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all outline-none text-gray-900 placeholder:text-gray-400"
                placeholder="一个吸引人的标题..."
                autoFocus
              />
            </div>

            {/* 标签 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  <Hash className="inline w-3.5 h-3.5 mr-1" />
                  标签
                </label>
                <span className="text-xs text-gray-400">{tags.length}/5</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4].map((i) => {
                  const hasValue = i < tags.length;
                  const isNext = i === tags.length;
                  const isPlaceholder = i > tags.length;

                  return (
                    <div key={i} className="relative">
                      {/* 已填标签 */}
                      {hasValue && (
                        <div className="flex items-center justify-between px-2.5 py-2 bg-blue-50 border border-blue-200 rounded-xl text-sm animate-[fadeIn_0.15s_ease-out]">
                          <span className="text-blue-700 truncate">{tags[i]}</span>
                          <button
                            type="button"
                            onClick={() => removeTag(i)}
                            className="ml-1 w-4 h-4 rounded-full hover:bg-blue-200 flex items-center justify-center shrink-0 transition-colors"
                          >
                            <X className="w-3 h-3 text-blue-500" />
                          </button>
                        </div>
                      )}

                      {/* 当前输入槽 */}
                      {isNext && (
                        <div className="flex items-center gap-1 px-2.5 py-2 bg-white border-2 border-blue-400 rounded-xl ring-2 ring-blue-500/10">
                          <Plus className="w-3 h-3 text-blue-400 shrink-0" />
                          <input
                            ref={(el) => { slotRefs.current[i] = el; }}
                            type="text"
                            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 placeholder:text-gray-300 min-w-0"
                            placeholder="标签"
                            maxLength={20}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                updateTag(i, (e.target as HTMLInputElement).value);
                              }
                            }}
                            onBlur={(e) => {
                              if (e.target.value.trim()) {
                                updateTag(i, e.target.value);
                              }
                            }}
                          />
                        </div>
                      )}

                      {/* 空白占位 */}
                      {isPlaceholder && (
                        <div className="px-2.5 py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-300 text-center">
                          <Plus className="w-3 h-3 inline" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 内容 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  内容 <span className="text-red-400">*</span>
                </label>
                <span className={`text-xs ${content.length > 8192 ? 'text-red-400' : 'text-gray-400'}`}>
                  {content.length}/8192
                </span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={14}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all outline-none text-gray-900 placeholder:text-gray-400 resize-none leading-relaxed"
                placeholder="写下你想分享的内容...&#10;&#10;支持换行分段，让排版更清晰"
              />
            </div>

            {/* 快速标签 */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-400 py-1">推荐标签：</span>
              {['Java', 'Spring Boot', '前端', 'React', 'Python', 'AI', '开源', '经验分享'].map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={tags.includes(t) || tags.length >= 5}
                  onClick={() => {
                    if (!tags.includes(t) && tags.length < 5) {
                      setTags((prev) => [...prev, t]);
                    }
                  }}
                  className="px-2.5 py-0.5 text-xs rounded-lg border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t}
                </button>
              ))}
            </div>

            {/* 提交按钮 */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-50">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim() || !content.trim()}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-blue-600/10 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>发布中...</span>
                  </>
                ) : (
                  '发布帖子'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
