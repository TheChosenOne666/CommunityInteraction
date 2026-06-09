package com.xiaolou.community.controller;

import com.xiaolou.community.common.BaseResponse;
import com.xiaolou.community.common.ErrorCode;
import com.xiaolou.community.common.ResultUtils;
import com.xiaolou.community.exception.BusinessException;
import com.xiaolou.community.exception.ThrowUtils;
import com.xiaolou.community.model.dto.post.PostQueryRequest;
import com.xiaolou.community.model.dto.postthumb.DoThumbRequest;
import com.xiaolou.community.model.entity.Post;
import com.xiaolou.community.model.entity.User;
import com.xiaolou.community.model.vo.PostVO;
import com.xiaolou.community.service.ThumbService;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xiaolou.community.service.PostService;
import com.xiaolou.community.service.UserService;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("thumb")  
@Slf4j
public class ThumbController {  
    @Resource  
    private ThumbService thumbService;

    @Resource
    private PostService postService;

    @Resource
    private UserService userService;


    /**
     * 点赞
     * @param doThumbRequest
     * @param request
     * @return
     */
    @PostMapping("/do")  
    public BaseResponse<Boolean> doThumb(@RequestBody DoThumbRequest doThumbRequest, HttpServletRequest request) {  
        Boolean success = thumbService.doThumb(doThumbRequest, request);
        return ResultUtils.success(success);  
    }

    /**
     * 取消点赞
     * @param doThumbRequest
     * @param request
     * @return
     */
    @PostMapping("/undo")
    public BaseResponse<Boolean> undoThumb(@RequestBody DoThumbRequest doThumbRequest, HttpServletRequest request) {
        Boolean success = thumbService.undoThumb(doThumbRequest, request);
        return ResultUtils.success(success);
    }

    /**
     * 获取我点赞的帖子列表
     *
     * @param postQueryRequest
     * @param request
     */
    @PostMapping("/my/list/page")
    public BaseResponse<Page<PostVO>> listMyThumbPostByPage(@RequestBody PostQueryRequest postQueryRequest,
            HttpServletRequest request) {
        if (postQueryRequest == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        User loginUser = userService.getLoginUser(request);
        long current = postQueryRequest.getCurrent();
        long size = postQueryRequest.getPageSize();
        // 限制爬虫
        ThrowUtils.throwIf(size > 20, ErrorCode.PARAMS_ERROR);
        Page<Post> postPage = thumbService.listMyThumbPosts(new Page<>(current, size), loginUser.getId());
        return ResultUtils.success(postService.getPostVOPage(postPage, request));
    }

}
