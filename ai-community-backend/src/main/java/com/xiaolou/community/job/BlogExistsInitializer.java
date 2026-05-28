package com.xiaolou.community.job;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xiaolou.community.mapper.PostMapper;
import com.xiaolou.community.model.entity.Post;
import com.xiaolou.community.utils.RedisKeyUtil;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * 博客存在性标记初始化器
 * 应用启动时自动同步所有有效博客的存在性标记到 Redis
 */
@Slf4j
@Component
@Order(1)  // 确保在其他组件之前执行
public class BlogExistsInitializer implements ApplicationRunner {

    @Resource
    private PostMapper postMapper;

    @Resource
    private RedisTemplate<String, Object> redisTemplate;

    @Override
    public void run(ApplicationArguments args) {
        log.info("========== 开始初始化博客存在性标记 ==========");
        
        long startTime = System.currentTimeMillis();
        
        // 统计数据库中有效博客总数
        long totalCount = postMapper.selectCount(
            new LambdaQueryWrapper<Post>().eq(Post::getIsDelete, 0)
        );
        
        if (totalCount == 0) {
            log.info("数据库中无博客数据，跳过初始化");
            return;
        }
        
        log.info("数据库中共有 {} 条有效博客，开始同步...", totalCount);
        
        // 分批同步，避免一次性加载过多数据
        long pageSize = 1000;
        long syncedCount = 0;
        long skippedCount = 0;
        long totalPages = (totalCount + pageSize - 1) / pageSize;
        
        for (long currentPage = 1; currentPage <= totalPages; currentPage++) {
            List<Post> posts = postMapper.selectPage(
                new Page<>(currentPage, pageSize),
                new LambdaQueryWrapper<Post>()
                    .eq(Post::getIsDelete, 0)
                    .select(Post::getId)  // 只查询 ID，减少网络传输
            ).getRecords();
            
            if (posts.isEmpty()) {
                break;
            }
            
            for (Post post : posts) {
                String blogExistsKey = RedisKeyUtil.getBlogExistsKey(post.getId());
                
                // setIfAbsent: 如果 key 不存在则设置，避免覆盖已有的 TTL
                Boolean success = redisTemplate.opsForValue()
                    .setIfAbsent(blogExistsKey, "1", 30, TimeUnit.DAYS);
                
                if (Boolean.TRUE.equals(success)) {
                    syncedCount++;
                } else {
                    skippedCount++;
                }
            }
            
            // 每 10 批打印一次进度
            if (currentPage % 10 == 0 || currentPage == totalPages) {
                long processedCount = currentPage * pageSize;
                double progress = (processedCount * 100.0) / totalCount;
                log.info("同步进度: [{}/{}] {:.2f}%, 新增: {}, 已存在: {}", 
                    processedCount > totalCount ? totalCount : processedCount,
                    totalCount,
                    progress,
                    syncedCount,
                    skippedCount
                );
            }
        }
        
        long elapsed = System.currentTimeMillis() - startTime;
        log.info("========== 博客存在性标记初始化完成 ==========");
        log.info("总博客数: {}, 新增标记: {}, 已存在: {}, 耗时: {}ms", 
            totalCount, syncedCount, skippedCount, elapsed);
        
        // 计算覆盖率
        double coverageRate = (syncedCount + skippedCount) * 100.0 / totalCount;
        log.info("标记覆盖率: {:.2f}%", coverageRate);
        
        if (coverageRate < 95.0) {
            log.warn("⚠️  标记覆盖率低于 95%，可能存在数据不一致问题！");
        }
    }
}
