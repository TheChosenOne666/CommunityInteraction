package com.xiaolou.community.consumer;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xiaolou.community.mapper.PostMapper;
import com.xiaolou.community.model.dto.thumb.ThumbEvent;
import com.xiaolou.community.model.entity.Thumb;
import com.xiaolou.community.service.ThumbService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

/**
 * 点赞消息消费者，处理异步点赞事件
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ThumbConsumer {

    private final PostMapper postMapper;
    private final ThumbService thumbService;

    /**
     * 批量处理点赞事件
     */
    @KafkaListener(
            topics = "thumb-topic",
            groupId = "thumb-group",
            containerFactory = "kafkaListenerContainerFactory"
    )
    @Transactional(rollbackFor = Exception.class)
    public void processBatch(List<ConsumerRecord<String, Object>> records, Acknowledgment ack) {
        log.info("ThumbConsumer processBatch: {}", records.size());
        
        try {
            Map<Long, Long> countMap = new ConcurrentHashMap<>();
            List<Thumb> thumbs = new ArrayList<>();
            
            // 并行处理消息
            LambdaQueryWrapper<Thumb> wrapper = new LambdaQueryWrapper<>();
            AtomicBoolean needRemove = new AtomicBoolean(false);

            // 提取事件并过滤无效消息
            List<ThumbEvent> events = records.stream()
                    .map(record -> (ThumbEvent) record.value())
                    .filter(Objects::nonNull)
                    .toList();

            // 按(userId, blogId)分组，并获取每个分组的最新事件
            Map<List<Object>, ThumbEvent> latestEvents = events.stream()
                    .collect(Collectors.groupingBy(
                            e -> Arrays.asList(e.getUserId(), e.getBlogId()),
                            Collectors.collectingAndThen(
                                    Collectors.toList(),
                                    list -> {
                                        // 按时间升序排序，取最后一个作为最新事件
                                        list.sort(Comparator.comparing(ThumbEvent::getEventTime));
                                        if (list.size() % 2 == 0) {
                                            return null;
                                        }
                                        return list.get(list.size() - 1);
                                    }
                            )
                    ));

            latestEvents.forEach((userBlogPair, event) -> {
                if (event == null) {
                    return;
                }
                ThumbEvent.EventType finalAction = event.getType();

                if (finalAction == ThumbEvent.EventType.INCR) {
                    countMap.merge(event.getBlogId(), 1L, Long::sum);
                    Thumb thumb = new Thumb();
                    thumb.setPostId(event.getBlogId());
                    thumb.setUserId(event.getUserId());
                    thumbs.add(thumb);
                } else {
                    needRemove.set(true);
                    wrapper.or().eq(Thumb::getUserId, event.getUserId())
                            .eq(Thumb::getPostId, event.getBlogId());
                    countMap.merge(event.getBlogId(), -1L, Long::sum);
                }
            });

            // 批量更新数据库
            if (needRemove.get()) {
                thumbService.remove(wrapper);
            }
            batchUpdatePosts(countMap);
            batchInsertThumbs(thumbs);
            
            // 手动提交ACK
            ack.acknowledge();
            log.info("批量处理完成，处理消息数: {}", records.size());
            
        } catch (Exception e) {
            log.error("批量处理点赞事件失败", e);
            throw e;
        }
    }

    /**
     * 批量更新帖子点赞数
     */
    public void batchUpdatePosts(Map<Long, Long> countMap) {
        if (!countMap.isEmpty()) {
            postMapper.batchUpdateThumbNum(countMap);
        }
    }

    /**
     * 批量插入点赞记录
     */
    public void batchInsertThumbs(List<Thumb> thumbs) {
        if (!thumbs.isEmpty()) {
            // 分批次插入
            thumbService.saveBatch(thumbs, 500);
        }
    }

    /**
     * 死信队列消费者
     * 处理重试多次后仍然失败的消息
     */
    @KafkaListener(
            topics = "thumb-topic.DLT",
            groupId = "thumb-dlq-group",
            containerFactory = "dlqKafkaListenerContainerFactory"
    )
    public void consumeDeadLetter(ConsumerRecord<String, Object> record) {
        log.warn("收到死信消息: topic={}, partition={}, offset={}", 
                record.topic(), record.partition(), record.offset());
        
        try {
            ThumbEvent event = (ThumbEvent) record.value();
            log.info("死信消息详情: userId={}, blogId={}, type={}, eventTime={}", 
                    event != null ? event.getUserId() : null,
                    event != null ? event.getBlogId() : null,
                    event != null ? event.getType() : null,
                    event != null ? event.getEventTime() : null);
            
            // TODO: 将死信消息存入数据库或通知相关人员处理
            // 例如：保存到 dead_letter_message 表
            // 例如：发送告警通知
            
            log.info("死信消息 {} 已记录，等待人工处理", record.offset());
            
        } catch (Exception e) {
            log.error("处理死信消息失败: offset={}", record.offset(), e);
        }
    }
}
