package com.xiaolou.community.service.impl;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.volcengine.ark.runtime.model.responses.constant.ResponsesConstants;
import com.volcengine.ark.runtime.model.responses.content.InputContentItemText;
import com.volcengine.ark.runtime.model.responses.item.ItemEasyMessage;
import com.volcengine.ark.runtime.model.responses.item.MessageContent;
import com.volcengine.ark.runtime.model.responses.request.CreateResponsesRequest;
import com.volcengine.ark.runtime.model.responses.request.ResponsesInput;
import com.volcengine.ark.runtime.model.responses.response.ResponseObject;
import com.volcengine.ark.runtime.service.ArkService;
import com.xiaolou.community.mapper.PostAnalysisMapper;
import com.xiaolou.community.model.entity.Comment;
import com.xiaolou.community.model.entity.PostAnalysis;
import com.xiaolou.community.model.entity.User;
import com.xiaolou.community.model.vo.PostAnalysisVO;
import com.xiaolou.community.service.CommentService;
import com.xiaolou.community.service.PostAnalysisService;
import com.xiaolou.community.service.UserService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Date;

/**
 * AI 分析报告服务实现
 *
 * @author <a href="https://github.com/TheChosenOne666">小楼</a>
 */
@Service
@Slf4j
public class PostAnalysisServiceImpl extends ServiceImpl<PostAnalysisMapper, PostAnalysis> implements PostAnalysisService {

    @Resource
    private ArkService arkService;

    @Resource
    private CommentService commentService;

    @Resource
    private UserService userService;

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private static final String MODEL = "deepseek-v4-pro-260425";

    private static final String BOT_ACCOUNT = "ai_assistant";

    private static final String BOT_NAME = "小助手楼楼";

    /**
     * 获取或创建 AI 助手用户
     */
    private Long getBotUserId() {
        QueryWrapper<User> wrapper = new QueryWrapper<>();
        wrapper.eq("userAccount", BOT_ACCOUNT);
        User bot = userService.getOne(wrapper);
        if (bot != null) {
            return bot.getId();
        }
        // 创建 AI 助手用户
        try {
            long botId = userService.userRegister(BOT_ACCOUNT, "xiaolou-ai-bot-2024", "xiaolou-ai-bot-2024");
            // 设置昵称
            User newBot = userService.getById(botId);
            if (newBot != null) {
                newBot.setUserName(BOT_NAME);
                userService.updateById(newBot);
            }
            log.info("AI 助手用户创建成功，ID: {}", botId);
            return botId;
        } catch (Exception e) {
            // 可能并发创建了，再次查询
            bot = userService.getOne(wrapper);
            if (bot != null) {
                return bot.getId();
            }
            log.error("创建 AI 助手用户失败", e);
            return null;
        }
    }

    @Override
    public PostAnalysisVO getAnalysisByPostId(Long postId) {
        QueryWrapper<PostAnalysis> wrapper = new QueryWrapper<>();
        wrapper.eq("postId", postId);
        PostAnalysis analysis = this.getOne(wrapper);
        if (analysis == null) {
            // 检查是否正在分析中
            return createPendingVO(postId);
        }
        return toVO(analysis);
    }

    @Override
    @Async("taskExecutor")
    public void triggerAnalysis(Long postId, String title, String content, String tags) {
        // 先创建 PENDING 记录
        PostAnalysis pending = new PostAnalysis();
        pending.setPostId(postId);
        pending.setStatus("PENDING");
        pending.setCreateTime(new Date());
        pending.setUpdateTime(new Date());
        this.save(pending);
        log.info("AI 分析任务已提交，postId: {}", postId);

        // 执行分析
        executeAnalysisInternal(postId, title, content, tags);
    }

