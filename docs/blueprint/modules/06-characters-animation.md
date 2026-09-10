# 模块 06：角色与动画

状态：史莱姆基本完成，敌人只完成前两类。综合估算 68%。

## 史莱姆形态约束

当前产品只保留两种视觉形态：

### 初始史莱姆 / micro

- 体型较小。
- 没有眼睛和嘴巴，依靠轮廓、形变与高光表达生命感。
- 主场景仅需要一种基础待机循环。
- 顶部轮廓比旧版增加一排像素，新增一排左右各比下一排少 1 个逻辑像素。

### 进化史莱姆 / evolved

- 明显大于初始形态，不只是同图放大。
- 有清晰像素化眼睛、嘴巴、核心和侧向伪足，轮廓与初始形态差异足够明显。
- 主场景基础待机之外，会随机播放 curious 和 bouncy 两种待机变化。

禁止自然推导第三种视觉形态。当前 `evolution >= 1` 都使用 evolved Sprite；数据中的“成熟体”命名是待决的规则问题。

## 当前史莱姆动画表

### micro：5 行 × 4 帧

- idle：0–3，循环。
- attack/chew：4–7。
- hurt：8–11。
- victory：12–15。
- defeat：16–19。

正式表：`assets/pixel/characters/slime-micro-v2.png`，单帧 128 × 128。

### evolved：7 行 × 4 帧

- idle：0–3，循环。
- idle-curious：4–7，随机一次后回到基础 idle。
- idle-bouncy：8–11，随机一次后回到基础 idle。
- attack：12–15。
- hurt：16–19。
- victory：20–23。
- defeat：24–27。

正式表：`assets/pixel/characters/slime-evolved-v2.png`，单帧 128 × 128。

两种史莱姆均可根据已解锁染色剂整体 tint 为蓝、红、绿、黄、紫。

## 敌人

### 已资产化

- 木剑见习者：4 × 4 SpriteSheet，idle/attack/hurt/defeat。
- 老练猎人：4 × 4 SpriteSheet，idle/attack/hurt/defeat。
- 两者正式单帧为 160 × 160，并按脚底对齐。
- 行动轨道分别使用 rookie/hunter 专属头像；初始敌人不再误用其他职业头像。

### 尚未资产化

- 盾卫、弓手、术士仍由 `EnemySprites.create()` 在运行时通过矩形拼装。
- 三者虽然有独立行动轨道头像，但战斗角色本体没有正式 SpriteSheet。
- Boss 尚未设计。

## 动画与表现规则

- Phaser Animation 负责逐帧动画。
- 代码可以叠加轻微位移、挤压和弹跳，但不能替代角色帧设计。
- 所有 SpriteSheet 使用固定帧尺寸和脚底基线，避免播放时跳动。
- 攻击、受击、胜利、失败结束后应明确回到正确 idle，或停在最终状态。
- 第二形态的显示尺寸必须稳定大于第一形态。

## 迁移遗留

- `main.js` 的史莱姆工厂和 `pixelArt.js` 的敌人模块仍保留 return 后不可达的旧程序绘制代码。
- 待新资产稳定后删除这些旧分支，避免后续误改、误调用和上下文污染。
- `slime-micro.png`、`slime-evolved.png` 及部分 v1 中间资源需要在引用审计后决定保留或归档。

## 下一步

1. 生成盾卫 SpriteSheet。
2. 生成弓手 SpriteSheet。
3. 生成术士 SpriteSheet。
4. 在同一波三人并排时统一大小、脚底线与攻击方向。
5. 为冒险者战利品生成单独的掉落物 Sprite。
