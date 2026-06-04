import apiClient from './client';
import {
  BaseResponse,
  LoginUserVO,
  UserLoginRequest,
  UserRegisterRequest,
  UserUpdateMyRequest,
  PostVO,
  PostQueryRequest,
  PostAddRequest,
  PostEditRequest,
  Page,
  DoThumbRequest,
  DeleteRequest,
  PostFavourAddRequest,
  CommentVO,
  CommentAddRequest,
  CommentQueryRequest,
  CommentThumbRequest,
} from '../types';

// User API
export const userApi = {
  login: (data: UserLoginRequest) =>
    apiClient.post<BaseResponse<LoginUserVO>>('/user/login', data),
  register: (data: UserRegisterRequest) =>
    apiClient.post<BaseResponse<string>>('/user/register', data),
  logout: () => apiClient.post<BaseResponse<boolean>>('/user/logout'),
  getCurrentUser: () =>
    apiClient.get<BaseResponse<LoginUserVO>>('/user/get/login'),
  updateMyInfo: (data: UserUpdateMyRequest) =>
    apiClient.post<BaseResponse<boolean>>('/user/update/my', data),
};

// Post API
export const postApi = {
  getList: (data: PostQueryRequest) =>
    apiClient.post<BaseResponse<Page<PostVO>>>('/post/list/page/vo', data),
  getDetail: (id: string | number) =>
    apiClient.get<BaseResponse<PostVO>>('/post/get/vo', { params: { id } }),
  add: (data: PostAddRequest) =>
    apiClient.post<BaseResponse<string>>('/post/add', data),
  edit: (data: PostEditRequest) =>
    apiClient.post<BaseResponse<boolean>>('/post/edit', data),
  delete: (data: DeleteRequest) =>
    apiClient.post<BaseResponse<boolean>>('/post/delete', data),
  getMyList: (data: PostQueryRequest) =>
    apiClient.post<BaseResponse<Page<PostVO>>>('/post/my/list/page/vo', data),
};

// Thumb API
export const thumbApi = {
  doThumb: (data: DoThumbRequest) =>
    apiClient.post<BaseResponse<boolean>>('/thumb/do', data),
  undoThumb: (data: DoThumbRequest) =>
    apiClient.post<BaseResponse<boolean>>('/thumb/undo', data),
};

// Post Favour API
export const postFavourApi = {
  doFavour: (data: PostFavourAddRequest) =>
    apiClient.post<BaseResponse<string>>('/post_favour/', data),
  getMyFavourList: (data: PostQueryRequest) =>
    apiClient.post<BaseResponse<Page<PostVO>>>(
      '/post_favour/my/list/page',
      data
    ),
};

// Comment API
export const commentApi = {
  add: (data: CommentAddRequest) =>
    apiClient.post<BaseResponse<number>>('/comment/add', data),
  delete: (id: string) =>
    apiClient.post<BaseResponse<boolean>>('/comment/delete', null, { params: { id } }),
  getList: (data: CommentQueryRequest) =>
    apiClient.post<BaseResponse<Page<CommentVO>>>('/comment/list/page/vo', data),
  getReplies: (parentId: string, current = 1, pageSize = 10) =>
    apiClient.get<BaseResponse<Page<CommentVO>>>('/comment/replies', {
      params: { parentId, current, pageSize },
    }),
  thumb: (data: CommentThumbRequest) =>
    apiClient.post<BaseResponse<boolean>>('/comment/thumb', data),
  getCount: (postId: string) =>
    apiClient.get<BaseResponse<number>>('/comment/count', { params: { postId } }),
};
