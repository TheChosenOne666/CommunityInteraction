package com.xiaolou.community.service.impl;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.xiaolou.community.constant.RedisLuaScriptConstant;
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
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 基于 Kafka 消息队列的点赞服务实现（含 Redis 宕机 + Kafka 不可用双降级）
 * <p>
 * 正常路径：Lua → Redis → Kafka → Consumer 批量写 DB
 * <p>
 * Redis 宕机：跳过 Redis → DB 查重 → 仍然发 Kafka
 * Kafka 不可用：委托 {@link ThumbServiceRedisImpl#registerDegradedEvent} →
 *   Redis 暂存 tempThumb → 定时任务批量同步 DB → 补偿重试
 *
 * @author <a href="https://github.com/TheChosenOne666">小楼</a>
 */
@Service("thumbService")
@Slf4j
public class ThumbServiceMQImpl extends ServiceImpl<PostThumbMapper, Thumb>
        implements ThumbService {

    @Resource
    private UserService userService;

    @Resource
    private RedisTemplate<String, Object> redisTemplate;

    @Resource
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Resource(name = "thumbServiceRedis")
    private ThumbServiceRedisImpl thumbServiceRedis;

    @Override
    public Boolean doThumb(DoThumbRequest doThumbRequest, HttpServletRequest request) {
        if (doThumbRequest == null || doThumbRequest.getPostId() == null) {
            throw new RuntimeException("参数错误");
        }
        User loginUser = userService.getLoginUser(request);
        Long loginUserId = loginUser.getId();
        Long blogId = doThumbRequest.getPostId();

        // Step 1: Lua 脚本写入 Redis 点赞状态（Redis 宕机时降级为 DB 查重）
        try {
            String userThumbKey = RedisKeyUtil.getUserThumbKey(loginUserId);
            long result = redisTemplate.execute(
                    RedisLuaScriptConstant.THUMB_SCRIPT_MQ,
                    List.of(userThumbKey),
                    blogId
            );
            if (LuaStatusEnum.FAIL.getValue() == result) {
                throw new RuntimeException("用户已点赞");
            }
        } catch (RuntimeException e) {
            // 业务异常直接抛出（如"用户已点赞"）
            throw e;
        } catch (Exception e) {
            // Redis 宕机 → 退到 DB 查重，避免事件丢失
            log.warn("Redis 不可用，降级为 DB 查重: userId={}, blogId={}", loginUserId, blogId);
            boolean exists = this.lambdaQuery()
                    .eq(Thumb::getUserId, loginUserId)
                    .eq(Thumb::getPostId, blogId)
                    .exists();
            if (exists) {
                throw new RuntimeException("用户已点赞");
            }
        }

        // Step 2: 构建事件（无论 Redis 是否可用都构造）
        ThumbEvent thumbEvent = ThumbEvent.builder()
                .blogId(blogId)
                .userId(loginUserId)
                .type(ThumbEvent.EventType.INCR)
                .eventTime(LocalDateTime.now())
                .build();

        // Step 3: 异步发送 Kafka，失败时委托 RedisImpl 降级暂存
        kafkaTemplate.send("thumb-topic", thumbEvent).whenComplete((sendResult, ex) -> {
            if (ex != null) {
                log.warn("点赞事件 Kafka 发送失败，委托 RedisImpl 降级暂存: userId={}, blogId={}",
                        loginUserId, blogId);
                thumbServiceRedis.registerDegradedEvent(loginUserId, blogId, ThumbEvent.EventType.INCR);
            } else {
                log.debug("点赞事件 Kafka 发送成功: userId={}, blogId={}", loginUserId, blogId);
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

        // Step 1: Lua 脚本删除 Redis 点赞状态（Redis 宕机时降级为 DB 查重）
        try {
            String userThumbKey = RedisKeyUtil.getUserThumbKey(loginUserId);
            long result = redisTemplate.execute(
                    RedisLuaScriptConstant.UNTHUMB_SCRIPT_MQ,
                    List.of(userThumbKey),
                    blogId
            );
            if (LuaStatusEnum.FAIL.getValue() == result) {
                throw new RuntimeException("用户未点赞");
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Redis 不可用，降级为 DB 校验取消点赞: userId={}, blogId={}", loginUserId, blogId);
            boolean exists = this.lambdaQuery()
                    .eq(Thumb::getUserId, loginUserId)
                    .eq(Thumb::getPostId, blogId)
                    .exists();
            if (!exists) {
                throw new RuntimeException("用户未点赞");
            }
        }

        // Step 2: 构建事件
        ThumbEvent thumbEvent = ThumbEvent.builder()
                .blogId(blogId)
                .userId(loginUserId)
                .type(ThumbEvent.EventType.DECR)
                .eventTime(LocalDateTime.now())
                .build();

        // Step 3: 异步发送 Kafka，失败时委托 RedisImpl 降级暂存
        kafkaTemplate.send("thumb-topic", thumbEvent).whenComplete((sendResult, ex) -> {
            if (ex != null) {
                log.warn("取消点赞事件 Kafka 发送失败，委托 RedisImpl 降级暂存: userId={}, blogId={}",
                        loginUserId, blogId);
                thumbServiceRedis.registerDegradedEvent(loginUserId, blogId, ThumbEvent.EventType.DECR);
            } else {
                log.debug("取消点赞事件 Kafka 发送成功: userId={}, blogId={}", loginUserId, blogId);
            }
        });

        return true;
    }

    @Override
    public Boolean hasThumb(Long postId, Long userId) {
        try {
            return redisTemplate.opsForHash()
                    .hasKey(RedisKeyUtil.getUserThumbKey(userId), postId.toString());
        } catch (Exception e) {
            // Redis 不可用 → 退到 DB 查询
            log.warn("Redis 不可用，hasThumb 降级为 DB 查询: userId={}, postId={}", userId, postId);
            return this.lambdaQuery()
                    .eq(Thumb::getUserId, userId)
                    .eq(Thumb::getPostId, postId)
                    .exists();
        }
    }

    @Override
    public Page<Post> listMyThumbPosts(IPage<Post> page, long userId) {
        return this.baseMapper.listMyThumbPosts(page, userId);
    }
}
