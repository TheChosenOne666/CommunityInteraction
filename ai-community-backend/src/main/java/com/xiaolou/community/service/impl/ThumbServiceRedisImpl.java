package com.xiaolou.community.service.impl;

import cn.hutool.core.date.DateTime;
import cn.hutool.core.date.DateUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.xiaolou.community.constant.RedisLuaScriptConstant;
import com.xiaolou.community.constant.ThumbConstant;
import com.xiaolou.community.manager.cache.CacheManager;
import com.xiaolou.community.mapper.PostThumbMapper;
import com.xiaolou.community.model.dto.postthumb.DoThumbRequest;
import com.xiaolou.community.model.dto.thumb.ThumbEvent;
import com.xiaolou.community.model.entity.Post;
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

/**
 * Redis 暂存 + {@link com.xiaolou.community.job.SyncThumb2DBJob 定时批量落库} 的点赞服务
 * <p>
 * 核心策略：
 * 1. doThumb/undoThumb 仅写入 Redis（temp 计数 + user 状态），由 SyncThumb2DBJob 定时批量同步 DB
 * 2. 补偿由 SyncThumb2DBCompensatoryJob 处理，对账由 ThumbReconcileJob 补发 Kafka
 * <p>
 * 同时为 {@link ThumbServiceMQImpl} 提供降级委托入口：
 * {@link #registerDegradedEvent(Long, Long, ThumbEvent.EventType)}
 *
 * @author <a href="https://github.com/TheChosenOne666">小楼</a>
 */
@Service("thumbServiceRedis")
@Slf4j
public class ThumbServiceRedisImpl extends ServiceImpl<PostThumbMapper, Thumb> implements ThumbService {

    @Resource
    private UserService userService;

    @Resource
    private RedisTemplate<String, Object> redisTemplate;

    @Resource
    private CacheManager cacheManager;

    // ═══════════════════════════════════════════════
    //  API：点赞 / 取消点赞
    // ═══════════════════════════════════════════════

    @Override
    public Boolean doThumb(DoThumbRequest doThumbRequest, HttpServletRequest request) {
        if (doThumbRequest == null || doThumbRequest.getPostId() == null) {
            throw new RuntimeException("参数错误");
        }
        User loginUser = userService.getLoginUser(request);
        Long blogId = doThumbRequest.getPostId();

        String timeSlice = getTimeSlice();
        String tempThumbKey = RedisKeyUtil.getTempThumbKey(timeSlice);
        String userThumbKey = RedisKeyUtil.getUserThumbKey(loginUser.getId());
        String blogExistsKey = RedisKeyUtil.getBlogExistsKey(blogId);

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

        boolean success = LuaStatusEnum.SUCCESS.getValue() == result;

        if (success) {
            String hashKey = ThumbConstant.USER_THUMB_KEY_PREFIX + loginUser.getId();
            String fieldKey = blogId.toString();
            redisTemplate.opsForHash().put(hashKey, fieldKey, 1L);
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

        Object thumbIdObj = cacheManager.get(ThumbConstant.USER_THUMB_KEY_PREFIX + loginUser.getId(), blogId.toString());
        if (thumbIdObj == null || thumbIdObj.equals(ThumbConstant.UN_THUMB_CONSTANT)) {
            throw new RuntimeException("用户未点赞");
        }

        String timeSlice = getTimeSlice();
        String tempThumbKey = RedisKeyUtil.getTempThumbKey(timeSlice);
        String userThumbKey = RedisKeyUtil.getUserThumbKey(loginUser.getId());
        String blogExistsKey = RedisKeyUtil.getBlogExistsKey(blogId);

        long result = redisTemplate.execute(
                RedisLuaScriptConstant.UNTHUMB_SCRIPT,
                Arrays.asList(tempThumbKey, userThumbKey, blogExistsKey),
                loginUser.getId(),
                blogId
        );
        if (result == -2) {
            throw new RuntimeException("博客不存在");
        }
        if (result == LuaStatusEnum.FAIL.getValue()) {
            throw new RuntimeException("用户未点赞");
        }

        boolean success = LuaStatusEnum.SUCCESS.getValue() == result;

        if (success) {
            String hashKey = ThumbConstant.USER_THUMB_KEY_PREFIX + loginUser.getId();
            String fieldKey = blogId.toString();
            redisTemplate.opsForHash().delete(hashKey, fieldKey);
            cacheManager.putIfPresent(hashKey, fieldKey, ThumbConstant.UN_THUMB_CONSTANT);
        }

        return success;
    }

    // ═══════════════════════════════════════════════
    //  降级委托入口（供 ThumbServiceMQImpl 调用）
    // ═══════════════════════════════════════════════

    /**
     * 仅注册点赞事件到临时 Redis 存储，由 {@link com.xiaolou.community.job.SyncThumb2DBJob} 同步到 DB
     * <p>
     * 用于 Kafka 不可用时，MQ 实现将事件委托给 Redis 暂存策略。
     * MQ 实现已通过其 Lua 脚本设置了 userThumbKey，此处只补充 tempThumb 计数。
     */
    public void registerDegradedEvent(Long userId, Long blogId, ThumbEvent.EventType eventType) {
        String timeSlice = getTimeSlice();
        String tempThumbKey = RedisKeyUtil.getTempThumbKey(timeSlice);
        String hashKey = userId + ":" + blogId;

        if (eventType == ThumbEvent.EventType.INCR) {
            redisTemplate.opsForHash().increment(tempThumbKey, hashKey, 1);
        } else {
            redisTemplate.opsForHash().increment(tempThumbKey, hashKey, -1);
        }
        log.debug("降级事件已注册: userId={}, blogId={}, type={}, timeSlice={}",
                userId, blogId, eventType, timeSlice);
    }

    @Override
    public Boolean hasThumb(Long postId, Long userId) {
        Object thumbIdObj = cacheManager.get(ThumbConstant.USER_THUMB_KEY_PREFIX + userId, postId.toString());
        if (thumbIdObj == null) return false;
        Long thumbId = (Long) thumbIdObj;
        return !thumbId.equals(ThumbConstant.UN_THUMB_CONSTANT);
    }

    @Override
    public Page<Post> listMyThumbPosts(IPage<Post> page, long userId) {
        return this.baseMapper.listMyThumbPosts(page, userId);
    }

    private String getTimeSlice() {
        DateTime nowDate = DateUtil.date();
        return DateUtil.format(nowDate, "HH:mm:") + (DateUtil.second(nowDate) / 10) * 10;
    }
}
