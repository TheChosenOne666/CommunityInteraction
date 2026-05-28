package com.xiaolou.community.service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RBloomFilter;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * 博客布隆过滤器服务
 * 用于快速校验博客ID是否存在，防止无效点赞
 *
 * @author <a href="https://github.com/TheChosenOne666">小楼</a>
 */
@Slf4j
@Service
public class PostBloomFilterService {

    private static final String POST_BLOOM_FILTER_KEY = "post:bloom:filter";

    // 预期最大博客数量
    private static final long EXPECTED_INSERTIONS = 1_000_000L;

    // 误判率（0.01%）
    private static final double FALSE_POSITIVE_PROBABILITY = 0.0001;

    @Resource
    private RedissonClient redissonClient;

    @Resource
    private PostService postService;

    private RBloomFilter<Long> bloomFilter;

    // 监控指标
    private volatile long totalCheckCount = 0;      // 总校验次数
    private volatile long blockedCount = 0;         // 被拦截次数（不存在）
    private volatile long passedCount = 0;          // 通过次数（可能存在）
    
    // 降级标志：布隆过滤器是否可用
    private volatile boolean bloomFilterEnabled = true;

    /**
     * 初始化布隆过滤器
     */
    @PostConstruct
    public void init() {
        log.info("开始初始化博客布隆过滤器...");
        
        // 获取或创建布隆过滤器
        bloomFilter = redissonClient.getBloomFilter(POST_BLOOM_FILTER_KEY);
        
        // 如果布隆过滤器不存在或为空，则初始化
        if (!bloomFilter.isExists() || bloomFilter.count() == 0) {
            // 初始化布隆过滤器
            boolean initialized = bloomFilter.tryInit(EXPECTED_INSERTIONS, FALSE_POSITIVE_PROBABILITY);
            if (!initialized) {
                log.warn("布隆过滤器已存在，跳过初始化");
                return;
            }
            
            // 加载所有有效博客ID到布隆过滤器
            loadAllPostIds();
        } else {
            log.info("布隆过滤器已存在，包含 {} 个元素", bloomFilter.count());
        }
        
        log.info("博客布隆过滤器初始化完成");
    }

    /**
     * 加载所有有效博客ID到布隆过滤器
     */
    private void loadAllPostIds() {
        log.info("开始加载博客ID到布隆过滤器...");
        
        // 分批加载，避免一次性加载过多数据
        long current = 0;
        long batchSize = 1000;
        int totalCount = 0;
        
        while (true) {
            List<Long> postIds = postService.listValidPostIds(current, batchSize);
            if (postIds == null || postIds.isEmpty()) {
                break;
            }
            
            for (Long postId : postIds) {
                bloomFilter.add(postId);
                totalCount++;
            }
            
            current += batchSize;
            log.info("已加载 {} 个博客ID", totalCount);
        }
        
        log.info("博客ID加载完成，共 {} 个", totalCount);
    }

    /**
     * 判断博客ID是否可能存在（带降级策略）
     *
     * @param postId 博客ID
     * @return true-可能存在（需要进一步验证），false-一定不存在
     */
    public boolean mightContain(Long postId) {
        if (postId == null) {
            totalCheckCount++;
            blockedCount++;
            return false;
        }
        
        totalCheckCount++;
        
        // 降级策略：如果布隆过滤器不可用，直接返回true，让后续流程处理
        if (!bloomFilterEnabled) {
            log.debug("布隆过滤器已降级，跳过校验: postId={}", postId);
            passedCount++;
            return true;
        }
        
        try {
            boolean result = bloomFilter.contains(postId);
            
            if (result) {
                passedCount++;
            } else {
                blockedCount++;
            }
            
            return result;
        } catch (Exception e) {
            log.error("布隆过滤器校验失败，触发降级: postId={}", postId, e);
            // 触发降级：标记为不可用，返回true让后续流程处理
            bloomFilterEnabled = false;
            passedCount++;
            return true;
        }
    }

    /**
     * 添加博客ID到布隆过滤器
     * 在创建新博客时调用
     *
     * @param postId 博客ID
     */
    public void add(Long postId) {
        if (postId != null) {
            bloomFilter.add(postId);
            log.debug("添加博客ID到布隆过滤器: {}", postId);
        }
    }

    /**
     * 批量添加博客ID到布隆过滤器
     *
     * @param postIds 博客ID列表
     */
    public void addAll(List<Long> postIds) {
        if (postIds != null && !postIds.isEmpty()) {
            for (Long postId : postIds) {
                bloomFilter.add(postId);
            }
            log.debug("批量添加 {} 个博客ID到布隆过滤器", postIds.size());
        }
    }

    /**
     * 获取布隆过滤器中的元素数量
     *
     * @return 元素数量
     */
    public long count() {
        return bloomFilter.count();
    }

    /**
     * 重新初始化布隆过滤器
     * 用于全量刷新场景
     */
    public void reInit() {
        log.warn("重新初始化布隆过滤器...");
        
        // 重置监控指标
        totalCheckCount = 0;
        blockedCount = 0;
        passedCount = 0;
        
        // 恢复布隆过滤器可用状态
        bloomFilterEnabled = true;
        
        try {
            // 删除旧的布隆过滤器
            bloomFilter.delete();
            
            // 重新初始化
            bloomFilter.tryInit(EXPECTED_INSERTIONS, FALSE_POSITIVE_PROBABILITY);
            
            // 重新加载数据
            loadAllPostIds();
            
            log.info("布隆过滤器重新初始化完成");
        } catch (Exception e) {
            log.error("布隆过滤器重新初始化失败", e);
            // 如果重新初始化失败，再次标记为不可用
            bloomFilterEnabled = false;
            throw e;
        }
    }

    /**
     * 获取监控指标
     *
     * @return 监控数据
     */
    public Map<String, Object> getMetrics() {
        Map<String, Object> metrics = new java.util.HashMap<>();
        metrics.put("totalCheckCount", totalCheckCount);
        metrics.put("blockedCount", blockedCount);
        metrics.put("passedCount", passedCount);
        metrics.put("elementCount", bloomFilter.count());
        metrics.put("enabled", bloomFilterEnabled);
        
        // 计算拦截率
        if (totalCheckCount > 0) {
            double blockRate = (double) blockedCount / totalCheckCount * 100;
            metrics.put("blockRate", String.format("%.2f%%", blockRate));
        } else {
            metrics.put("blockRate", "0.00%");
        }
        
        return metrics;
    }
}
