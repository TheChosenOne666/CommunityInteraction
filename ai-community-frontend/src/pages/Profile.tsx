import { useState, useEffect } from 'react';
import { User, Settings, Heart, Bookmark, FileText } from 'lucide-react';
import { postApi, postFavourApi } from '../api/endpoints';
import { PostVO } from '../types';
import { useAppStore } from '../store';
import PostList from '../components/PostList';

type Tab = 'posts' | 'favourites' | 'likes';

export default function Profile() {
  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<PostVO[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAppStore();

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

  useEffect(() => {
    if (activeTab === 'posts') {
      loadMyPosts();
    } else if (activeTab === 'favourites') {
      loadMyFavourites();
    } else {
      setPosts([]);
    }
  }, [activeTab]);

  const tabs = [
    { id: 'posts' as Tab, label: '我的帖子', icon: FileText },
    { id: 'favourites' as Tab, label: '我的收藏', icon: Bookmark },
    { id: 'likes' as Tab, label: '我的点赞', icon: Heart },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-orange-500 h-48"></div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-8">
            <div className="flex items-start space-x-6">
              {user?.userAvatar ? (
                <img
                  src={user.userAvatar}
                  alt={user.userName}
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

              <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
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
          {activeTab === 'likes' ? (
            <div className="text-center py-16">
              <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">暂无点赞内容</p>
            </div>
          ) : (
            <PostList posts={posts} loading={loading} />
          )}
        </div>
      </div>
    </div>
  );
}
