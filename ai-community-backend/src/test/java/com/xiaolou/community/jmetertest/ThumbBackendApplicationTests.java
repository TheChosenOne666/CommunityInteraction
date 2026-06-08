package com.xiaolou.community.jmetertest;

import cn.hutool.core.util.RandomUtil;
import com.xiaolou.community.model.entity.User;
import com.xiaolou.community.service.UserService;
import jakarta.annotation.Resource;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.io.FileWriter;
import java.io.PrintWriter;
import java.time.LocalDateTime;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest
@AutoConfigureMockMvc
class ThumbBackendApplicationTests {

    @Resource
    private UserService userService;
        
    @Resource
    private MockMvc mockMvc;

    @Test
    void testLoginAndExportSessionToCsv() throws Exception {
        List<User> list = userService.list();

        try (PrintWriter writer = new PrintWriter(new FileWriter("session_output.csv", true))) {
            // 如果文件是第一次写入，可以加一个逻辑写表头
            writer.println("userId,sessionId,timestamp");

            for (User user : list) {
                long testUserId = user.getId();

                MvcResult result = mockMvc.perform(post("/user/login")
                                .param("userId", String.valueOf(testUserId))
                                .contentType(String.valueOf(MediaType.APPLICATION_JSON)))
                        .andReturn();

                List<String> setCookieHeaders = result.getResponse().getHeaders("Set-Cookie");
                String sessionValue = "";  // 默认为空，允许缺失

                if (setCookieHeaders != null && !setCookieHeaders.isEmpty()) {
                    sessionValue = setCookieHeaders.stream()
                            .filter(cookie -> cookie.startsWith("SESSION"))
                            .map(cookie -> cookie.split(";")[0])
                            .findFirst()
                            .map(cookie -> cookie.split("=")[1])
                            .orElse("");  // 有 cookie 但没找到 SESSION 时也设为空
                }

                writer.printf("%d,%s,%s%n", testUserId, sessionValue, LocalDateTime.now());
                System.out.println("✅ 写入 CSV：" + testUserId + " -> " + (sessionValue.isEmpty() ? "(空)" : sessionValue));
            }
        }
    }

    @Test
    void addUser() {
        for (int i = 0; i < 50000; i++) {
            User user = new User();
            user.setUserAccount(RandomUtil.randomString(8));
            user.setUserPassword(RandomUtil.randomString(8));
            user.setUserName(RandomUtil.randomString(6));
            userService.save(user);
        }
    }
}