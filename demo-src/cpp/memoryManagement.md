---
title: C++ 内存模型与常见陷阱
author: csview-local 示例
---

### new/delete 和 malloc/free 的区别？<Badge text="掌握" type="tip" />

- `new` 是**运算符**：先分配内存，再调用构造函数；`delete` 先析构再释放。`malloc` 只是库函数，只管字节，不认识对象。
- `new` 失败抛 `std::bad_alloc`，`malloc` 失败返回 `nullptr`。
- `new` 返回具体类型指针，`malloc` 返回 `void*` 需要转换。
- `new[]` 必须配 `delete[]`：数组会在头部额外记录元素个数，用错释放方式会导致只析构第一个元素或破坏堆结构。
- 二者**不能混用**：`malloc` 出来的用 `delete` 释放是未定义行为。

现代 C++ 里业务代码基本不该直接出现 `new`，用 `make_unique` / `make_shared` 让所有权在类型上就表达清楚。

### 内存泄漏之外，还有哪些内存错误？<Badge text="重要" type="danger" />

| 错误 | 表现 | 定位手段 |
| --- | --- | --- |
| 悬垂指针 / use-after-free | 释放后继续访问，可能读到脏数据或崩溃 | ASan |
| 越界读写 | 破坏相邻对象或堆元数据，崩溃点离现场很远 | ASan / valgrind |
| 重复释放 | 堆结构损坏，`double free or corruption` | ASan |
| 未初始化读取 | 值随机，Debug 与 Release 行为不一致 | MSan / valgrind |
| 内存泄漏 | RSS 持续上涨，长跑后 OOM | LSan / heaptrack |

::: warning 崩溃点往往不是案发现场
越界写会先破坏别的对象，等到那个对象被使用时才崩溃，堆栈完全指向无辜代码。所以看到「随机崩溃」优先上 AddressSanitizer，而不是逐行读代码。
:::

### RAII 为什么是 C++ 的核心惯用法？<Badge text="掌握" type="tip" />

RAII 把**资源生命周期绑定到对象生命周期**：构造时获取，析构时释放。因为 C++ 保证栈对象在离开作用域时（包括抛异常栈展开时）一定析构，所以释放动作不可能被漏掉。

这解决了 `try/catch` 或提前 `return` 分支里忘记释放的经典问题：

```cpp
std::lock_guard<std::mutex> lk(mu);   // 构造加锁
if (!ready) return;                   // 提前返回，析构自动解锁
process();                            // 抛异常也自动解锁
```

锁、文件句柄、socket、事务、临时目录切换，全都适合包成 RAII 类型。判断标准很简单：**任何「必须成对出现的操作」都应该交给一个对象来保证配对**。

### 一个对象的内存布局是怎样的？<Badge text="了解" type="info" />

以含虚函数的类为例，典型布局是：

1. **vptr**（8 字节，指向 vtable），位于对象起始处。
2. 基类子对象的成员。
3. 派生类自己的成员，按**声明顺序**排列，并按各自对齐要求插入填充。

由此推出：

- `sizeof` 包含填充字节，把小成员集中声明能减少 padding。
- 多重继承会有多个 vptr；虚继承还会引入虚基类偏移，布局更复杂。
- 空类 `sizeof` 为 1，保证不同对象有不同地址；作为基类时可被优化为 0（空基类优化）。