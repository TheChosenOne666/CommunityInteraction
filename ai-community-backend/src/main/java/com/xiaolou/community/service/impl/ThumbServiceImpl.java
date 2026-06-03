package com.xiaolou.community.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.xiaolou.community.constant.ThumbConstant;
import com.xiaolou.community.manager.cache.CacheManager;
import com.xiaolou.community.mapper.PostThumbMapper;
import com.xiaolou.community.model.dto.postthumb.DoThumbRequest;
import com.xiaolou.community.model.entity.Post;
import com.xiaolou.community.model.entity.Thumb;
import com.xiaolou.community.model.entity.User;
import com.xiaolou.community.service.PostService;
import com.xiaolou.community.service.ThumbService;
import com.xiaolou.community.service.UserService;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;


/**
 * 点赞服务实现
 *
 * @author <a href="https://github.com/TheChosenOne666">小楼</a>
 * @from <a href="https://github.com/TheChosenOne666">TheChosenOne666</a>
 */
@Service("thumbServiceLocalCache")
@Slf4j
public class ThumbServiceImpl extends ServiceImpl<PostThumbMapper, Thumb> implements ThumbService {

    @Resource
    private PostService postService;

    @Resource
    private UserService userService;

    @Resource
    private TransactionTemplate transactionTemplate;

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
        // 加锁  
        synchronized (loginUser.getId().toString().intern()) {  
      
            // 编程式事务  
            return transactionTemplate.execute(status -> {  
                Long blogId = doThumbRequest.getPostId();
                boolean exists = this.hasThumb(blogId, loginUser.getId());
                if (exists) {  
                    throw new RuntimeException("用户已点赞");  
                }  
      
                boolean update = postService.lambdaUpdate()
                        .eq(Post::getId, blogId)
                        .setSql("thumbNum = thumbNum + 1")
                        .update();  
      
                Thumb thumb = new Thumb();  
                thumb.setUserId(loginUser.getId());  
                thumb.setPostId(blogId);
                boolean success = update && this.save(thumb);
                // 点赞记录存入 Redis
                if (success) {
                    String hashKey = ThumbConstant.USER_THUMB_KEY_PREFIX + loginUser.getId();
                    String fieldKey = blogId.toString();
                    Long realThumbId = thumb.getId();
                    redisTemplate.opsForHash().put(hashKey, fieldKey, realThumbId);
                    cacheManager.putIfPresent(hashKey, fieldKey, realThumbId);
                }

                // 更新成功才执行
                return success;
            });  
        }  
    }

    @Override
    public Boolean undoThumb(DoThumbRequest doThumbRequest, HttpServletRequest request) {
        if (doThumbRequest == null || doThumbRequest.getPostId() == null) {
            throw new RuntimeException("参数错误");
        }
        User loginUser = userService.getLoginUser(request);
        // 加锁
        synchronized (loginUser.getId().toString().intern()) {

            // 编程式事务
            return transactionTemplate.execute(status -> {
                Long blogId = doThumbRequest.getPostId();
                Object thumbIdObj = cacheManager.get(ThumbConstant.USER_THUMB_KEY_PREFIX + loginUser.getId(), blogId.toString());
                if (thumbIdObj == null || thumbIdObj.equals(ThumbConstant.UN_THUMB_CONSTANT)) {
                    throw new RuntimeException("用户未点赞");
                }

                Long thumbId = Long.valueOf(thumbIdObj.toString());
                boolean update = postService.lambdaUpdate()
                        .eq(Post::getId, blogId)
                        .setSql("thumbNum = thumbNum - 1")
                        .update();
                boolean success = update && this.removeById(thumbId);
                // 点赞记录从 Redis 删除
                if (success) {
                    String hashKey = ThumbConstant.USER_THUMB_KEY_PREFIX + loginUser.getId();
                    String fieldKey = blogId.toString();
                    redisTemplate.opsForHash().delete(hashKey, fieldKey);
                    cacheManager.putIfPresent(hashKey, fieldKey, ThumbConstant.UN_THUMB_CONSTANT);
                }

                return success;
            });
        }
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
