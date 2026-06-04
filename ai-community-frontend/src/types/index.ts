export interface UserVO {
  id: string;
  userName: string;
  userAvatar: string;
  userProfile: string;
  userRole: string;
  createTime: string;
}

export interface LoginUserVO {
  id: string;
  userName: string;
  userAvatar: string;
  userProfile: string;
  userRole: string;
  createTime: string;
  updateTime: string;
}

export interface PostVO {
  id: string;
  title: string;
  content: string;
  thumbNum: number;
  favourNum: number;
  userId: string;
  createTime: string;
  updateTime: string;
  tagList: string[];
  user: UserVO;
  hasThumb: boolean;
  hasFavour: boolean;
}

export interface Page<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

export interface PostQueryRequest {
  current?: number;
  pageSize?: number;
  searchText?: string;
  userId?: string;
  id?: string;
  notId?: string;
  title?: string;
  content?: string;
  tags?: string[];
  orTags?: string[];
  favourUserId?: string;
  sortField?: string;
  sortOrder?: string;
}

export interface PostAddRequest {
  title: string;
  content: string;
  tags?: string[];
}

export interface PostEditRequest {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
}

export interface DoThumbRequest {
  postId: string;
}

export interface UserLoginRequest {
  userAccount: string;
  userPassword: string;
}

export interface UserRegisterRequest {
  userAccount: string;
  userPassword: string;
  checkPassword: string;
}

export interface UserUpdateMyRequest {
  userName?: string;
  userAvatar?: string;
  userProfile?: string;
}

export interface DeleteRequest {
  id: string;
}

export interface BaseResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface PostFavourAddRequest {
  postId: string;
}

// Comment types
export interface CommentVO {
  id: string;
  content: string;
  postId: string;
  userId: string;
  parentId: string;
  replyToUserId: string;
  thumbNum: number;
  createTime: string;
  updateTime: string;
  user: UserVO;
  replyToUser: UserVO | null;
  hasThumb: boolean;
  replies: CommentVO[] | null;
  replyCount: number;
}

export interface CommentAddRequest {
  content: string;
  postId: string;
  parentId?: string;
  replyToUserId?: string;
}

export interface CommentQueryRequest {
  postId: string;
  current?: number;
  pageSize?: number;
}

export interface CommentThumbRequest {
  commentId: string;
}