    private void executeAnalysisInternal(Long postId, String title, String content, String tags) {
        try {
            // 1. 调用 AI 分析
            String aiResponse = callAiForAnalysis(title, content, tags);
            log.info("AI 分析完成，postId: {}, response length: {}", postId,
                    aiResponse != null ? aiResponse.length() : 0);

            // 2. 解析 JSON 响应
            JSONObject result = parseAiResponse(aiResponse);
            if (result == null) {
                markFailed(postId, "AI 响应解析失败");
                return;
            }

            // 3. 更新分析记录
            updateAnalysisResult(postId, result, aiResponse);

            // 4. 将 AI 建议评论发布到帖子评论区
            postAiComments(postId, result);

            log.info("AI 分析及评论发布完成，postId: {}", postId);
        } catch (Exception e) {
            log.error("AI 分析失败，postId: {}", postId, e);
            markFailed(postId, e.getMessage());
        }
    }

    /**
     * 调用火山引擎 AI 模型进行内容分析
     */
    private String callAiForAnalysis(String title, String content, String tags) {
        String prompt = buildAnalysisPrompt(title, content, tags);

        CreateResponsesRequest req = CreateResponsesRequest.builder()
                .model(MODEL)
                .input(ResponsesInput.builder()
                        .addListItem(ItemEasyMessage.builder()
                                .role(ResponsesConstants.MESSAGE_ROLE_USER)
                                .content(MessageContent.builder()
                                        .addListItem(InputContentItemText.builder().text(prompt).build())
                                        .build())
                                .build())
                        .build())
                .build();

        ResponseObject resp = arkService.createResponse(req);
        return extractTextFromResponse(resp);
    }

    /**
     * 构建分析提示词
     */
    private String buildAnalysisPrompt(String title, String content, String tags) {
        return String.format("""
                你是小楼社区里的一位热心成员。看到有人发帖，你会认真阅读后写一条真诚的评论参与讨论。

                帖子标题：%s
                帖子内容：%s
                标签：%s

                请写一条评论（150-400字），要求：
                - 像真人社区成员一样自然地表达，不要使用任何 emoji 表情
                - 绝对不要提"AI"、"分析"、"助手"、"生成"等暴露身份的词
                - 针对帖子内容表达你的看法、提问或补充，引发良性讨论
                - 语气要真诚、有见地，像一个真正对话题感兴趣的同好

                只返回 JSON 格式（不要用 ```json``` 包裹）：
                {
                  "comment": "一条详细的评论"
                }
                """, escapeJson(title), escapeJson(content), tags != null ? tags : "无");
    }

