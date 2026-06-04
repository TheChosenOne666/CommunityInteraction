import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api',
  timeout: 10000,
  withCredentials: true,
  transformResponse: [
    function (data) {
      // 完全手动解析JSON，确保ID不被转成number精度丢失
      try {
        return JSON.parse(data, (key, value) => {
          // 检查是否是ID相关的字段，并且是数字类型
          if (
            (key === 'id' || key === 'userId' || key === 'postId' || key === 'notId' || key === 'favourUserId') &&
            typeof value === 'number'
          ) {
            return String(value);
          }
          return value;
        });
      } catch (e) {
        return data;
      }
    },
  ],
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;
