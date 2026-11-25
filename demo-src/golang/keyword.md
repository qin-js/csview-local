---
title: Golang 关键字陷阱
author: csview-local 示例
---

### slice 和数组有什么区别？<Badge text="重要" type="danger" />

数组是**值类型**，长度是类型的一部分，`[3]int` 和 `[4]int` 是不同类型，赋值和传参都会整体拷贝。

slice 是一个三字段的结构体：`{ptr, len, cap}`。传参只拷这 24 字节，但 `ptr` 指向同一底层数组，所以**修改元素会影响调用方**。

危险的地方在于 `append`：

```go
a := make([]int, 2, 4)   // len=2 cap=4
b := append(a, 1)        // 容量够，直接写进 a 的底层数组
b[0] = 99                // a[0] 也变成 99
c := append(a, 1, 2, 3)  // 超出 cap，扩容并拷贝到新数组
c[0] = 7                 // 此时不影响 a
```

::: warning 面试高频追问
「slice 作为参数传递会不会影响实参」没有单一答案：**改元素会，append 不一定**。是否影响取决于有没有触发扩容，这正是它容易出 bug 的原因。要完全隔离就显式 `copy` 或用 `s[:len:len]` 限制容量强制扩容。
:::

### defer 的执行顺序和求值时机？<Badge text="重要" type="danger" />

两条规则：

1. **后进先出**：多个 defer 按注册的逆序执行，像栈一样。
2. **参数立即求值，函数体延迟执行**：注册那一刻就把参数复制好。

```go
func f() (r int) {
    i := 0
    defer func() { fmt.Println("闭包读到", i) }()  // 捕获变量，打印 1
    defer fmt.Println("参数固定为", i)              // 立即求值，打印 0
    i++
    defer func() { r++ }()                        // 能改命名返回值
    return 10                                      // r 先被赋 10，再被 defer 改成 11
}
```

`return` 不是原子的：先把返回值赋给命名结果变量，再执行 defer 链，最后真正返回。所以**只有命名返回值才能被 defer 修改**。

### make 和 new 的区别？<Badge text="掌握" type="tip" />

- `new(T)`：分配一块零值内存，返回 `*T`。适用于任意类型。
- `make(T, ...)`：**只用于 slice、map、channel**，返回的是 `T` 本身而不是指针，并且会初始化内部结构（底层数组、哈希桶、环形缓冲与锁）。

原因很直接：这三种类型是运行时结构，光有零值内存不可用。`var m map[string]int` 是 nil map，读取安全但**写入直接 panic**，必须 `make` 或字面量初始化。

### nil channel、关闭的 channel 分别是什么行为？<Badge text="重要" type="danger" />

| 操作 | nil channel | 已关闭 channel | 正常 channel |
| --- | --- | --- | --- |
| 发送 | 永久阻塞 | **panic** | 阻塞或成功 |
| 接收 | 永久阻塞 | 立即返回零值，`ok=false` | 阻塞或成功 |
| 关闭 | **panic** | **panic** | 成功 |

由此得到两条工程惯例：

- **谁发送谁关闭**，接收方绝不关闭；多发送方场景用额外的 done channel 或 `sync.Once` 协调。
- 在 `select` 里把某个 case 的 channel 置为 nil，可以**动态禁用这个分支**，比用布尔标志加 default 更干净。

::: info 为什么关闭后还能读
关闭只是「不再有新数据」的信号，缓冲区里已有的数据仍应被消费完。所以 `for v := range ch` 会在关闭且排空后自然退出，这是 fan-out 模式的基础。
:::