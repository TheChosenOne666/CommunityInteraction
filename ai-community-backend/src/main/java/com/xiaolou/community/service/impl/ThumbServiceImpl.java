package com.xiaolou.community.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.xiaolou.community.mapper.PostThumbMapper;
import com.xiaolou.community.model.dto.postthumb.DoThumbRequest;
import com.xiaolou.community.model.entity.Post;
import com.xiaolou.community.model.entity.Thumb;
import com.xiaolou.community.model.entity.User;
import com.xiaolou.community.service.PostService;
import com.xiaolou.community.service.ThumbService;
import com.xiaolou.community.service.UserService;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;


/**
 * 点赞服务实现
 *
 * @author <a href="https://github.com/TheChosenOne666">小楼</a>
 * @from <a href="https://github.com/TheChosenOne666">TheChosenOne666</a>
 */
@Service
@Slf4j
public class ThumbServiceImpl extends ServiceImpl<PostThumbMapper, Thumb> implements ThumbService {

    @Resource
    private PostService postService;

    @Resource
    private UserService userService;

    @Resource
    private TransactionTemplate transactionTemplate;
      
    @Override  
    public Boolean doThumb(DoThumbRequest doThumbRequest, HttpServletRequest request) {  
        if (doThumbRequest == null || doThumbRequest.getPostId() == null) {
            throw new RuntimeException("参数错误");  
        }  
        User loginUser = userService.getLoginUser(request);  
        // 加锁  
        synchronized (loginUser.getId().toString().intern()) {  
      
            // 编程式事务  
            return transactionTemplate.execute(status -> {  
                Long blogId = doThumbRequest.getPostId();
                boolean exists = this.lambdaQuery()  
                        .eq(Thumb::getUserId, loginUser.getId())  
                        .eq(Thumb::getPostId, blogId)
                        .exists();  
                if (exists) {  
                    throw new RuntimeException("用户已点赞");  
                }  
      
                boolean update = postService.lambdaUpdate()
                        .eq(Post::getId, blogId)
                        .setSql("thumbNum = thumbNum + 1")
                        .update();  
      
                Thumb thumb = new Thumb();  
                thumb.setUserId(loginUser.getId());  
                thumb.setPostId(blogId);
                // 更新成功才执行  
                return update && this.save(thumb);  
            });  
        }  
    }

    @Override
    public Boolean undoThumb(DoThumbRequest doThumbRequest, HttpServletRequest request) {
        if (doThumbRequest == null || doThumbRequest.getPostId() == null) {
            throw new RuntimeException("参数错误");
        }
        User loginUser = userService.getLoginUser(request);
        // 加锁
        synchronized (loginUser.getId().toString().intern()) {

            // 编程式事务
            return transactionTemplate.execute(status -> {
                Long blogId = doThumbRequest.getPostId();
                Thumb thumb = this.lambdaQuery()
                        .eq(Thumb::getUserId, loginUser.getId())
                        .eq(Thumb::getPostId, blogId)
                        .one();
                if (thumb == null) {
                    throw new RuntimeException("用户未点赞");
                }
                boolean update = postService.lambdaUpdate()
                        .eq(Post::getId, blogId)
                        .setSql("thumbNum = thumbNum - 1")
                        .update();

                return update && this.removeById(thumb.getId());
            });
        }
    }

}
