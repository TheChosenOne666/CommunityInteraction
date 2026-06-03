package com.xiaolou.community.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.xiaolou.community.constant.RedisLuaScriptConstant;
import com.xiaolou.community.mapper.PostThumbMapper;
import com.xiaolou.community.model.dto.postthumb.DoThumbRequest;
import com.xiaolou.community.model.dto.thumb.ThumbEvent;
import com.xiaolou.community.model.entity.Thumb;
import com.xiaolou.community.model.entity.User;
import com.xiaolou.community.model.enums.LuaStatusEnum;
import com.xiaolou.community.service.ThumbService;
import com.xiaolou.community.service.UserService;
import com.xiaolou.community.utils.RedisKeyUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 基于 Kafka 消息队列的点赞服务实现
 */
@Service("thumbService")
@Slf4j
@RequiredArgsConstructor
public class ThumbServiceMQImpl extends ServiceImpl<PostThumbMapper, Thumb>
        implements ThumbService {

    private final UserService userService;

    private final RedisTemplate<String, Object> redisTemplate;

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Override
    public Boolean doThumb(DoThumbRequest doThumbRequest, HttpServletRequest request) {
        if (doThumbRequest == null || doThumbRequest.getPostId() == null) {
            throw new RuntimeException("参数错误");
        }
        User loginUser = userService.getLoginUser(request);
        Long loginUserId = loginUser.getId();
        Long blogId = doThumbRequest.getPostId();
        String userThumbKey = RedisKeyUtil.getUserThumbKey(loginUserId);
        
        // 执行 Lua 脚本，点赞存入 Redis
        long result = redisTemplate.execute(
                RedisLuaScriptConstant.THUMB_SCRIPT_MQ,
                List.of(userThumbKey),
                blogId
        );
        if (LuaStatusEnum.FAIL.getValue() == result) {
            throw new RuntimeException("用户已点赞");
        }

        ThumbEvent thumbEvent = ThumbEvent.builder()
                .blogId(blogId)
                .userId(loginUserId)
                .type(ThumbEvent.EventType.INCR)
                .eventTime(LocalDateTime.now())
                .build();
        
        // 异步发送消息到 Kafka
        kafkaTemplate.send("thumb-topic", thumbEvent).whenComplete((sendResult, ex) -> {
            if (ex != null) {
                // 发送失败，回滚 Redis 操作
                redisTemplate.opsForHash().delete(userThumbKey, blogId.toString());
                log.error("点赞事件发送失败: userId={}, blogId={}", loginUserId, blogId, ex);
            } else {
                log.info("点赞事件发送成功: userId={}, blogId={}", loginUserId, blogId);
            }
        });

        return true;
    }

    @Override
    public Boolean undoThumb(DoThumbRequest doThumbRequest, HttpServletRequest request) {
        if (doThumbRequest == null || doThumbRequest.getPostId() == null) {
            throw new RuntimeException("参数错误");
        }
        User loginUser = userService.getLoginUser(request);
        Long loginUserId = loginUser.getId();
        Long blogId = doThumbRequest.getPostId();
        String userThumbKey = RedisKeyUtil.getUserThumbKey(loginUserId);
        
        // 执行 Lua 脚本，点赞记录从 Redis 删除
        long result = redisTemplate.execute(
                RedisLuaScriptConstant.UNTHUMB_SCRIPT_MQ,
                List.of(userThumbKey),
                blogId
        );
        if (LuaStatusEnum.FAIL.getValue() == result) {
            throw new RuntimeException("用户未点赞");
        }
        
        ThumbEvent thumbEvent = ThumbEvent.builder()
                .blogId(blogId)
                .userId(loginUserId)
                .type(ThumbEvent.EventType.DECR)
                .eventTime(LocalDateTime.now())
                .build();
        
        // 异步发送消息到 Kafka
        kafkaTemplate.send("thumb-topic", thumbEvent).whenComplete((sendResult, ex) -> {
            if (ex != null) {
                // 发送失败，回滚 Redis 操作
                redisTemplate.opsForHash().put(userThumbKey, blogId.toString(), 1);
                log.error("取消点赞事件发送失败: userId={}, blogId={}", loginUserId, blogId, ex);
            } else {
                log.info("取消点赞事件发送成功: userId={}, blogId={}", loginUserId, blogId);
            }
        });

        return true;
    }

    @Override
    public Boolean hasThumb(Long postId, Long userId) {
        return redisTemplate.opsForHash().hasKey(RedisKeyUtil.getUserThumbKey(userId), postId.toString());
    }
}
