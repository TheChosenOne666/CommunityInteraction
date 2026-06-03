package com.xiaolou.community.job;

import com.google.common.collect.Sets;
import com.xiaolou.community.constant.ThumbConstant;
import com.xiaolou.community.model.dto.thumb.ThumbEvent;
import com.xiaolou.community.model.entity.Thumb;
import com.xiaolou.community.service.ThumbService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 点赞数据对账定时任务
 * 每天凌晨2点执行，比对 Redis 和 MySQL 的点赞数据一致性
 */
@Service
@Slf4j
public class ThumbReconcileJob {

    @Resource
    private RedisTemplate<String, Object> redisTemplate;

    @Resource
    private ThumbService thumbService;

    @Resource
    private KafkaTemplate<String, Object> kafkaTemplate;

    /**
     * 定时任务入口（每天凌晨2点执行）
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public void run() {
        long startTime = System.currentTimeMillis();
        log.info("开始执行点赞数据对账任务");

        // 1. 获取该分片下的所有用户ID
        Set<Long> userIds = new HashSet<>();
        String pattern = ThumbConstant.USER_THUMB_KEY_PREFIX + "*";
        try (Cursor<String> cursor = redisTemplate.scan(ScanOptions.scanOptions()
                .match(pattern)
                .count(1000)
                .build())) {
            while (cursor.hasNext()) {
                String key = cursor.next();
                Long userId = Long.valueOf(key.replace(ThumbConstant.USER_THUMB_KEY_PREFIX, ""));
                userIds.add(userId);
            }
        } catch (Exception e) {
            log.error("扫描Redis键失败", e);
            return;
        }

        log.info("扫描到 {} 个用户需要进行对账", userIds.size());

        // 2. 逐用户比对
        int totalDiffCount = 0;
        for (Long userId : userIds) {
            try {
                // 获取Redis中的点赞博客ID集合
                Set<Object> redisBlogIdObjects = redisTemplate.opsForHash()
                        .keys(ThumbConstant.USER_THUMB_KEY_PREFIX + userId);
                Set<Long> redisBlogIds = redisBlogIdObjects.stream()
                        .map(obj -> Long.valueOf(obj.toString()))
                        .collect(Collectors.toSet());

                // 获取MySQL中的点赞博客ID集合（只查询当天1点之前的数据，给足消息队列处理时间）
                LocalDateTime cutoffTime = LocalDateTime.now().minusHours(1);
                List<Thumb> thumbs = thumbService.lambdaQuery()
                        .eq(Thumb::getUserId, userId)
                        .lt(Thumb::getCreateTime, cutoffTime)
                        .list();
                
                Set<Long> mysqlBlogIds = Optional.ofNullable(thumbs)
                        .orElse(new ArrayList<>())
                        .stream()
                        .map(Thumb::getPostId)
                        .collect(Collectors.toSet());

                // 3. 计算差异（Redis有但MySQL无）
                Set<Long> diffBlogIds = Sets.difference(redisBlogIds, mysqlBlogIds);

                if (!diffBlogIds.isEmpty()) {
                    log.warn("用户 {} 存在 {} 条不一致数据", userId, diffBlogIds.size());
                    totalDiffCount += diffBlogIds.size();
                    
                    // 4. 发送补偿事件
                    sendCompensationEvents(userId, diffBlogIds);
                }
                
            } catch (Exception e) {
                log.error("用户 {} 对账失败", userId, e);
            }
        }

        long endTime = System.currentTimeMillis();
        log.info("对账任务完成，共发现 {} 条不一致数据，耗时 {}ms", totalDiffCount, endTime - startTime);
    }

    /**
     * 发送补偿事件到Kafka
     */
    private void sendCompensationEvents(Long userId, Set<Long> blogIds) {
        blogIds.forEach(blogId -> {
            ThumbEvent thumbEvent = ThumbEvent.builder()
                    .userId(userId)
                    .blogId(blogId)
                    .type(ThumbEvent.EventType.INCR)
                    .eventTime(LocalDateTime.now())
                    .build();
            
            kafkaTemplate.send("thumb-topic", thumbEvent)
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            log.error("补偿事件发送失败: userId={}, blogId={}", userId, blogId, ex);
                        } else {
                            log.info("补偿事件发送成功: userId={}, blogId={}", userId, blogId);
                        }
                    });
        });
    }
}
