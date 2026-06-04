package com.xiaolou.community.service.impl;

import cn.hutool.core.collection.CollUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.xiaolou.community.common.ErrorCode;
import com.xiaolou.community.constant.CommonConstant;
import com.xiaolou.community.exception.BusinessException;
import com.xiaolou.community.exception.ThrowUtils;
import com.xiaolou.community.mapper.CommentMapper;
import com.xiaolou.community.mapper.CommentThumbMapper;
import com.xiaolou.community.model.dto.comment.CommentQueryRequest;
import com.xiaolou.community.model.entity.Comment;
import com.xiaolou.community.model.entity.CommentThumb;
import com.xiaolou.community.model.entity.User;
import com.xiaolou.community.model.vo.CommentVO;
import com.xiaolou.community.model.vo.UserVO;
import com.xiaolou.community.service.CommentService;
import com.xiaolou.community.service.UserService;
import com.xiaolou.community.utils.SqlUtils;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 评论服务实现
 */
@Service
@Slf4j
public class CommentServiceImpl extends ServiceImpl<CommentMapper, Comment> implements CommentService {

    @Resource
    private UserService userService;

    @Resource
    private CommentThumbMapper commentThumbMapper;

    @Override
    public void validComment(Comment comment, boolean add) {
        if (comment == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        String content = comment.getContent();
        Long postId = comment.getPostId();
        if (add) {
            ThrowUtils.throwIf(StringUtils.isBlank(content), ErrorCode.PARAMS_ERROR, "评论内容不能为空");
            ThrowUtils.throwIf(postId == null || postId <= 0, ErrorCode.PARAMS_ERROR, "帖子 ID 无效");
        }
        if (StringUtils.isNotBlank(content) && content.length() > 2048) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "评论内容过长");
        }
    }

    @Override
    public QueryWrapper<Comment> getQueryWrapper(CommentQueryRequest commentQueryRequest) {
        QueryWrapper<Comment> queryWrapper = new QueryWrapper<>();
        if (commentQueryRequest == null) {
            return queryWrapper;
        }
        Long postId = commentQueryRequest.getPostId();
        Long userId = commentQueryRequest.getUserId();
        Long parentId = commentQueryRequest.getParentId();
        String sortField = commentQueryRequest.getSortField();
        String sortOrder = commentQueryRequest.getSortOrder();

        queryWrapper.eq(postId != null && postId > 0, "postId", postId);
        queryWrapper.eq(userId != null && userId > 0, "userId", userId);
        queryWrapper.eq(parentId != null, "parentId", parentId);
        queryWrapper.orderBy(
                SqlUtils.validSortField(sortField),
                sortOrder.equals(CommonConstant.SORT_ORDER_ASC),
                sortField
        );
        return queryWrapper;
    }

    @Override
    public CommentVO getCommentVO(Comment comment, HttpServletRequest request) {
        CommentVO commentVO = new CommentVO();
        commentVO.setId(comment.getId());
        commentVO.setContent(comment.getContent());
        commentVO.setPostId(comment.getPostId());
        commentVO.setUserId(comment.getUserId());
        commentVO.setParentId(comment.getParentId());
        commentVO.setReplyToUserId(comment.getReplyToUserId());
        commentVO.setThumbNum(comment.getThumbNum() != null ? comment.getThumbNum() : 0);
        commentVO.setCreateTime(comment.getCreateTime());
        commentVO.setUpdateTime(comment.getUpdateTime());

        // 填充用户信息
        if (comment.getUserId() != null && comment.getUserId() > 0) {
            User user = userService.getById(comment.getUserId());
            commentVO.setUser(userService.getUserVO(user));
        }
        // 填充回复目标用户信息
        if (comment.getReplyToUserId() != null && comment.getReplyToUserId() > 0) {
            User replyToUser = userService.getById(comment.getReplyToUserId());
            commentVO.setReplyToUser(userService.getUserVO(replyToUser));
        }

        // 当前用户点赞状态
        User loginUser = userService.getLoginUserPermitNull(request);
        if (loginUser != null) {
            QueryWrapper<CommentThumb> thumbQuery = new QueryWrapper<>();
            thumbQuery.eq("commentId", comment.getId());
            thumbQuery.eq("userId", loginUser.getId());
            commentVO.setHasThumb(commentThumbMapper.selectCount(thumbQuery) > 0);
        } else {
            commentVO.setHasThumb(false);
        }

        return commentVO;
    }

    @Override
    public Page<CommentVO> getCommentVOPage(Page<Comment> commentPage, HttpServletRequest request) {
        List<Comment> commentList = commentPage.getRecords();
        Page<CommentVO> commentVOPage = new Page<>(
                commentPage.getCurrent(), commentPage.getSize(), commentPage.getTotal()
        );
        if (CollUtil.isEmpty(commentList)) {
            return commentVOPage;
        }

        // 批量获取用户信息
        Set<Long> userIdSet = new HashSet<>();
        for (Comment c : commentList) {
            if (c.getUserId() != null && c.getUserId() > 0) userIdSet.add(c.getUserId());
            if (c.getReplyToUserId() != null && c.getReplyToUserId() > 0) userIdSet.add(c.getReplyToUserId());
        }
        Map<Long, UserVO> userMap = new HashMap<>();
        if (!userIdSet.isEmpty()) {
            List<User> users = userService.listByIds(userIdSet);
            for (User user : users) {
                userMap.put(user.getId(), userService.getUserVO(user));
            }
        }

        // 当前用户点赞状态
        Map<Long, Boolean> hasThumbMap = new HashMap<>();
        User loginUser = userService.getLoginUserPermitNull(request);
        if (loginUser != null) {
            Set<Long> commentIdSet = commentList.stream().map(Comment::getId).collect(Collectors.toSet());
            QueryWrapper<CommentThumb> thumbQuery = new QueryWrapper<>();
            thumbQuery.in("commentId", commentIdSet);
            thumbQuery.eq("userId", loginUser.getId());
            List<CommentThumb> thumbs = commentThumbMapper.selectList(thumbQuery);
            thumbs.forEach(t -> hasThumbMap.put(t.getCommentId(), true));
        }

        List<CommentVO> voList = commentList.stream().map(c -> {
            CommentVO vo = new CommentVO();
            vo.setId(c.getId());
            vo.setContent(c.getContent());
            vo.setPostId(c.getPostId());
            vo.setUserId(c.getUserId());
            vo.setParentId(c.getParentId());
            vo.setReplyToUserId(c.getReplyToUserId());
            vo.setThumbNum(c.getThumbNum() != null ? c.getThumbNum() : 0);
            vo.setCreateTime(c.getCreateTime());
            vo.setUpdateTime(c.getUpdateTime());
            vo.setUser(userMap.get(c.getUserId()));
            vo.setReplyToUser(userMap.get(c.getReplyToUserId()));
            vo.setHasThumb(hasThumbMap.getOrDefault(c.getId(), false));
            return vo;
        }).collect(Collectors.toList());

        commentVOPage.setRecords(voList);
        return commentVOPage;
    }

    @Override
    public Page<CommentVO> listPostComments(long postId, long current, long pageSize,
                                             HttpServletRequest request) {
        // 查询顶级评论（parentId = 0），按时间倒序
        QueryWrapper<Comment> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("postId", postId);
        queryWrapper.eq("parentId", 0);
        queryWrapper.orderByDesc("createTime");

        Page<Comment> page = this.page(new Page<>(current, pageSize), queryWrapper);
        Page<CommentVO> voPage = getCommentVOPage(page, request);

        // 为每个顶级评论查询前 3 条子评论
        if (CollUtil.isNotEmpty(voPage.getRecords())) {
            for (CommentVO parent : voPage.getRecords()) {
                // 查询子评论数
                QueryWrapper<Comment> replyCountWrapper = new QueryWrapper<>();
                replyCountWrapper.eq("postId", postId);
                replyCountWrapper.eq("parentId", parent.getId());
                parent.setReplyCount((int) this.count(replyCountWrapper));

                // 查询前 3 条子评论
                QueryWrapper<Comment> replyWrapper = new QueryWrapper<>();
                replyWrapper.eq("parentId", parent.getId());
                replyWrapper.orderByAsc("createTime");
                Page<Comment> replyPage = this.page(new Page<>(1, 3), replyWrapper);
                if (CollUtil.isNotEmpty(replyPage.getRecords())) {
                    parent.setReplies(getCommentVOPage(replyPage, request).getRecords());
                }
            }
        }

        return voPage;
    }
}
