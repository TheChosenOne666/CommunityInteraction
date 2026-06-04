package com.xiaolou.community.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xiaolou.community.common.BaseResponse;
import com.xiaolou.community.common.ErrorCode;
import com.xiaolou.community.common.ResultUtils;
import com.xiaolou.community.exception.BusinessException;
import com.xiaolou.community.exception.ThrowUtils;
import com.xiaolou.community.model.dto.comment.CommentAddRequest;
import com.xiaolou.community.model.dto.comment.CommentQueryRequest;
import com.xiaolou.community.model.dto.comment.CommentThumbRequest;
import com.xiaolou.community.model.entity.Comment;
import com.xiaolou.community.model.entity.CommentThumb;
import com.xiaolou.community.model.entity.User;
import com.xiaolou.community.model.vo.CommentVO;
import com.xiaolou.community.mapper.CommentThumbMapper;
import com.xiaolou.community.service.CommentService;
import com.xiaolou.community.service.UserService;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

/**
 * 评论接口
 *
 * @author <a href="https://github.com/TheChosenOne666">小楼</a>
 */
@RestController
@RequestMapping("/comment")
@Slf4j
public class CommentController {

    @Resource
    private CommentService commentService;

    @Resource
    private UserService userService;

    @Resource
    private CommentThumbMapper commentThumbMapper;

    /**
     * 添加评论
     */
    @PostMapping("/add")
    public BaseResponse<Long> addComment(@RequestBody CommentAddRequest commentAddRequest,
                                          HttpServletRequest request) {
        if (commentAddRequest == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        Comment comment = new Comment();
        comment.setContent(commentAddRequest.getContent());
        comment.setPostId(commentAddRequest.getPostId());
        comment.setParentId(commentAddRequest.getParentId() != null ? commentAddRequest.getParentId() : 0);
        comment.setReplyToUserId(commentAddRequest.getReplyToUserId() != null
                ? commentAddRequest.getReplyToUserId() : 0);
        commentService.validComment(comment, true);
        User loginUser = userService.getLoginUser(request);
        comment.setUserId(loginUser.getId());
        comment.setThumbNum(0);
        boolean result = commentService.save(comment);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return ResultUtils.success(comment.getId());
    }

    /**
     * 删除评论（仅本人或管理员）
     */
    @PostMapping("/delete")
    public BaseResponse<Boolean> deleteComment(@RequestParam long id, HttpServletRequest request) {
        if (id <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        Comment comment = commentService.getById(id);
        ThrowUtils.throwIf(comment == null, ErrorCode.NOT_FOUND_ERROR);
        User user = userService.getLoginUser(request);
        if (!comment.getUserId().equals(user.getId()) && !userService.isAdmin(request)) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR);
        }
        boolean result = commentService.removeById(id);
        return ResultUtils.success(result);
    }

    /**
     * 分页获取帖子的评论列表
     */
    @PostMapping("/list/page/vo")
    public BaseResponse<Page<CommentVO>> listCommentVOByPage(
            @RequestBody CommentQueryRequest commentQueryRequest,
            HttpServletRequest request) {
        if (commentQueryRequest == null || commentQueryRequest.getPostId() == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        long current = commentQueryRequest.getCurrent();
        long size = commentQueryRequest.getPageSize();
        ThrowUtils.throwIf(size > 20, ErrorCode.PARAMS_ERROR);
        Page<CommentVO> voPage = commentService.listPostComments(
                commentQueryRequest.getPostId(), current, size, request
        );
        return ResultUtils.success(voPage);
    }

    /**
     * 获取某条评论的所有子评论
     */
    @GetMapping("/replies")
    public BaseResponse<Page<CommentVO>> getReplies(
            @RequestParam long parentId,
            @RequestParam(defaultValue = "1") long current,
            @RequestParam(defaultValue = "10") long pageSize,
            HttpServletRequest request) {
        if (parentId <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        CommentQueryRequest req = new CommentQueryRequest();
        req.setParentId(parentId);
        req.setCurrent(current);
        req.setPageSize(pageSize);
        req.setSortField("createTime");
        req.setSortOrder("asc");
        com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<Comment> qw =
                commentService.getQueryWrapper(req);
        com.baomidou.mybatisplus.extension.plugins.pagination.Page<Comment> page =
                commentService.page(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(current, pageSize), qw);
        return ResultUtils.success(commentService.getCommentVOPage(page, request));
    }

    /**
     * 评论点赞
     */
    @PostMapping("/thumb")
    public BaseResponse<Boolean> thumbComment(@RequestBody CommentThumbRequest thumbRequest,
                                               HttpServletRequest request) {
        if (thumbRequest == null || thumbRequest.getCommentId() == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        User loginUser = userService.getLoginUser(request);
        long commentId = thumbRequest.getCommentId();
        Comment comment = commentService.getById(commentId);
        ThrowUtils.throwIf(comment == null, ErrorCode.NOT_FOUND_ERROR);

        // 检查是否已点赞
        com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<CommentThumb> qw =
                new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<>();
        qw.eq("commentId", commentId);
        qw.eq("userId", loginUser.getId());
        CommentThumb existing = commentThumbMapper.selectOne(qw);

        if (existing != null) {
            // 取消点赞
            commentThumbMapper.deleteById(existing.getId());
            comment.setThumbNum(Math.max(0, (comment.getThumbNum() != null ? comment.getThumbNum() : 0) - 1));
            commentService.updateById(comment);
            return ResultUtils.success(false);
        } else {
            // 点赞
            CommentThumb thumb = new CommentThumb();
            thumb.setCommentId(commentId);
            thumb.setUserId(loginUser.getId());
            thumb.setCreateTime(new java.util.Date());
            commentThumbMapper.insert(thumb);
            comment.setThumbNum((comment.getThumbNum() != null ? comment.getThumbNum() : 0) + 1);
            commentService.updateById(comment);
            return ResultUtils.success(true);
        }
    }

    /**
     * 获取帖子的评论总数
     */
    @GetMapping("/count")
    public BaseResponse<Long> getCommentCount(@RequestParam long postId) {
        if (postId <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<Comment> qw =
                new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<>();
        qw.eq("postId", postId);
        long count = commentService.count(qw);
        return ResultUtils.success(count);
    }
}
