package com.xiaolou.community.config;

import com.volcengine.ark.runtime.service.ArkService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * AI 配置 - 火山引擎 Ark
 *
 * @author <a href="https://github.com/TheChosenOne666">小楼</a>
 */
@Configuration
public class AiConfig {

    @Value("${ai.api-key}")
    private String apiKey;

    @Bean
    public ArkService arkService() {
        return ArkService.builder()
                .apiKey(apiKey)
                .baseUrl("https://ark.cn-beijing.volces.com/api/v3")
                .build();
    }
}
