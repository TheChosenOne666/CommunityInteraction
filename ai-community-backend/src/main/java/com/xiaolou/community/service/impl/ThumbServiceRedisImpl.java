package com.xiaolou.community.service.impl;

import cn.hutool.core.date.DateTime;
import cn.hutool.core.date.DateUtil;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.xiaolou.community.constant.RedisLuaScriptConstant;
import com.xiaolou.community.mapper.PostThumbMapper;
import com.xiaolou.community.model.dto.postthumb.DoThumbRequest;
import com.xiaolou.community.model.entity.Thumb;
import com.xiaolou.community.model.entity.User;
import com.xiaolou.community.model.enums.LuaStatusEnum;
import com.xiaolou.community.service.ThumbService;
import com.xiaolou.community.service.UserService;
import com.xiaolou.community.utils.RedisKeyUtil;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Arrays;

@Service("thumbService")
@Slf4j
public class ThumbServiceRedisImpl extends ServiceImpl<PostThumbMapper, Thumb> implements ThumbService {

    @Resource
    private UserService userService;

    @Resource
    private RedisTemplate<String, Object> redisTemplate;
  
    @Override  
    public Boolean doThumb(DoThumbRequest doThumbRequest, HttpServletRequest request) {  
        if (doThumbRequest == null || doThumbRequest.getPostId() == null) {
            throw new RuntimeException("参数错误");  
        }  
        User loginUser = userService.getLoginUser(request);  
        Long blogId = doThumbRequest.getPostId();
  
        String timeSlice = getTimeSlice();  
        // Redis Key  
        String tempThumbKey = RedisKeyUtil.getTempThumbKey(timeSlice);  
        String userThumbKey = RedisKeyUtil.getUserThumbKey(loginUser.getId());  
  
        // 执行 Lua 脚本  
        long result = redisTemplate.execute(  
                RedisLuaScriptConstant.THUMB_SCRIPT,  
                Arrays.asList(tempThumbKey, userThumbKey),  
                loginUser.getId(),  
                blogId  
        );  
  
        if (LuaStatusEnum.FAIL.getValue() == result) {  
            throw new RuntimeException("用户已点赞");  
        }  
  
        // 更新成功才执行  
        return LuaStatusEnum.SUCCESS.getValue() == result;  
    }  
  
    @Override  
    public Boolean undoThumb(DoThumbRequest doThumbRequest, HttpServletRequest request) {  
        if (doThumbRequest == null || doThumbRequest.getPostId() == null) {
            throw new RuntimeException("参数错误");  
        }  
        User loginUser = userService.getLoginUser(request);  
  
        Long blogId = doThumbRequest.getPostId();
        // 计算时间片  
        String timeSlice = getTimeSlice();  
        // Redis Key  
        String tempThumbKey = RedisKeyUtil.getTempThumbKey(timeSlice);  
        String userThumbKey = RedisKeyUtil.getUserThumbKey(loginUser.getId());  
  
        // 执行 Lua 脚本  
        long result = redisTemplate.execute(  
                RedisLuaScriptConstant.UNTHUMB_SCRIPT,  
                Arrays.asList(tempThumbKey, userThumbKey),  
                loginUser.getId(),  
                blogId  
        );  
        // 根据返回值处理结果  
        if (result == LuaStatusEnum.FAIL.getValue()) {  
            throw new RuntimeException("用户未点赞");  
        }  
        return LuaStatusEnum.SUCCESS.getValue() == result;  
    }  
  
    private String getTimeSlice() {  
        DateTime nowDate = DateUtil.date();  
        // 获取到当前时间前最近的整数秒，比如当前 11:20:23 ，获取到 11:20:20  
        return DateUtil.format(nowDate, "HH:mm:") + (DateUtil.second(nowDate) / 10) * 10;  
    }  
  
    @Override  
    public Boolean hasThumb(Long blogId, Long userId) {  
        return redisTemplate.opsForHash().hasKey(RedisKeyUtil.getUserThumbKey(userId), blogId.toString());  
    }  
}
