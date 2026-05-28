package com.xiaolou.community.controller;

import com.xiaolou.community.annotation.AuthCheck;
import com.xiaolou.community.common.BaseResponse;
import com.xiaolou.community.common.ErrorCode;
import com.xiaolou.community.common.ResultUtils;
import com.xiaolou.community.constant.UserConstant;
import com.xiaolou.community.exception.BusinessException;
import com.xiaolou.community.service.PostBloomFilterService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * 布隆过滤器管理接口
 * 仅管理员可访问
 *
 * @author <a href="https://github.com/TheChosenOne666">小楼</a>
 */
@RestController
@RequestMapping("/bloom-filter")
@Slf4j
public class BloomFilterController {

    @Resource
    private PostBloomFilterService postBloomFilterService;

    /**
     * 手动重新初始化布隆过滤器
     * 仅管理员可调用
     *
     * @return 执行结果
     */
    @PostMapping("/reinit")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    public BaseResponse<Map<String, Object>> reinit() {
        log.info("管理员手动触发布隆过滤器重新初始化");
        
        Map<String, Object> result = new HashMap<>();
        
        try {
            long startTime = System.currentTimeMillis();
            
            // 获取初始化前的元素数量
            long beforeCount = postBloomFilterService.count();
            result.put("beforeCount", beforeCount);
            
            // 重新初始化
            postBloomFilterService.reInit();
            
            // 获取初始化后的元素数量
            long afterCount = postBloomFilterService.count();
            result.put("afterCount", afterCount);
            
            long endTime = System.currentTimeMillis();
            long duration = endTime - startTime;
            result.put("duration", duration);
            result.put("success", true);
            result.put("message", "布隆过滤器重新初始化成功");
            
            log.info("布隆过滤器重新初始化完成，耗时: {}ms, 元素数量: {} -> {}", 
                    duration, beforeCount, afterCount);
            
        } catch (Exception e) {
            log.error("布隆过滤器重新初始化失败", e);
            result.put("success", false);
            result.put("message", "重新初始化失败: " + e.getMessage());
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "布隆过滤器重新初始化失败");
        }
        
        return ResultUtils.success(result);
    }

    /**
     * 获取布隆过滤器状态
     * 仅管理员可调用
     *
     * @return 状态信息
     */
    @PostMapping("/status")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    public BaseResponse<Map<String, Object>> getStatus() {
        Map<String, Object> status = new HashMap<>();
        
        try {
            long count = postBloomFilterService.count();
            status.put("count", count);
            status.put("exists", true);
            status.put("success", true);
            
            log.info("查询布隆过滤器状态，元素数量: {}", count);
            
        } catch (Exception e) {
            log.error("获取布隆过滤器状态失败", e);
            status.put("exists", false);
            status.put("success", false);
            status.put("error", e.getMessage());
        }
        
        return ResultUtils.success(status);
    }

    /**
     * 获取布隆过滤器监控指标
     * 仅管理员可调用
     *
     * @return 监控指标
     */
    @PostMapping("/metrics")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    public BaseResponse<Map<String, Object>> getMetrics() {
        try {
            Map<String, Object> metrics = postBloomFilterService.getMetrics();
            metrics.put("success", true);
            
            log.info("查询布隆过滤器监控指标: {}", metrics);
            
            return ResultUtils.success(metrics);
        } catch (Exception e) {
            log.error("获取布隆过滤器监控指标失败", e);
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "获取监控指标失败");
        }
    }
}
