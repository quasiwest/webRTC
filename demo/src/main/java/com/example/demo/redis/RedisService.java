package com.example.demo.redis;


import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class  RedisService {
    private static final String SESSION_COUNTER_KEY = "session_number";
    private static final String SESSION_KEY_PREFIX = "session:";



    @Autowired
    private RedisTemplate<String, Object> redisTemplate;


    // 세션 ID를 1씩 증가시키고 새 세션을 위한 키를 생성
    private Long generateSessionId() {
        return redisTemplate.opsForValue().increment(SESSION_COUNTER_KEY);
    }

    // 처음 방 세션을 생성할 때
    public void saveSessionInfo(String sessionId, int bookId, int roleId) {

        Long sessionNumber = generateSessionId();
        String sessionKey = SESSION_KEY_PREFIX + sessionNumber;
        HashOperations<String, Object, Object> hashOperations = redisTemplate.opsForHash();

        Map<Object, Object> sessionInfo = new HashMap<>();

        sessionInfo.put("session_id", sessionId);
        sessionInfo.put("book_id", bookId);
        sessionInfo.put("role_id", roleId);

        hashOperations.putAll(sessionKey, sessionInfo);

    }

    // 세션 정보 조회
    public Map<Object, Object> getSessionInfo(Long sessionId) {
        String sessionKey = SESSION_KEY_PREFIX + sessionId;
        HashOperations<String, Object, Object> hashOperations = redisTemplate.opsForHash();
        return hashOperations.entries(sessionKey);
    }

}
