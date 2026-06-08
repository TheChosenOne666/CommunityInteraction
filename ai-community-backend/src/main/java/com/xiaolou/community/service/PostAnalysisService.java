package com.xiaolou.community.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.xiaolou.community.model.entity.PostAnalysis;
import com.xiaolou.community.model.vo.PostAnalysisVO;

/**
 * AI分析报告服务
 *
 * @author <a href="https://github.com/TheChosenOne666">小楼</a>
 */
public interface PostAnalysisService extends IService<PostAnalysis> {

    /**
     * 根据帖子ID获取分析报告
     */
    PostAnalysisVO getAnalysisByPostId(Long postId);

    /**
     * 触发异步 AI 分析
     */
    void triggerAnalysis(Long postId, String title, String content, String tags);

    /**
     * 执行 AI 分析（异步调用）
     */
    void executeAnalysis(Long postId, String title, String content, String tags);
}
