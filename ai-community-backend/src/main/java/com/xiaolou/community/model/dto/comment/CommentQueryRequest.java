package com.xiaolou.community.model.dto.comment;

import java.io.Serializable;
import lombok.Data;

/**
 * 评论查询请求
 */
@Data
public class CommentQueryRequest implements Serializable {

    /**
     * 帖子 id
     */
    private Long postId;

    /**
     * 用户 id
     */
    private Long userId;

    /**
     * 父评论 id
     */
    private Long parentId;

    /**
     * 当前页
     */
    private long current = 1;

    /**
     * 每页大小
     */
    private long pageSize = 10;

    /**
     * 排序字段
     */
    private String sortField = "createTime";

    /**
     * 排序方式
     */
    private String sortOrder = "asc";

    private static final long serialVersionUID = 1L;
}
