import { useState, useEffect, useRef } from 'react';
import { User, Settings, Heart, Bookmark, FileText, Camera, X, Loader2 } from 'lucide-react';
import { postApi, postFavourApi, userApi, fileApi, thumbApi } from '../api/endpoints';
import { PostVO } from '../types';
import { useAppStore } from '../store';
import PostList from '../components/PostList';

type Tab = 'posts' | 'favourites' | 'likes';

const BIZ_AVATAR = 'USER_AVATAR';

export default function Profile() {
  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<PostVO[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, setUser } = useAppStore();

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editProfile, setEditProfile] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openEditModal = () => {
    setEditName(user?.userName || '');
    setEditProfile(user?.userProfile || '');
    setEditAvatar(user?.userAvatar || '');
    setShowEditModal(true);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB');
      return;
    }

    setUploading(true);
    try {
      const res = await fileApi.upload(file, BIZ_AVATAR);
      const url = res.data.data;
      setEditAvatar(url);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('头像上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      alert('昵称不能为空');
      return;
    }

    setSaving(true);
    try {
      await userApi.updateMyInfo({
        userName: trimmedName,
        userAvatar: editAvatar,
        userProfile: editProfile.trim(),
      });

      // Update local store
      if (user) {
        setUser({
          ...user,
          userName: trimmedName,
          userAvatar: editAvatar,
          userProfile: editProfile.trim(),
        });
      }

      setShowEditModal(false);
    } catch (err) {
      console.error('Save failed:', err);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const loadMyPosts = async () => {
    setLoading(true);
    try {
      const response = await postApi.getMyList({
        current: 1,
        pageSize: 20,
        sortField: 'createTime',
        sortOrder: 'desc',
      });
      setPosts(response.data.data.records);
    } catch (error) {
      console.error('Failed to load my posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyFavourites = async () => {
    setLoading(true);
    try {
      const response = await postFavourApi.getMyFavourList({
        current: 1,
        pageSize: 20,
      });
      setPosts(response.data.data.records);
    } catch (error) {
      console.error('Failed to load my favourites:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyLikes = async () => {
    setLoading(true);
    try {
      const response = await thumbApi.getMyThumbList({
        current: 1,
        pageSize: 20,
      });
      setPosts(response.data.data.records);
    } catch (error) {
      console.error('Failed to load my likes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'posts') {
      loadMyPosts();
    } else if (activeTab === 'favourites') {
      loadMyFavourites();
    } else {
      loadMyLikes();
    }
  }, [activeTab]);

  const tabs = [
    { id: 'posts' as Tab, label: '我的帖子', icon: FileText },
    { id: 'favourites' as Tab, label: '我的收藏', icon: Bookmark },
    { id: 'likes' as Tab, label: '我的点赞', icon: Heart },
  ];

  const displayAvatar = user?.userAvatar || editAvatar;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-orange-500 h-48"></div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-8">
            <div className="flex items-start space-x-6">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={user?.userName}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-blue-500 to-orange-500 flex items-center justify-center">
                  <User className="w-12 h-12 text-white" />
                </div>
              )}

              <div className="flex-1 pt-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {user?.userName || '用户'}
                </h1>
                <p className="text-gray-600 mb-4">
                  {user?.userProfile || '这个人很懒，什么都没有留下'}
                </p>
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <div>
                    <span className="font-medium text-gray-900">0</span> 帖子
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">0</span> 关注
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">0</span> 粉丝
                  </div>
                </div>
              </div>

              <button
                onClick={openEditModal}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
                <span>编辑资料</span>
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200">
            <div className="flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center space-x-2 py-4 px-6 transition-colors ${
                      activeTab === tab.id
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <PostList posts={posts} loading={loading} />
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !saving && setShowEditModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">编辑个人资料</h2>
              <button
                onClick={() => !saving && setShowEditModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Avatar */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative group mb-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                {editAvatar ? (
                  <img
                    src={editAvatar}
                    alt="avatar"
                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-100"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-orange-500 flex items-center justify-center border-4 border-gray-100">
                    <User className="w-12 h-12 text-white" />
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {uploading ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </button>
              </div>
              <span className="text-xs text-gray-400">点击更换头像（支持 jpg/png，≤5MB）</span>
            </div>

            {/* Nickname */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">昵称</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                placeholder="请输入昵称"
              />
            </div>

            {/* Bio */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">个人简介</label>
              <textarea
                value={editProfile}
                onChange={(e) => setEditProfile(e.target.value)}
                maxLength={200}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none"
                placeholder="介绍一下自己吧..."
              />
              <div className="text-right text-xs text-gray-400 mt-1">
                {editProfile.length}/200
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                disabled={saving}
                className="flex-1 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editName.trim()}
                className="flex-1 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    保存中...
                  </>
                ) : (
                  '保存'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
