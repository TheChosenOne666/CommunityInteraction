package com.xiaolou.community.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.xiaolou.community.model.dto.comment.CommentQueryRequest;
import com.xiaolou.community.model.entity.Comment;
import com.xiaolou.community.model.vo.CommentVO;
import jakarta.servlet.http.HttpServletRequest;

/**
 * 评论服务
 */
public interface CommentService extends IService<Comment> {

    /**
     * 校验评论
     */
    void validComment(Comment comment, boolean add);

    /**
     * 获取查询条件
     */
    QueryWrapper<Comment> getQueryWrapper(CommentQueryRequest commentQueryRequest);

    /**
     * 获取评论 VO（含用户信息、点赞状态、子评论）
     */
    CommentVO getCommentVO(Comment comment, HttpServletRequest request);

    /**
     * 分页获取评论 VO
     */
    Page<CommentVO> getCommentVOPage(Page<Comment> commentPage, HttpServletRequest request);

    /**
     * 获取帖子的评论列表（含顶级评论及前几条子评论）
     */
    Page<CommentVO> listPostComments(long postId, long current, long pageSize, HttpServletRequest request);
}
