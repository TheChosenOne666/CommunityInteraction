package com.xiaolou.community.service.impl;

import cn.hutool.core.date.DateTime;
import cn.hutool.core.date.DateUtil;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.xiaolou.community.constant.RedisLuaScriptConstant;
import com.xiaolou.community.constant.ThumbConstant;
import com.xiaolou.community.manager.cache.CacheManager;
import com.xiaolou.community.mapper.PostThumbMapper;
import com.xiaolou.community.model.dto.postthumb.DoThumbRequest;
import com.xiaolou.community.model.entity.Thumb;
import com.xiaolou.community.model.entity.User;
import com.xiaolou.community.model.enums.LuaStatusEnum;
import com.xiaolou.community.service.ThumbService;
import com.xiaolou.community.service.UserService;
import com.xiaolou.community.utils.RedisKeyUtil;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Arrays;

@Service("thumbServiceRedis")
@Slf4j
public class ThumbServiceRedisImpl extends ServiceImpl<PostThumbMapper, Thumb> implements ThumbService {

    @Resource
    private UserService userService;

    @Resource
    private RedisTemplate<String, Object> redisTemplate;

    // 引入缓存管理
    @Resource
    private CacheManager cacheManager;
  
    @Override  
    public Boolean doThumb(DoThumbRequest doThumbRequest, HttpServletRequest request) {  
        if (doThumbRequest == null || doThumbRequest.getPostId() == null) {
            throw new RuntimeException("参数错误");  
        }  
        User loginUser = userService.getLoginUser(request);  
        Long blogId = doThumbRequest.getPostId();
  
        String timeSlice = getTimeSlice();  
        // Redis Key  
        String tempThumbKey = RedisKeyUtil.getTempThumbKey(timeSlice);  
        String userThumbKey = RedisKeyUtil.getUserThumbKey(loginUser.getId());
        String blogExistsKey = RedisKeyUtil.getBlogExistsKey(blogId);
  
        // 执行 Lua 脚本  
        long result = redisTemplate.execute(  
                RedisLuaScriptConstant.THUMB_SCRIPT,  
                Arrays.asList(tempThumbKey, userThumbKey, blogExistsKey),  
                loginUser.getId(),  
                blogId  
        );  
  
        if (result == -2) {
            throw new RuntimeException("博客不存在");
        }
        if (LuaStatusEnum.FAIL.getValue() == result) {  
            throw new RuntimeException("用户已点赞");  
        }  
  
        // 更新成功才执行
        boolean success = LuaStatusEnum.SUCCESS.getValue() == result;
        
        // 更新用户点赞状态缓存（不立即写数据库，由定时任务异步批量落库）
        if (success) {
            String hashKey = ThumbConstant.USER_THUMB_KEY_PREFIX + loginUser.getId();
            String fieldKey = blogId.toString();
            // 使用占位值 1 标记已点赞（真实ID由定时任务同步时生成）
            redisTemplate.opsForHash().put(hashKey, fieldKey, 1L);
            // 写入本地缓存并触发热点探测
            cacheManager.putIfPresent(hashKey, fieldKey, 1L);
            log.info("用户 {} 对博客 {} 点赞成功", loginUser.getId(), blogId);
        }
        
        return success;  
    }  
  
    @Override  
    public Boolean undoThumb(DoThumbRequest doThumbRequest, HttpServletRequest request) {  
        if (doThumbRequest == null || doThumbRequest.getPostId() == null) {
            throw new RuntimeException("参数错误");  
        }  
        User loginUser = userService.getLoginUser(request);  
      
        Long blogId = doThumbRequest.getPostId();
        
        // 先从缓存中检查用户是否已点赞
        Object thumbIdObj = cacheManager.get(ThumbConstant.USER_THUMB_KEY_PREFIX + loginUser.getId(), blogId.toString());
        if (thumbIdObj == null || thumbIdObj.equals(ThumbConstant.UN_THUMB_CONSTANT)) {
            throw new RuntimeException("用户未点赞");
        }
        
        // 计算时间片  
        String timeSlice = getTimeSlice();  
        // Redis Key  
        String tempThumbKey = RedisKeyUtil.getTempThumbKey(timeSlice);  
        String userThumbKey = RedisKeyUtil.getUserThumbKey(loginUser.getId());
        String blogExistsKey = RedisKeyUtil.getBlogExistsKey(blogId);
      
        // 执行 Lua 脚本  
        long result = redisTemplate.execute(  
                RedisLuaScriptConstant.UNTHUMB_SCRIPT,  
                Arrays.asList(tempThumbKey, userThumbKey, blogExistsKey),  
                loginUser.getId(),  
                blogId  
        );
        // 根据返回值处理结果
        if (result == -2) {
            throw new RuntimeException("博客不存在");
        }
        if (result == LuaStatusEnum.FAIL.getValue()) {  
            throw new RuntimeException("用户未点赞");  
        }
        
        boolean success = LuaStatusEnum.SUCCESS.getValue() == result;
        
        // 更新用户点赞状态缓存（不立即操作数据库，由定时任务异步批量处理）
        if (success) {
            String hashKey = ThumbConstant.USER_THUMB_KEY_PREFIX + loginUser.getId();
            String fieldKey = blogId.toString();
            // 从 Redis Hash 中删除点赞标记
            redisTemplate.opsForHash().delete(hashKey, fieldKey);
            // 本地缓存标记为未点赞
            cacheManager.putIfPresent(hashKey, fieldKey, ThumbConstant.UN_THUMB_CONSTANT);
        }
        
        return success;  
    }
  
    private String getTimeSlice() {  
        DateTime nowDate = DateUtil.date();  
        // 获取到当前时间前最近的整数秒，比如当前 11:20:23 ，获取到 11:20:20  
        return DateUtil.format(nowDate, "HH:mm:") + (DateUtil.second(nowDate) / 10) * 10;  
    }

    @Override
    public Boolean hasThumb(Long postId, Long userId) {
        Object thumbIdObj = cacheManager.get(ThumbConstant.USER_THUMB_KEY_PREFIX + userId, postId.toString());
        if (thumbIdObj == null) {
            return false;
        }
        Long thumbId = (Long) thumbIdObj;
        return !thumbId.equals(ThumbConstant.UN_THUMB_CONSTANT);
    }
}
