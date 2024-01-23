package com.basic.java.demoredis.redis;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class  RedisService {
    private final int LIMIT_TIME = 3 * 60; //3분

    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    public void setRedisValue(String key, String value) {
        ValueOperations<String,String> stringValueOperations = stringRedisTemplate.opsForValue();
        stringValueOperations.set(key, value);
//        stringValueOperations.set(key,value,LIMIT_TIME);


    }
    public String getRedisValue(String key) {
        ValueOperations<String,String> stringValueOperations = stringRedisTemplate.opsForValue();
        String value = stringValueOperations.get(key);
        if(value == null){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
        return value;
    }

    //update
    public void updateReidsValue(String key, String value) {
        ValueOperations<String,String> stringValueOperations = stringRedisTemplate.opsForValue();
        stringValueOperations.getAndSet(key,value);

    }

    public void deleteRedisValue(String key) {
        stringRedisTemplate.delete(key);
    }
}
