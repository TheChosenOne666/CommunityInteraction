package com.xiaolou.community.model.vo;

import java.io.Serializable;
import java.util.Date;
import java.util.List;
import lombok.Data;

/**
 * 评论视图
 */
@Data
public class CommentVO implements Serializable {

    private Long id;

    private String content;

    private Long postId;

    private Long userId;

    private Long parentId;

    private Long replyToUserId;

    private Integer thumbNum;

    private Date createTime;

    private Date updateTime;

    /**
     * 评论用户信息
     */
    private UserVO user;

    /**
     * 回复目标用户信息
     */
    private UserVO replyToUser;

    /**
     * 当前用户是否已点赞
     */
    private Boolean hasThumb;

    /**
     * 子评论列表
     */
    private List<CommentVO> replies;

    /**
     * 子评论总数
     */
    private Integer replyCount;

    private static final long serialVersionUID = 1L;
}
