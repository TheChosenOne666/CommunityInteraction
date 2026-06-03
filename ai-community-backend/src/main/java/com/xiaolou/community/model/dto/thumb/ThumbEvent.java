package com.xiaolou.community.model.dto.thumb;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 点赞事件
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ThumbEvent implements Serializable {

    /**
     * 用户ID
     */
    private Long userId;

    /**
     * 博客ID
     */
    private Long blogId;

    /**
     * 事件类型：INCR-点赞，DECR-取消点赞
     */
    private EventType type;

    /**
     * 事件时间
     */
    private LocalDateTime eventTime;

    /**
     * 事件类型枚举
     */
    public enum EventType {
        /**
         * 点赞（增加）
         */
        INCR,
        /**
         * 取消点赞（减少）
         */
        DECR
    }

    private static final long serialVersionUID = 1L;
}
