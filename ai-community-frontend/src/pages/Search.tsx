import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { postApi } from '../api/endpoints';
import { PostVO } from '../types';
import PostList from '../components/PostList';

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [posts, setPosts] = useState<PostVO[]>([]);
  const [loading, setLoading] = useState(false);

  const searchPosts = async (q: string) => {
    if (!q) {
      setPosts([]);
      return;
    }
    setLoading(true);
    try {
      const response = await postApi.getList({
        current: 1,
        pageSize: 20,
        searchText: q,
      });
      setPosts(response.data.data.records);
    } catch (error) {
      console.error('Failed to search posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchPosts(query);
  }, [query]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            搜索结果
          </h1>
          <p className="text-gray-600">
            搜索 "{query}" 的相关帖子
          </p>
        </div>

        {!query ? (
          <div className="text-center py-16">
            <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              请输入搜索关键词
            </p>
          </div>
        ) : (
          <PostList posts={posts} loading={loading} />
        )}
      </div>
    </div>
  );
}
