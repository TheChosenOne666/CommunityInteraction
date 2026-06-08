import { useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Loader2, X, Hash, Plus, ImagePlus, Trash2,
  Upload, Crop, ZoomIn, ZoomOut, RotateCcw, Check,
} from 'lucide-react';
import Cropper, { Area } from 'react-easy-crop';
import { postApi, fileApi } from '../api/endpoints';
import { useAppStore } from '../store';

/** 裁切比例：16:9 */
const COVER_ASPECT = 16 / 9;

interface CropState {
  imageUrl: string;
  crop: { x: number; y: number };
  zoom: number;
}

/**
 * 根据裁切区域生成裁剪后的图片文件（canvas）
 */
function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<File> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context unavailable')); return; }

      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height,
      );
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], 'cover.jpg', { type: 'image/jpeg' }));
        } else {
          reject(new Error('Canvas export failed'));
        }
      }, 'image/jpeg', 0.92);
    };
    image.onerror = () => reject(new Error('Image load failed'));
  });
}

export default function CreatePost() {
  const navigate = useNavigate();
  const { user } = useAppStore();

  // ──── 帖子表单 ────
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const slotRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null, null]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ──── 封面图 ────
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  // ──── 裁剪弹窗 ────
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // ──── 加载 / 错误 ────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ──── 标签操作 ────
  const updateTag = (index: number, value: string) => {
    const cleaned = value.trim().replace(/^#/, '').slice(0, 20);
    setTags((prev) => {
      const copy = [...prev];
      if (cleaned.length > 0) { copy[index] = cleaned; }
      else { copy.splice(index, 1); }
      return copy;
    });
    if (cleaned.length > 0 && index < 4) {
      setTimeout(() => slotRefs.current[index + 1]?.focus(), 50);
    }
  };
  const removeTag = (index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index));
    setTimeout(() => slotRefs.current[index]?.focus(), 50);
  };

  // ──── 封面选择 → 打开裁剪 ────
  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) { setError('封面图片仅支持 jpg/jpeg/png/webp 格式'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('封面图片大小不能超过 5MB'); return; }

    setError('');
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setCroppedAreaPixels(null);

    const reader = new FileReader();
    reader.onload = () => { setCropImageUrl(reader.result as string); setCropOpen(true); };
    reader.readAsDataURL(file);
  };

  /** 裁剪完成回调 */
  const onCropComplete = useCallback(
    (_croppedArea: Area, p: Area) => setCroppedAreaPixels(p),
    [],
  );

  /** 确认裁剪 */
  const handleCropConfirm = async () => {
    if (!cropImageUrl || !croppedAreaPixels) return;
    try {
      const croppedFile = await getCroppedImg(cropImageUrl, croppedAreaPixels);
      const previewUrl = URL.createObjectURL(croppedFile);
      // 清理旧预览
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      setCoverFile(croppedFile);
      setCoverPreview(previewUrl);
      setCoverUrl(null);
      setCropOpen(false);
      // 清理裁剪相关 URL
      setCropImageUrl(null);
    } catch {
      setError('裁剪图片失败，请重试');
    }
  };

  /** 取消裁剪 */
  const handleCropCancel = () => {
    setCropOpen(false);
    setCropImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /** 移除封面 */
  const handleRemoveCover = () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(null);
    setCoverPreview(null);
    setCoverUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ──── 发布 ────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('请输入帖子标题'); return; }
    if (title.length > 80) { setError('标题不能超过80个字符'); return; }
    if (!content.trim()) { setError('请输入帖子内容'); return; }
    if (content.length > 8192) { setError('内容不能超过8192个字符'); return; }

    setLoading(true);
    let uploadedCoverUrl = coverUrl;
    try {
      if (coverFile && !uploadedCoverUrl) {
        setUploadingCover(true);
        try {
          const uploadRes = await fileApi.upload(coverFile, 'post_cover');
          uploadedCoverUrl = uploadRes.data.data;
          setCoverUrl(uploadedCoverUrl);
        } catch {
          setError('封面图片上传失败，请重试');
          setUploadingCover(false);
          setLoading(false);
          return;
        }
        setUploadingCover(false);
      }
      const response = await postApi.add({
        title: title.trim(),
        content: content.trim(),
        coverImg: uploadedCoverUrl || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      if (!response.data.data) throw new Error('未获取到帖子ID');
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '发布失败，请重试');
    } finally {
      setLoading(false);
      setUploadingCover(false);
    }
  };

  // ──── 未登录 ────
  if (!user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">请先登录后再发布帖子</p>
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">前往登录</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-6 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /><span>返回首页</span>
        </Link>

        {/* ========== 裁剪弹窗 ========== */}
        {cropOpen && cropImageUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
              {/* 头部 */}
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crop className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-gray-900">裁剪封面图片</span>
                  <span className="text-xs text-gray-400 ml-1">16:9</span>
                </div>
                <button onClick={handleCropCancel}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 裁剪区域 */}
              <div className="relative w-full h-[400px] bg-gray-900">
                <Cropper
                  image={cropImageUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={COVER_ASPECT}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>

              {/* 底部控制栏 */}
              <div className="px-5 py-3 border-t border-gray-100">
                <div className="flex items-center justify-between gap-4">
                  {/* 缩放控制 */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
                      disabled={zoom <= 1}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30 transition-colors"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.01}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-24 h-1 accent-blue-600"
                    />
                    <button
                      onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                      disabled={zoom >= 3}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30 transition-colors"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setZoom(1); setCrop({ x: 0, y: 0 }); }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors ml-1"
                      title="重置"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 确认按钮 */}
                  <div className="flex items-center gap-2">
                    <button onClick={handleCropCancel}
                      className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                      取消
                    </button>
                    <button onClick={handleCropConfirm}
                      className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/10 flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      确认裁剪
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== 表单卡片 ========== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 pt-8 pb-4 border-b border-gray-50">
            <h1 className="text-2xl font-bold text-gray-900">发布帖子</h1>
            <p className="text-sm text-gray-500 mt-1">分享你的技术见解、项目经验或有趣发现</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-500" />{error}
              </div>
            )}

            {/* 封面图片 */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                <ImagePlus className="inline w-3.5 h-3.5 mr-1" />
                封面图片 <span className="text-gray-400 font-normal">（可选）</span>
              </label>
              {coverPreview ? (
                <div className="relative w-full max-w-md rounded-xl overflow-hidden border border-gray-200 group">
                  <img src={coverPreview} alt="封面预览" className="w-full h-48 object-cover" />
                  {/* hover 遮罩 */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2">
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-white text-blue-600 rounded-full hover:bg-blue-50 shadow-lg" title="重新选择">
                      <Crop className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={handleRemoveCover}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg" title="移除封面">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {uploadingCover && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full max-w-md h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition-all">
                  <Upload className="w-6 h-6" />
                  <span className="text-sm">点击上传封面图片</span>
                  <span className="text-xs text-gray-300">支持 jpg/png/webp，最大 5MB · 支持裁剪</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleCoverSelect} className="hidden" />
            </div>

            {/* 标题 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">标题 <span className="text-red-400">*</span></label>
                <span className={`text-xs ${title.length > 80 ? 'text-red-400' : 'text-gray-400'}`}>{title.length}/80</span>
              </div>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all outline-none text-gray-900 placeholder:text-gray-400"
                placeholder="一个吸引人的标题..." autoFocus />
            </div>

            {/* 标签 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  <Hash className="inline w-3.5 h-3.5 mr-1" />标签
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
                      {hasValue && (
                        <div className="flex items-center justify-between px-2.5 py-2 bg-blue-50 border border-blue-200 rounded-xl text-sm animate-[fadeIn_0.15s_ease-out]">
                          <span className="text-blue-700 truncate">{tags[i]}</span>
                          <button type="button" onClick={() => removeTag(i)}
                            className="ml-1 w-4 h-4 rounded-full hover:bg-blue-200 flex items-center justify-center shrink-0">
                            <X className="w-3 h-3 text-blue-500" />
                          </button>
                        </div>
                      )}
                      {isNext && (
                        <div className="flex items-center gap-1 px-2.5 py-2 bg-white border-2 border-blue-400 rounded-xl ring-2 ring-blue-500/10">
                          <Plus className="w-3 h-3 text-blue-400 shrink-0" />
                          <input ref={(el) => { slotRefs.current[i] = el; }} type="text"
                            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 placeholder:text-gray-300 min-w-0"
                            placeholder="标签" maxLength={20}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); updateTag(i, (e.target as HTMLInputElement).value); }}}
                            onBlur={(e) => { if (e.target.value.trim()) updateTag(i, e.target.value); }} />
                        </div>
                      )}
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
                <label className="text-sm font-medium text-gray-700">内容 <span className="text-red-400">*</span></label>
                <span className={`text-xs ${content.length > 8192 ? 'text-red-400' : 'text-gray-400'}`}>{content.length}/8192</span>
              </div>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={14}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all outline-none text-gray-900 placeholder:text-gray-400 resize-none leading-relaxed"
                placeholder={`写下你想分享的内容...\n\n支持换行分段，让排版更清晰`} />
            </div>

            {/* 快速标签 */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-400 py-1">推荐标签：</span>
              {['Java', 'Spring Boot', '前端', 'React', 'Python', 'AI', '开源', '经验分享'].map((t) => (
                <button key={t} type="button" disabled={tags.includes(t) || tags.length >= 5}
                  onClick={() => { if (!tags.includes(t) && tags.length < 5) setTags((prev) => [...prev, t]); }}
                  className="px-2.5 py-0.5 text-xs rounded-lg border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  {t}
                </button>
              ))}
            </div>

            {/* 提交 */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-50">
              <button type="button" onClick={() => navigate('/')}
                className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors">取消</button>
              <button type="submit" disabled={loading || uploadingCover || !title.trim() || !content.trim()}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-blue-600/10 flex items-center gap-2">
                {(loading || uploadingCover) ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>{uploadingCover ? '上传封面中...' : '发布中...'}</span></>
                ) : ('发布帖子')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
