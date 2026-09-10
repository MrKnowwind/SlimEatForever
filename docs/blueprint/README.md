# SlimEatForever 蓝图入口

最后更新：2026-09-10

这里是当前项目的唯一蓝图入口。文档按“短总览 + 独立模块”拆分，目的是让后续会话只加载与任务相关的内容。

## 推荐读取方式

1. 所有任务先读 [00-overview.md](00-overview.md)。
2. 再只读任务对应的模块文件。
3. 涉及跨模块改动时，最多追加读取直接相关模块。
4. 当前代码与实际资源高于文档；实现改变后同步更新相应模块与总览日期。

## 模块索引

| 任务 | 读取文件 |
|---|---|
| 玩法、数值、存档、局内循环 | [01-game-loop.md](modules/01-game-loop.md) |
| 整体美术原则、像素规范 | [02-visual-direction.md](modules/02-visual-direction.md) |
| ImageGen、切图、资源目录与接入 | [03-asset-pipeline.md](modules/03-asset-pipeline.md) |
| 主场景、喂食、产出容器、HUD | [04-main-scene.md](modules/04-main-scene.md) |
| 进化树布局、状态、滚动、详情页 | [05-evolution-tree.md](modules/05-evolution-tree.md) |
| 两种史莱姆、敌人角色与动画 | [06-characters-animation.md](modules/06-characters-animation.md) |
| 遭遇过场、战斗流程、行动轨道 | [07-encounter-battle.md](modules/07-encounter-battle.md) |
| 结算、按钮、弹窗与通用 UI | [08-ui-overlays.md](modules/08-ui-overlays.md) |
| 测试、验收、技术债与交付 | [09-engineering-qa.md](modules/09-engineering-qa.md) |

## 原始参考资料

- `D:/WebDownLoad/phaser4_pixel_art_asset_refactor_blueprint.md`
- `D:/WebDownLoad/ImageGen_to_Phaser4_Pixel_Asset_Pipeline.md`

这两份文件是早期方向参考，不是当前状态记录。若与本目录或当前实现冲突，以当前代码、资源及本目录中的最新决策为准。
