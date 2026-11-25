---
title: 二叉树必刷题
author: csview-local 示例
---

### 二叉树的层序遍历与锯齿遍历<Badge text="掌握" type="tip" />

层序遍历的骨架是**队列 + 按层批量出队**：每轮先记下 `size = queue.size()`，只处理这么多个节点，这样天然把一层圈在一起，不需要额外记录层号。

锯齿（Z 字形）遍历只需在此基础上，**偶数层把该层结果反转**，而不是去改遍历方向——改方向会破坏子节点入队顺序，是常见错误来源。

::: code-tabs

@tab cpp

```cpp
vector<vector<int>> zigzagLevelOrder(TreeNode* root) {
    vector<vector<int>> res;
    if (!root) return res;
    queue<TreeNode*> q;
    q.push(root);
    bool leftToRight = true;
    while (!q.empty()) {
        int size = q.size();                 // 固定住这一层的数量
        vector<int> level(size);
        for (int i = 0; i < size; ++i) {
            TreeNode* n = q.front(); q.pop();
            int idx = leftToRight ? i : size - 1 - i;
            level[idx] = n->val;             // 直接写到目标位置，省一次 reverse
            if (n->left)  q.push(n->left);
            if (n->right) q.push(n->right);
        }
        res.push_back(std::move(level));
        leftToRight = !leftToRight;
    }
    return res;
}
```

@tab java

```java
public List<List<Integer>> zigzagLevelOrder(TreeNode root) {
    List<List<Integer>> res = new ArrayList<>();
    if (root == null) return res;
    Deque<TreeNode> q = new ArrayDeque<>();
    q.offer(root);
    boolean leftToRight = true;
    while (!q.isEmpty()) {
        int size = q.size();
        LinkedList<Integer> level = new LinkedList<>();
        for (int i = 0; i < size; i++) {
            TreeNode n = q.poll();
            if (leftToRight) level.addLast(n.val); else level.addFirst(n.val);
            if (n.left != null) q.offer(n.left);
            if (n.right != null) q.offer(n.right);
        }
        res.add(level);
        leftToRight = !leftToRight;
    }
    return res;
}
```

@tab golang

```go
func zigzagLevelOrder(root *TreeNode) [][]int {
    var res [][]int
    if root == nil { return res }
    q := []*TreeNode{root}
    leftToRight := true
    for len(q) > 0 {
        size := len(q)
        level := make([]int, size)
        for i := 0; i < size; i++ {
            n := q[0]; q = q[1:]
            idx := i
            if !leftToRight { idx = size - 1 - i }
            level[idx] = n.Val
            if n.Left  != nil { q = append(q, n.Left) }
            if n.Right != nil { q = append(q, n.Right) }
        }
        res = append(res, level)
        leftToRight = !leftToRight
    }
    return res
}
```

:::

### 二叉树中的最大路径和<Badge text="重要" type="danger" />

> 路径可以从任意节点出发到任意节点，不必经过根，求最大节点值之和。节点值可能为负。

关键是区分**两个不同的量**：

- **贡献值**：从当前节点向下延伸的**单条**链的最大和，这是要返回给父节点的东西——因为父节点接上去后路径不能分叉。
- **答案候选**：`左贡献 + 当前值 + 右贡献`，这是以当前节点为「拐点」的完整路径，只用来更新全局最大值，不返回。

负贡献一律取 0（相当于不走那一侧），这样自然处理了负数节点。

::: tip 一句话记住
**返回单边，更新双边。** 把这两件事写进同一个后序遍历里，就是这类「树上最大路径」问题的通用模板，直径、最长同值路径都是同一套骨架。
:::

::: code-tabs

@tab cpp

```cpp
class Solution {
    int best_ = INT_MIN;
    int gain(TreeNode* n) {                  // 返回单边最大贡献
        if (!n) return 0;
        int l = std::max(0, gain(n->left));  // 负贡献直接舍弃
        int r = std::max(0, gain(n->right));
        best_ = std::max(best_, l + n->val + r);   // 以 n 为拐点
        return n->val + std::max(l, r);            // 只能带一侧回去
    }
public:
    int maxPathSum(TreeNode* root) { gain(root); return best_; }
};
```

@tab java

```java
class Solution {
    private int best = Integer.MIN_VALUE;
    private int gain(TreeNode n) {
        if (n == null) return 0;
        int l = Math.max(0, gain(n.left));
        int r = Math.max(0, gain(n.right));
        best = Math.max(best, l + n.val + r);
        return n.val + Math.max(l, r);
    }
    public int maxPathSum(TreeNode root) { gain(root); return best; }
}
```

@tab golang

```go
func maxPathSum(root *TreeNode) int {
    best := math.MinInt32
    var gain func(*TreeNode) int
    gain = func(n *TreeNode) int {
        if n == nil { return 0 }
        l := max(0, gain(n.Left))
        r := max(0, gain(n.Right))
        if l+n.Val+r > best { best = l + n.Val + r }
        return n.Val + max(l, r)
    }
    gain(root)
    return best
}
```

:::