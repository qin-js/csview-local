---
title: MySQL 事务与 MVCC
author: csview-local 示例
---

### 事务的四大特性怎么实现？<Badge text="重要" type="danger" />

ACID 不是四个并列的功能，而是**由三种机制分别兜底**：

- **原子性 A**：`undo log`。每次修改都先记一条反向操作，回滚就是反向重放。
- **持久性 D**：`redo log` + WAL。先顺序写日志并刷盘，数据页可以稍后再刷；崩溃后重放 redo 即可恢复。
- **隔离性 I**：锁 + MVCC。写写冲突靠行锁，读写冲突靠多版本快照。
- **一致性 C**：是上面三者共同达成的**结果**，再叠加业务约束（外键、唯一键、检查）。

### 四种隔离级别分别解决什么问题？<Badge text="重要" type="danger" />

| 隔离级别 | 脏读 | 不可重复读 | 幻读 |
| --- | --- | --- | --- |
| 读未提交 RU | 可能 | 可能 | 可能 |
| 读已提交 RC | 不会 | 可能 | 可能 |
| 可重复读 RR | 不会 | 不会 | 基本不会 |
| 串行化 | 不会 | 不会 | 不会 |

- **脏读**：读到别人还没提交的数据。
- **不可重复读**：同一事务内两次读同一行，值变了。
- **幻读**：同一事务内两次范围查询，行数变了。

InnoDB 默认 RR，并且靠 **间隙锁（gap lock）** 锁住范围而不只是行，所以在当前读下也能挡住插入，基本消除幻读。很多互联网公司会改成 RC，因为间隙锁范围大、并发下更容易死锁，且主从复制用 row 格式后不再依赖 RR。

### MVCC 是怎么实现的？<Badge text="重要" type="danger" />

三个部件：

1. **隐藏列**：每行有 `trx_id`（最后修改它的事务号）和 `roll_pointer`（指向 undo 链）。
2. **undo 版本链**：每次修改把旧版本串成链表，从新到旧。
3. **ReadView**：快照读时生成，记录 `m_ids`（当前活跃事务集合）、`min_trx_id`、`max_trx_id`、`creator_trx_id`。

可见性判断沿着版本链走：

- `trx_id == creator_trx_id` → 自己改的，可见。
- `trx_id < min_trx_id` → 生成快照前就已提交，可见。
- `trx_id >= max_trx_id` → 快照之后才开启的事务，不可见。
- 落在区间内：在 `m_ids` 里说明还没提交，不可见；不在说明已提交，可见。

不可见就顺 `roll_pointer` 找上一个版本。**RC 与 RR 的唯一区别是 ReadView 的生成时机**：RC 每条 select 都新建，RR 只在第一条 select 时建一次并复用整个事务。

::: info 快照读 vs 当前读
普通 `select` 是快照读，走 MVCC 不加锁。`select ... for update`、`lock in share mode`、`update`、`delete` 是当前读，必须读最新已提交版本并加锁，这也是 RR 下仍可能出现「读到的和改的不一致」的原因。
:::

### redo log 和 binlog 有什么区别？<Badge text="掌握" type="tip" />

- **层次**：redo 是 InnoDB 引擎层的物理日志（「某页某偏移改成什么」）；binlog 是 Server 层的逻辑日志（语句或行变更），所有引擎都有。
- **写法**：redo 循环覆盖、空间固定；binlog 追加写、写满切文件，可以长期归档。
- **用途**：redo 用于崩溃恢复；binlog 用于主从复制和按时间点恢复。

两者用**两阶段提交**保持一致：redo 写入并置 `prepare` → 写 binlog 并刷盘 → redo 置 `commit`。崩溃恢复时若 redo 是 prepare 且 binlog 完整，就提交；binlog 不完整则回滚。这样保证「主库恢复出来的数据」和「从库回放出来的数据」一致。