package com.xiaolou.community.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.listener.ContainerProperties;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.util.backoff.ExponentialBackOff;

/**
 * Kafka 消费者配置
 */
@Configuration
public class ThumbConsumerConfig {

    /**
     * 配置批量处理策略、重试策略和死信队列
     */
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object> kafkaListenerContainerFactory(
            ConsumerFactory<String, Object> consumerFactory,
            KafkaTemplate<String, Object> kafkaTemplate) {
        ConcurrentKafkaListenerContainerFactory<String, Object> factory = 
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        
        // 启用批量消费
        factory.setBatchListener(true);
        
        // 设置轮询超时时间（毫秒）
        factory.getContainerProperties().setPollTimeout(10000);
        
        // 配置手动ACK
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL_IMMEDIATE);
        
        // 配置死信队列
        DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(kafkaTemplate,
                (record, exception) -> {
                    // 死信主题名称：原主题名 + .DLT
                    return new org.apache.kafka.common.TopicPartition("thumb-topic.DLT", record.partition());
                });
        
        // 配置指数退避重试策略
        ExponentialBackOff backOff = new ExponentialBackOff();
        // 初始延迟 1 秒
        backOff.setInitialInterval(1000L);
        // 最大延迟 60 秒
        backOff.setMaxInterval(60000L);
        // 每次重试延迟倍数 2 (1s -> 2s -> 4s)
        backOff.setMultiplier(2.0);
        // 计算最大重试时长: 1s + 2s + 4s = 7s, 设置为略大于7s确保能完成3次重试
        // 这样总共会处理4次: 第1次正常处理 + 3次重试
        backOff.setMaxElapsedTime(8000L);
        
        // 创建错误处理器，结合重试和死信
        DefaultErrorHandler errorHandler = new DefaultErrorHandler(recoverer, backOff);
        
        // 添加不重试的异常类型（可选）
        // errorHandler.addNotRetryableExceptions(IllegalArgumentException.class);
        
        factory.setCommonErrorHandler(errorHandler);
        
        return factory;
    }

    /**
     * 死信队列专用监听容器工厂
     * 死信队列的消息不应该再重试或重新投递，避免循环处理
     */
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object> dlqKafkaListenerContainerFactory(
            ConsumerFactory<String, Object> consumerFactory) {
        ConcurrentKafkaListenerContainerFactory<String, Object> factory = 
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        
        // 死信队列不启用批量消费（单条处理）
        factory.setBatchListener(false);
        
        // 设置轮询超时时间（毫秒）
        factory.getContainerProperties().setPollTimeout(10000);
        
        // 配置自动ACK
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.BATCH);
        
        // 死信队列不配置重试和死信发布器，避免消息循环
        // 死信消息应该被记录并人工处理，而不是再次投递
        
        return factory;
    }
}
