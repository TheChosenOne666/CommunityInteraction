package com.xiaolou.community.controller;

import com.xiaolou.community.common.BaseResponse;
import com.xiaolou.community.common.ErrorCode;
import com.xiaolou.community.common.ResultUtils;
import com.xiaolou.community.exception.BusinessException;
import com.xiaolou.community.model.vo.PostAnalysisVO;
import com.xiaolou.community.service.PostAnalysisService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * AI 分析报告接口
 *
 * @author <a href="https://github.com/TheChosenOne666">小楼</a>
 */
@RestController
@RequestMapping("/analysis")
@Slf4j
public class PostAnalysisController {

    @Resource
    private PostAnalysisService postAnalysisService;

    /**
     * 获取帖子的 AI 分析报告
     */
    @GetMapping("/post")
    public BaseResponse<PostAnalysisVO> getPostAnalysis(@RequestParam long postId) {
        if (postId <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        PostAnalysisVO vo = postAnalysisService.getAnalysisByPostId(postId);
        return ResultUtils.success(vo);
    }
}
