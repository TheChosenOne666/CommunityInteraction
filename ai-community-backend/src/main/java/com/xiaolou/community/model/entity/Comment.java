package com.xiaolou.community.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

/**
 * 评论
 *
 * @author <a href="https://github.com/TheChosenOne666">小楼</a>
 */
@TableName(value = "comment")
@Data
public class Comment implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    /**
     * 评论内容
     */
    private String content;

    /**
     * 帖子 id
     */
    private Long postId;

    /**
     * 评论用户 id
     */
    private Long userId;

    /**
     * 父评论 id，0 表示顶级评论
     */
    private Long parentId;

    /**
     * 回复目标用户 id
     */
    private Long replyToUserId;

    /**
     * 点赞数
     */
    private Integer thumbNum;

    /**
     * 创建时间
     */
    private Date createTime;

    /**
     * 更新时间
     */
    private Date updateTime;

    /**
     * 是否删除
     */
    @TableLogic
    private Integer isDelete;

    private static final long serialVersionUID = 1L;
}
