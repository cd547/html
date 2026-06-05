# CodeWalker: Procedural Compile Dungeon

一款将编程概念与地牢探险相结合的创意网页游戏。收集变量、躲避 Bug、解锁大门，在编译之塔中不断攀升！

## 🎮 游戏简介

CodeWalker 是一款独特的编程教育类游戏，玩家控制一个终端光标角色，在充满编程元素的地牢中探索。每个楼层代表一种编程概念（如 IF 语句、FOR 循环、指针等），玩家需要理解并完成对应的挑战才能解锁大门进入下一层。

## 🎹 操作说明

| 按键 | 功能 |
|------|------|
| `A` / `←` | 向左移动 |
| `D` / `→` | 向右移动 |
| `W` / `Space` | 跳跃 |
| `↓` / `S` | 执行循环操作（FOR-loop） |
| `R` | 重新编译（重启当前楼层/游戏） |
| `P` | 打开像素编辑器（自定义角色外观） |
| `Esc` | 关闭像素编辑器 |

## 🎯 游戏目标

1. **收集变量**：每个楼层都有需要收集的变量（布尔值、计数器等）
2. **解锁大门**：收集变量后，红色的 `COMPILER_ERR` 大门会变为虚线状态
3. **到达出口**：找到 `return;` 传送门进入下一层
4. **躲避 Bug**：避免接触红色三角形的 Bug，否则游戏崩溃

## 🏰 楼层类型

### IF 语句 (IF-statement)
- **目标**：收集布尔变量 `true`
- **机制**：简单的条件判断，收集变量即可解锁大门

### FOR 循环 (FOR-loop)
- **目标**：按 `↓/S` 键累计计数器达到目标值
- **机制**：每次按键计数器 +1，达到目标后解锁大门

### WHILE 循环 (WHILE-loop)
- **目标**：收集 `break` 变量打破无限循环
- **机制**：收集旋转的 break 变量即可解锁大门

### SWITCH 语句 (SWITCH-statement)
- **目标**：收集所有 3 个 case 钥匙
- **机制**：依次收集标有 0、1、2 的黄色钥匙

### ASYNC/AWAIT (ASYNC-await)
- **目标**：收集 token 后等待计时完成
- **机制**：收集 token 后门会周期性开启，把握时机通过

### 指针传送门 (POINTER-gate)
- **目标**：收集变量后使用传送门到达出口
- **机制**：成对出现的传送门会将玩家从地面传送到高处平台

### 三元运算符 (TERNARY-operator)
- **目标**：选择正确的分支收集变量
- **机制**：两条分支中只有一条是正确的，另一条有 Bug

## ⚠️ 修饰器系统

### Memory Leak（内存泄漏）
- **触发条件**：第 3 层及以上，35% 几率出现
- **机制**：
  - RAM 从 128MB 持续上涨
  - 达到 1024MB 时发生 `STACK OVERFLOW` 崩溃
  - 收集绿色 `free(ptr)` 药瓶可减少 220MB
- **策略**：快速完成主目标，顺路收集药瓶

## 🎨 像素编辑器

按 `P` 键打开像素编辑器，自定义你的角色外观：

- **绘制**：点击画布绘制像素
- **颜色**：选择白色、绿色、红色、蓝色、黄色
- **橡皮擦**：清除像素
- **预设**：提供 Cursor、Robot、Cat、Runner、Skull 五种预设
- **上传**：支持上传图片转换为像素风格
- **保存**：点击 ✓ Save 保存自定义角色

## 🏗️ 项目结构

```
html/
├── index.html          # 主页面
├── style.css           # 终端风格样式
└── js/
    ├── config.js       # 配置与全局状态
    ├── game.js         # 主游戏循环
    ├── floor.js        # 楼层生成与管理
    ├── player.js       # 玩家输入与物理
    ├── renderer.js     # Canvas 渲染系统
    ├── utils.js        # 工具函数
    ├── pixel-editor.js # 像素编辑器
    └── gameplay/       # 游戏玩法模块
        ├── base.js     # 玩法注册系统
        ├── if.js       # IF 语句
        ├── for.js      # FOR 循环
        ├── while.js    # WHILE 循环
        ├── switch.js   # SWITCH 语句
        ├── async.js    # ASYNC/AWAIT
        ├── pointer.js  # 指针传送门
        ├── ternary.js  # 三元运算符
        └── memoryleak.js # 内存泄漏修饰器
```

## 🚀 快速开始

1. 直接打开 `index.html` 即可运行游戏
2. 无需安装依赖，纯前端 JavaScript 实现
3. 建议使用现代浏览器（Chrome、Firefox、Edge）

## 📊 游戏特色

- **终端风格 UI**：绿色/红色高亮、矩阵数字雨背景
- **自定义角色**：16×24 像素编辑器
- **程序化生成**：楼层内容随机生成，每次游玩体验不同
- **平滑滚动**：支持鼠标拖拽滚动条查看楼层

## 📝 开发说明

### 楼层高度等级

游戏支持多种楼层高度：
- `floorHeightLevel: 1` - 标准高度（140px）
- `floorHeightLevel: 2` - 双倍高度（280px）
- `floorHeightLevel: 3` - 三倍高度（420px）
- `floorHeightLevel: 5` - 五倍高度（700px）

### 添加新玩法

在 `js/gameplay/` 目录下创建新文件，使用 `registerGameplay()` 注册：

```javascript
registerGameplay({
    id: 'my-gameplay',
    name: 'MY-GAMEPLAY',
    minFloor: 0,
    weight: 1.0,
    codeText: '// Your code here',
    
    generateElements(floorIndex, floor) {
        // 生成楼层元素
        return [];
    },
    
    handleInteraction(player, element, floor) {
        // 处理玩家与元素的交互
        return null;
    }
});
```

---

**CodeWalker** - 探索编程的无限可能！ 🚀