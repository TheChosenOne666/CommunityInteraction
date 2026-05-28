package com.xiaolou.community.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xiaolou.community.model.entity.Post;
import org.apache.ibatis.annotations.Param;

import java.util.Date;
import java.util.List;
import java.util.Map;

/**
 * 帖子数据库操作
 *
 * @author <a href="https://github.com/TheChosenOne666">小楼</a>
 * @from <a href="https://github.com/TheChosenOne666">TheChosenOne666</a>
 */
public interface PostMapper extends BaseMapper<Post> {

    /**
     * 查询帖子列表（包括已被删除的数据）
     */
    List<Post> listPostWithDelete(Date minUpdateTime);

    /**
     * 批量更新帖子点赞数
     */
    void batchUpdateThumbNum(@Param("numMap")Map<Long, Long> numMap);
}




