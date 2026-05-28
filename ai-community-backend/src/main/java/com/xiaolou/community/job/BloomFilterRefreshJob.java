package com.xiaolou.community.job;

import com.xiaolou.community.service.PostBloomFilterService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 布隆过滤器定时任务
 * 定期重新初始化布隆过滤器，清理脏数据
 *
 * @author <a href="https://github.com/TheChosenOne666">小楼</a>
 */
@Slf4j
@Component
public class BloomFilterRefreshJob {

    @Resource
    private PostBloomFilterService postBloomFilterService;

    /**
     * 每天凌晨3点重新初始化布隆过滤器
     * cron表达式：秒 分 时 日 月 周
     */
    @Scheduled(cron = "0 0 3 * * ?")
    public void refreshBloomFilter() {
        log.info("========== 开始执行布隆过滤器刷新任务 ==========");
        
        try {
            long startTime = System.currentTimeMillis();
            
            // 重新初始化布隆过滤器
            postBloomFilterService.reInit();
            
            long endTime = System.currentTimeMillis();
            long duration = endTime - startTime;
            
            log.info("========== 布隆过滤器刷新任务完成，耗时: {}ms ==========", duration);
        } catch (Exception e) {
            log.error("布隆过滤器刷新任务执行失败", e);
        }
    }

    /**
     * 每小时统计一次布隆过滤器状态（可选，用于监控）
     */
    @Scheduled(cron = "0 0 * * * ?")
    public void logBloomFilterStats() {
        try {
            long count = postBloomFilterService.count();
            log.info("布隆过滤器当前元素数量: {}", count);
        } catch (Exception e) {
            log.error("获取布隆过滤器状态失败", e);
        }
    }
}
