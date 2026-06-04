package com.xiaolou.community.model.dto.comment;

import java.io.Serializable;
import lombok.Data;

/**
 * 评论点赞请求
 */
@Data
public class CommentThumbRequest implements Serializable {

    private Long commentId;

    private static final long serialVersionUID = 1L;
}
