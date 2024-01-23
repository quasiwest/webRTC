package com.basic.java.demoredis.redis;


import com.basic.java.demoredis.redis.dto.RedisReqDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RedisController {

    @Autowired
    private RedisService redisService;

    @PostMapping("/redis")
    public boolean create(@RequestBody RedisReqDto reqDto){
        redisService.setRedisValue(reqDto.getKey(),reqDto.getValue());
        return true;
    }

    @GetMapping("/redis")
    public String read (@RequestParam String key){
        return redisService.getRedisValue(key);
    }

    @PutMapping("/redis")
    public boolean update(@RequestBody RedisReqDto reqDto){
        redisService.updateReidsValue(reqDto.getKey(),reqDto.getValue());
        return true;
    }

    @DeleteMapping("/redis")
    public boolean delete(@RequestBody RedisReqDto reqDto){
        redisService.deleteRedisValue(reqDto.getKey());
        return true;
    }

}
