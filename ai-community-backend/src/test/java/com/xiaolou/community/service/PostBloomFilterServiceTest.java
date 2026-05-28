package com.xiaolou.community.service;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import jakarta.annotation.Resource;

/**
 * 博客布隆过滤器服务测试
 *
 * @author <a href="https://github.com/TheChosenOne666">小楼</a>
 */
@SpringBootTest
class PostBloomFilterServiceTest {

    @Resource
    private PostBloomFilterService postBloomFilterService;

    @Test
    void testMightContain() {
        // 测试一个可能存在的ID（需要根据实际情况调整）
        boolean result = postBloomFilterService.mightContain(1L);
        System.out.println("Blog ID 1 exists: " + result);
        
        // 测试一个肯定不存在的ID
        boolean nonExistent = postBloomFilterService.mightContain(999999999L);
        System.out.println("Blog ID 999999999 exists: " + nonExistent);
        
        // 布隆过滤器说不存在，那一定不存在
        Assertions.assertFalse(nonExistent);
    }

    @Test
    void testAdd() {
        Long testPostId = 999999998L;
        
        // 添加前应该不存在
        boolean beforeAdd = postBloomFilterService.mightContain(testPostId);
        System.out.println("Before add: " + beforeAdd);
        
        // 添加
        postBloomFilterService.add(testPostId);
        
        // 添加后应该存在（可能有误判）
        boolean afterAdd = postBloomFilterService.mightContain(testPostId);
        System.out.println("After add: " + afterAdd);
        
        // 添加后应该返回 true
        Assertions.assertTrue(afterAdd);
    }

    @Test
    void testCount() {
        long count = postBloomFilterService.count();
        System.out.println("Bloom filter contains " + count + " elements");
        Assertions.assertTrue(count >= 0);
    }
}
