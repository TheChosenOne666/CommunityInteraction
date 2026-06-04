package com.xiaolou.community.model.dto.comment;

import java.io.Serializable;
import lombok.Data;

/**
 * 评论添加请求
 */
@Data
public class CommentAddRequest implements Serializable {

    /**
     * 评论内容
     */
    private String content;

    /**
     * 帖子 id
     */
    private Long postId;

    /**
     * 父评论 id（0 表示顶级评论）
     */
    private Long parentId;

    /**
     * 回复目标用户 id
     */
    private Long replyToUserId;

    private static final long serialVersionUID = 1L;
}
