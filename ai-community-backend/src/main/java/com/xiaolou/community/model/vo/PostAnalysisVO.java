package com.xiaolou.community.model.vo;

import java.io.Serializable;
import java.util.Date;
import lombok.Data;

/**
 * AI 分析报告视图
 *
 * @author <a href="https://github.com/TheChosenOne666">小楼</a>
 */
@Data
public class PostAnalysisVO implements Serializable {

    /**
     * id
     */
    private Long id;

    /**
     * 帖子 id
     */
    private Long postId;

    /**
     * AI 生成的评论
     */
    private String aiComment;

    /**
     * 分析状态：PENDING / SUCCESS / FAILED
     */
    private String status;

    /**
     * 错误信息
     */
    private String errorMessage;

    /**
     * 创建时间
     */
    private Date createTime;

    private static final long serialVersionUID = 1L;
}
