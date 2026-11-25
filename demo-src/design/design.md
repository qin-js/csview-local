---
title: 常见系统设计题
author: csview-local 示例
---

### 设计一个秒杀系统<Badge text="重要" type="danger" />

秒杀的本质矛盾是**瞬时百万请求 vs 库存只有几百**，所以整体思路是「**层层过滤，把流量在到达数据库之前削掉 99.99%**」。

从上到下五层：

1. **前端**：按钮置灰防重复点击，答题 / 验证码打散请求时间，静态资源全部 CDN。
2. **接入层**：Nginx / 网关按用户和 IP 限流，同一用户 N 秒内只放行一次；活动未开始直接拒绝。
3. **应用层**：库存预热到 Redis，用 Lua 原子扣减；扣减成功才生成订单消息投进 MQ，失败立即返回「已售罄」并**打上售罄标记**，后续请求在本地内存就短路掉。
4. **异步层**：MQ 削峰，订单服务按数据库能承受的速度消费落库。
5. **数据层**：库存扣减用 `update ... set stock = stock - 1 where id = ? and stock > 0`，靠行锁 + 条件保证不超卖，作为最后兜底。

库存扣减的 Lua 骨架：

```sql
-- 语义示意：Redis Lua，判断与扣减必须原子
local stock = tonumber(redis.call('GET', KEYS[1]))
if stock == nil or stock <= 0 then return -1 end
if redis.call('SISMEMBER', KEYS[2], ARGV[1]) == 1 then return -2 end  -- 已购
redis.call('DECR', KEYS[1])
redis.call('SADD', KEYS[2], ARGV[1])
return 1
```

::: warning 三个必须回答的追问
- **超卖**：Redis 扣减成功但落库失败怎么办？要有对账与库存回补，且 DB 层仍带 `stock > 0` 条件。
- **少卖**：用户下单不付款，库存要能超时释放，用延迟消息回滚。
- **热点 key**：单个库存 key 会把一个 Redis 分片打满，需要库存分桶（把 100 拆成 10 份各 10）分散压力。
:::

### 设计一个分布式限流器<Badge text="重要" type="danger" />

先区分四种算法的取舍：

| 算法 | 允许突发 | 实现复杂度 | 说明 |
| --- | --- | --- | --- |
| 固定窗口计数 | 边界处 2 倍 | 最低 | 简单但有临界突刺 |
| 滑动窗口日志 | 否 | 高 | 精确，但要存每次请求时间 |
| 滑动窗口计数 | 少量 | 中 | 按小格子加权，工程折中 |
| 令牌桶 | **是** | 中 | 匀速发牌，桶容量决定突发上限 |
| 漏桶 | 否 | 中 | 强制恒定速率流出 |

分布式场景把状态放 Redis，用 Lua 保证「取状态 + 算补充 + 扣减」原子。令牌桶只需要存 `tokens` 和 `last_refill_ts` 两个字段，按时间差惰性补牌，不需要定时任务：

```sql
-- 语义示意：令牌桶惰性补牌
local tokens = tonumber(redis.call('HGET', KEYS[1], 'tokens')) or capacity
local last   = tonumber(redis.call('HGET', KEYS[1], 'ts')) or now
tokens = math.min(capacity, tokens + (now - last) * rate)
if tokens < 1 then return 0 end
redis.call('HMSET', KEYS[1], 'tokens', tokens - 1, 'ts', now)
return 1
```

::: tip 怎么选
对外 API 网关一般用令牌桶，因为要容忍客户端的正常突发；对下游数据库或第三方接口的保护用漏桶，因为对方要的是平稳速率。**单机限流 + 分布式限流两级并存**，本地先挡掉大部分，减少 Redis 压力。
:::

### 设计一个短链系统<Badge text="掌握" type="tip" />

核心是把长 URL 映射成 6~8 位短码，并保证**发号不冲突、跳转足够快**。

**发号**方案对比：

- **哈希取前 N 位**：实现简单但会碰撞，需要处理冲突重试。
- **自增 ID 转 62 进制**：天然无冲突，6 位 62 进制可表示 568 亿。分布式下用号段模式（每次从发号器取 1000 个号缓存在本地）或雪花算法，避免每次请求都访问中心节点。

**存储**用 KV：`shortCode → longUrl`，读多写少，Redis 缓存热点短码，MySQL 做持久化。

**跳转用 301 还是 302**？301 永久重定向会被浏览器缓存，后续不再经过你的服务，省流量但**统计不到点击**；302 每次都回源，能做点击统计和风控。商业短链基本都选 302。

::: info 容易被追问的点
- 同一个长 URL 要不要复用短码？复用省空间，但无法区分渠道来源，通常按「长 URL + 渠道」做唯一键。
- 怎么防恶意刷？发号接口限流 + 长 URL 黑名单 + 目标站点安全检测。
- 过期清理？给短码设 TTL，冷数据归档，避免主表无限膨胀。
:::