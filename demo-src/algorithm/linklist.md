---
title: 链表必刷题
author: csview-local 示例
---

### 反转链表<Badge text="重要" type="danger" />

> 给定单链表头节点 `head`，反转链表并返回新的头节点。

**迭代法**的关键是三个指针：`prev` 指向已反转部分的头，`cur` 是当前待处理节点，`next` 先保存后继防止断链。每轮把 `cur.next` 指向 `prev`，然后三个指针整体前移。

时间 O(n)，空间 O(1)。**递归法**把「反转后面 n-1 个」当作已完成的子问题，拿到新头后只需把 `head.next.next = head` 再断开 `head.next`，空间是 O(n) 的栈。

::: tip 面试怎么写不出错
先画三个节点的小图，明确「断链前必须先存 next」这一条不变量；再想清楚循环终止条件是 `cur == null` 而不是 `cur.next == null`，否则会漏掉最后一个节点。
:::

::: code-tabs

@tab cpp

```cpp
ListNode* reverseList(ListNode* head) {
    ListNode* prev = nullptr;
    ListNode* cur  = head;
    while (cur) {
        ListNode* next = cur->next;  // 先存后继，再断链
        cur->next = prev;
        prev = cur;
        cur  = next;
    }
    return prev;
}
```

@tab java

```java
public ListNode reverseList(ListNode head) {
    ListNode prev = null, cur = head;
    while (cur != null) {
        ListNode next = cur.next;
        cur.next = prev;
        prev = cur;
        cur = next;
    }
    return prev;
}
```

@tab golang

```go
func reverseList(head *ListNode) *ListNode {
    var prev *ListNode
    cur := head
    for cur != nil {
        next := cur.Next
        cur.Next = prev
        prev = cur
        cur = next
    }
    return prev
}
```

:::

### 环形链表 II：找入环点<Badge text="重要" type="danger" />

> 判断链表是否有环，若有则返回入环的第一个节点，要求 O(1) 空间。

**Floyd 判圈**分两步：

1. 快指针每次走 2 步、慢指针走 1 步，若相遇则有环。
2. 把其中一个指针放回头部，两个指针都改为每次 1 步，再次相遇处就是入环点。

第二步为什么成立？设头到入环点距离 `a`，入环点到相遇点 `b`，环长 `L`。相遇时慢走 `a+b`，快走 `2(a+b)`，两者差值是环长整数倍：`a+b = kL`，于是 `a = kL - b`。从头部走 `a` 步，和从相遇点走 `kL-b` 步，正好在入环点汇合。

::: code-tabs

@tab cpp

```cpp
ListNode* detectCycle(ListNode* head) {
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {                 // 有环
            ListNode* p = head;
            while (p != slow) { p = p->next; slow = slow->next; }
            return p;                       // 入环点
        }
    }
    return nullptr;
}
```

@tab java

```java
public ListNode detectCycle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) {
            ListNode p = head;
            while (p != slow) { p = p.next; slow = slow.next; }
            return p;
        }
    }
    return null;
}
```

@tab golang

```go
func detectCycle(head *ListNode) *ListNode {
    slow, fast := head, head
    for fast != nil && fast.Next != nil {
        slow, fast = slow.Next, fast.Next.Next
        if slow == fast {
            p := head
            for p != slow {
                p, slow = p.Next, slow.Next
            }
            return p
        }
    }
    return nil
}
```

:::

### LRU 缓存<Badge text="重要" type="danger" />

> 设计 `get` / `put` 均为 O(1) 的 LRU 缓存。

单一数据结构做不到：**哈希表**能 O(1) 定位但不能判淘汰顺序，**链表**能 O(1) 调整顺序但不能 O(1) 定位。所以要组合：**哈希表存 key → 链表节点指针，双向链表按访问时间排序**。

- `get`：哈希定位节点，把它摘下来挂到链表头部，返回值。
- `put`：存在则更新值并前移；不存在则新建挂头部，超容量就删链表尾节点，同时**从哈希表里删掉它的 key**。

::: warning 最常见的两个 bug
一是只删链表忘了删哈希表，导致内存泄漏和后续 `get` 拿到悬垂指针；二是用单链表，删除尾节点需要 O(n) 找前驱，复杂度退化。加哨兵头尾节点可以省掉大量空指针判断。
:::

::: code-tabs

@tab cpp

```cpp
class LRUCache {
    struct Node { int k, v; Node* prev; Node* next; };
    int cap_;
    Node head_, tail_;                       // 哨兵，省去边界判断
    std::unordered_map<int, Node*> map_;

    void unlink(Node* n) { n->prev->next = n->next; n->next->prev = n->prev; }
    void pushFront(Node* n) {
        n->next = head_.next; n->prev = &head_;
        head_.next->prev = n; head_.next = n;
    }
public:
    explicit LRUCache(int capacity) : cap_(capacity) {
        head_.next = &tail_; tail_.prev = &head_;
    }
    int get(int key) {
        auto it = map_.find(key);
        if (it == map_.end()) return -1;
        unlink(it->second); pushFront(it->second);
        return it->second->v;
    }
    void put(int key, int value) {
        auto it = map_.find(key);
        if (it != map_.end()) {
            it->second->v = value;
            unlink(it->second); pushFront(it->second);
            return;
        }
        if ((int)map_.size() == cap_) {
            Node* last = tail_.prev;
            unlink(last); map_.erase(last->k); delete last;   // 两处都要删
        }
        Node* n = new Node{key, value, nullptr, nullptr};
        map_[key] = n; pushFront(n);
    }
};
```

@tab java

```java
class LRUCache extends LinkedHashMap<Integer, Integer> {
    private final int cap;
    LRUCache(int capacity) {
        super(capacity, 0.75f, true);   // accessOrder = true
        this.cap = capacity;
    }
    public int get(int key) { return super.getOrDefault(key, -1); }
    public void put(int key, int value) { super.put(key, value); }
    @Override
    protected boolean removeEldestEntry(Map.Entry<Integer, Integer> eldest) {
        return size() > cap;
    }
}
```

@tab golang

```go
type entry struct{ k, v int }

type LRUCache struct {
    cap  int
    ll   *list.List               // 存 *entry，_front 是最近使用
    idx  map[int]*list.Element
}

func Constructor(capacity int) LRUCache {
    return LRUCache{cap: capacity, ll: list.New(), idx: make(map[int]*list.Element)}
}

func (c *LRUCache) Get(key int) int {
    if el, ok := c.idx[key]; ok {
        c.ll.MoveToFront(el)
        return el.Value.(*entry).v
    }
    return -1
}

func (c *LRUCache) Put(key, value int) {
    if el, ok := c.idx[key]; ok {
        el.Value.(*entry).v = value
        c.ll.MoveToFront(el)
        return
    }
    c.idx[key] = c.ll.PushFront(&entry{key, value})
    if c.ll.Len() > c.cap {
        last := c.ll.Back()
        c.ll.Remove(last)
        delete(c.idx, last.Value.(*entry).k)   // 别忘了这一行
    }
}
```

:::