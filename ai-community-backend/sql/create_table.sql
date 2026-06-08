# 数据库初始化
# @author <a href="https://github.com/TheChosenOne666">小楼</a>
# @from <a href="https://github.com/TheChosenOne666">TheChosenOne666</a>

-- 创建库
create database if not exists community;

-- 切换库
use community;

-- 用户表
create table if not exists user
(
    id           bigint auto_increment comment 'id' primary key,
    userAccount  varchar(256)                           not null comment '账号',
    userPassword varchar(512)                           not null comment '密码',
    userName     varchar(256)                           null comment '用户昵称',
    userAvatar   varchar(1024)                          null comment '用户头像',
    userProfile  varchar(512)                           null comment '用户简介',
    userRole     varchar(256) default 'user'            not null comment '用户角色：user/admin/ban',
    createTime   datetime     default CURRENT_TIMESTAMP not null comment '创建时间',
    updateTime   datetime     default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP comment '更新时间',
    isDelete     tinyint      default 0                 not null comment '是否删除'
) comment '用户' collate = utf8mb4_unicode_ci;

-- 帖子表
create table if not exists post
(
    id         bigint auto_increment comment 'id' primary key,
    title      varchar(512)                       null comment '标题',
    coverImg   varchar(1024)                      null comment '封面',
    content    text                               null comment '内容',
    tags       varchar(1024)                      null comment '标签列表（json 数组）',
    thumbNum   int      default 0                 not null comment '点赞数',
    favourNum  int      default 0                 not null comment '收藏数',
    userId     bigint                             not null comment '创建用户 id',
    createTime datetime default CURRENT_TIMESTAMP not null comment '创建时间',
    updateTime datetime default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP comment '更新时间',
    isDelete   tinyint  default 0                 not null comment '是否删除',
    index idx_userId (userId)
) comment '帖子' collate = utf8mb4_unicode_ci;

-- 帖子点赞表（硬删除）
create table if not exists post_thumb
(
    id         bigint auto_increment comment 'id' primary key,
    postId     bigint                             not null comment '帖子 id',
    userId     bigint                             not null comment '创建用户 id',
    createTime datetime default CURRENT_TIMESTAMP not null comment '创建时间',
    updateTime datetime default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP comment '更新时间',
    index idx_postId (postId),
    index idx_userId (userId)
) comment '帖子点赞';

-- 帖子收藏表（硬删除）
create table if not exists post_favour
(
    id         bigint auto_increment comment 'id' primary key,
    postId     bigint                             not null comment '帖子 id',
    userId     bigint                             not null comment '创建用户 id',
    createTime datetime default CURRENT_TIMESTAMP not null comment '创建时间',
    updateTime datetime default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP comment '更新时间',
    index idx_postId (postId),
    index idx_userId (userId)
) comment '帖子收藏';

-- 评论表
create table if not exists comment
(
    id            bigint auto_increment comment 'id' primary key,
    content       text                               not null comment '评论内容',
    postId        bigint                             not null comment '帖子 id',
    userId        bigint                             not null comment '评论用户 id',
    parentId      bigint   default 0                 not null comment '父评论 id，0 表示顶级评论',
    replyToUserId bigint   default 0                 not null comment '回复目标用户 id',
    thumbNum      int      default 0                 not null comment '点赞数',
    createTime    datetime default CURRENT_TIMESTAMP not null comment '创建时间',
    updateTime    datetime default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP comment '更新时间',
    isDelete      tinyint  default 0                 not null comment '是否删除',
    index idx_postId (postId),
    index idx_userId (userId),
    index idx_parentId (parentId)
) comment '评论' collate = utf8mb4_unicode_ci;

-- 评论点赞表（硬删除）
create table if not exists comment_thumb
(
    id         bigint auto_increment comment 'id' primary key,
    commentId  bigint                             not null comment '评论 id',
    userId     bigint                             not null comment '用户 id',
    createTime datetime default CURRENT_TIMESTAMP not null comment '创建时间',
    index idx_commentId (commentId),
    index idx_userId (userId),
    unique key uk_comment_user (commentId, userId)
) comment '评论点赞';

-- AI分析报告表
create table if not exists post_analysis
(
    id                bigint auto_increment comment 'id' primary key,
    postId            bigint                             not null comment '帖子 id',
    aiComment         text                               null comment 'AI 生成的评论',
    rawResponse       mediumtext                         null comment '原始 AI 响应',
    status            varchar(32)  default 'PENDING'     not null comment '分析状态：PENDING/SUCCESS/FAILED',
    errorMessage      varchar(512)                       null comment '错误信息',
    createTime        datetime     default CURRENT_TIMESTAMP not null comment '创建时间',
    updateTime        datetime     default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP comment '更新时间',
    isDelete          tinyint      default 0             not null comment '是否删除',
    unique key uk_postId (postId),
    index idx_postId (postId)
) comment 'AI分析报告' collate = utf8mb4_unicode_ci;
