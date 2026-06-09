package com.xiaolou.community.mapper;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.xiaolou.community.model.entity.Post;
import com.xiaolou.community.model.entity.Thumb;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;

/**
 * 帖子点赞数据库操作
 *
 * @author <a href="https://github.com/TheChosenOne666">小楼</a>
 * @from <a href="https://github.com/TheChosenOne666">TheChosenOne666</a>
 */
public interface PostThumbMapper extends BaseMapper<Thumb> {

    Page<Post> listMyThumbPosts(IPage<Post> page, @Param("userId") long userId);

}




