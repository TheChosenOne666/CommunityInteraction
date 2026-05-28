package com.xiaolou.community.utils;

import com.xiaolou.community.constant.ThumbConstant;

/**
 * Redis临时点赞记录 key 工具类
 */
public class RedisKeyUtil {
  
    public static String getUserThumbKey(Long userId) {  
        return ThumbConstant.USER_THUMB_KEY_PREFIX + userId;  
    }  
  
    /**  
     * 获取 临时点赞记录 key  
     */  
    public static String getTempThumbKey(String time) {  
        return ThumbConstant.TEMP_THUMB_KEY_PREFIX.formatted(time);  
    }  

    /**
     * 获取博客存在性校验 key
     * @param blogId 博客ID
     * @return Redis Key
     */
    public static String getBlogExistsKey(Long blogId) {
        return "blog:exists:" + blogId;
    }
  
}