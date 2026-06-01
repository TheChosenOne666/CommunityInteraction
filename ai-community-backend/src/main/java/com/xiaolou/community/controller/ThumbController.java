package com.xiaolou.community.controller;

import com.xiaolou.community.common.BaseResponse;
import com.xiaolou.community.common.ResultUtils;
import com.xiaolou.community.model.dto.postthumb.DoThumbRequest;
import com.xiaolou.community.service.ThumbService;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("thumb")  
public class ThumbController {  
    @Resource  
    private ThumbService thumbServiceRedis;

    /**
     * 点赞
     * @param doThumbRequest
     * @param request
     * @return
     */
    @PostMapping("/do")  
    public BaseResponse<Boolean> doThumb(@RequestBody DoThumbRequest doThumbRequest, HttpServletRequest request) {  
        Boolean success = thumbServiceRedis.doThumb(doThumbRequest, request);
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
        Boolean success = thumbServiceRedis.undoThumb(doThumbRequest, request);
        return ResultUtils.success(success);
    }

}
