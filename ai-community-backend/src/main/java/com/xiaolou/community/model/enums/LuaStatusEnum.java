package com.xiaolou.community.model.enums;

import lombok.Getter;

/**
 * Lua 脚本执行结果枚举
 *
 * @author pine
 */
@Getter
public enum LuaStatusEnum {  
    // 成功  
    SUCCESS(1L),  
    // 失败  
    FAIL(-1L),  
    ;  
  
    private final long value;  
  
    LuaStatusEnum(long value) {  
        this.value = value;  
    }  
}
