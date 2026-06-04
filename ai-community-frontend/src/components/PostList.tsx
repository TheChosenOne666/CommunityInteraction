import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { PostVO } from '../types';
import PostCard from './PostCard';
import Empty from './Empty';

interface PostListProps {
  posts: PostVO[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export default function PostList({
  posts,
  loading = false,
  hasMore = false,
  onLoadMore,
}: PostListProps) {
  if (loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (posts.length === 0) {
    return <Empty message="暂无帖子" />;
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>加载中...</span>
              </div>
            ) : (
              '加载更多'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
