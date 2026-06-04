package com.xiaolou.community.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

/**
 * 评论点赞
 */
@TableName(value = "comment_thumb")
@Data
public class CommentThumb implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private Long commentId;

    private Long userId;

    private Date createTime;

    private static final long serialVersionUID = 1L;
}