    /**
     * 转义 JSON 字符串中的特殊字符
     */
    private String escapeJson(String text) {
        if (text == null) return "";
        return text.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    /**
     * 从 AI 响应中提取文本内容
     */
    private String extractTextFromResponse(ResponseObject resp) {
        try {
            // Responses API 返回的格式可能包含 output 数组
            String json = OBJECT_MAPPER.writeValueAsString(resp);
            JSONObject root = JSONUtil.parseObj(json);

            // 尝试多种路径提取文本
            if (root.containsKey("output")) {
                JSONArray output = root.getJSONArray("output");
                if (output != null && !output.isEmpty()) {
                    for (int i = 0; i < output.size(); i++) {
                        JSONObject item = output.getJSONObject(i);
                        if ("message".equals(item.getStr("type")) && item.containsKey("content")) {
                            JSONArray contentArr = item.getJSONArray("content");
                            if (contentArr != null) {
                                for (int j = 0; j < contentArr.size(); j++) {
                                    JSONObject c = contentArr.getJSONObject(j);
                                    if ("output_text".equals(c.getStr("type"))) {
                                        return c.getStr("text");
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 兜底：尝试从 modelResponse 等字段获取
            if (root.containsKey("modelResponse")) {
                return root.getStr("modelResponse");
            }

            return json;
        } catch (Exception e) {
            log.error("提取 AI 响应文本失败", e);
            return resp.toString();
        }
    }

    /**
     * 解析 AI 返回的 JSON
     */
    private JSONObject parseAiResponse(String aiResponse) {
        if (aiResponse == null || aiResponse.isBlank()) return null;
        try {
            // 清理可能的 markdown 代码块包裹
            String cleaned = aiResponse.trim();
            if (cleaned.startsWith("```json")) {
                cleaned = cleaned.substring(7);
            } else if (cleaned.startsWith("```")) {
                cleaned = cleaned.substring(3);
            }
            if (cleaned.endsWith("```")) {
                cleaned = cleaned.substring(0, cleaned.length() - 3);
            }
            cleaned = cleaned.trim();

            // 尝试从文本中提取 JSON 对象
            int start = cleaned.indexOf('{');
            int end = cleaned.lastIndexOf('}');
            if (start >= 0 && end > start) {
                cleaned = cleaned.substring(start, end + 1);
            }

            return JSONUtil.parseObj(cleaned);
        } catch (Exception e) {
            log.error("解析 AI 响应 JSON 失败: {}", aiResponse, e);
            return null;
        }
    }

    /**
     * 更新分析结果到数据库
     */
    private void updateAnalysisResult(Long postId, JSONObject result, String rawResponse) {
        QueryWrapper<PostAnalysis> wrapper = new QueryWrapper<>();
        wrapper.eq("postId", postId);
        PostAnalysis analysis = this.getOne(wrapper);
        if (analysis == null) return;

        analysis.setAiComment(result.getStr("comment"));
        analysis.setRawResponse(rawResponse);
        analysis.setStatus("SUCCESS");
        analysis.setUpdateTime(new Date());
        this.updateById(analysis);
    }

    /**
     * 标记分析失败
     */
    private void markFailed(Long postId, String errorMessage) {
        QueryWrapper<PostAnalysis> wrapper = new QueryWrapper<>();
        wrapper.eq("postId", postId);
        PostAnalysis analysis = this.getOne(wrapper);
        if (analysis == null) return;
        analysis.setStatus("FAILED");
        analysis.setErrorMessage(errorMessage != null && errorMessage.length() > 500
                ? errorMessage.substring(0, 500) : errorMessage);
        analysis.setUpdateTime(new Date());
        this.updateById(analysis);
    }

    /**
     * 发布 AI 评论到帖子评论区（只发布一条）
     */
    private void postAiComments(Long postId, JSONObject result) {
        Long botUserId = getBotUserId();
        if (botUserId == null) {
            log.error("无法获取 AI 助手用户 ID，跳过评论发布");
            return;
        }

        String comment = result.getStr("comment");
        if (comment != null && !comment.isBlank()) {
            saveBotComment(postId, botUserId, comment);
            log.info("AI 评论已发布，postId: {}", postId);
        } else {
            log.warn("AI 生成的评论为空，postId: {}", postId);
        }
    }

    /**
     * 保存 bot 评论
     */
    private void saveBotComment(Long postId, Long userId, String content) {
        try {
            Comment comment = new Comment();
            comment.setContent(content);
            comment.setPostId(postId);
            comment.setUserId(userId);
            comment.setParentId(0L);
            comment.setReplyToUserId(0L);
            comment.setThumbNum(0);
            comment.setCreateTime(new Date());
            commentService.save(comment);
        } catch (Exception e) {
            log.error("发布 AI 评论失败，postId: {}, userId: {}", postId, userId, e);
        }
    }

    /**
     * 创建 PENDING 状态的 VO（前端轮询时使用）
     */
    private PostAnalysisVO createPendingVO(Long postId) {
        PostAnalysisVO vo = new PostAnalysisVO();
        vo.setPostId(postId);
        vo.setStatus("PENDING");
        return vo;
    }

    /**
     * Entity 转 VO
     */
    private PostAnalysisVO toVO(PostAnalysis entity) {
        PostAnalysisVO vo = new PostAnalysisVO();
        vo.setId(entity.getId());
        vo.setPostId(entity.getPostId());
        vo.setAiComment(entity.getAiComment());
        vo.setStatus(entity.getStatus());
        vo.setErrorMessage(entity.getErrorMessage());
        vo.setCreateTime(entity.getCreateTime());
        return vo;
    }

    @Override
    public void executeAnalysis(Long postId, String title, String content, String tags) {
        executeAnalysisInternal(postId, title, content, tags);
    }
}
