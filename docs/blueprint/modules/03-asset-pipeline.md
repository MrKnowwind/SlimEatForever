# 模块 03：ImageGen 与像素资产管线

状态：基础流程可用，自动 QA 尚未完整。估算完成度 72%。

## 标准流程

```text
明确单一资产类型与显示用途
→ ImageGen 生成视觉母版
→ 原图保存到 assets/art-source/
→ scripts/process_pixel_ui_assets.py 裁切和标准化
→ 正式资源输出到 assets/pixel/
→ src/pixelUiAssets.js 注册纹理键
→ Phaser preload + nearest
→ 实际场景截图检查
```

ImageGen 决定“长什么样”，处理脚本决定“如何成为可加载、可裁帧、可对齐的游戏资源”。

## 目录职责

- `assets/art-source/`：ImageGen 原始母版和中间版，不直接作为运行时依赖。
- `assets/pixel/`：游戏正式加载的 PNG 与 SpriteSheet。
- `scripts/process_pixel_ui_assets.py`：网格切图、可见区域裁切、透明度二值化、统一帧画布。
- `src/pixelUiAssets.js`：资源键、URL、SpriteSheet 帧尺寸及类型映射。
- `src/pixelArt.js`：固定资产的场景适配器，以及仍允许存在的简单程序效果。

## 当前处理能力

- 从同类小型资源表按网格切图。
- 按 alpha 可见区域裁切并保留 padding。
- 将半透明边缘阈值化为清晰 alpha。
- 将史莱姆帧统一到 128 × 128。
- 将敌人帧统一到 160 × 160，并对齐脚底基线。
- 处理节点、技能图标、按钮、场景 UI、产出容器、战斗素材和角色动画。

## 生成规则

- 一次只生成一种资产或一个角色动作组。
- 提示词明确：isolated、transparent background、strict pixel art、no text、no labels、top-left light、limited palette、no anti-aliasing、no random sparkle。
- UI 外框必须完整，不裁边，不携带相邻资源碎片。
- 角色 SpriteSheet 需要统一朝向、脚底、体积、帧数和安全边距。
- 失败资源保留版本号，不直接覆盖已能工作的版本。

## 当前版本化实例

- 初始史莱姆：`slime-micro-animation-v3.png` → `slime-micro-v2.png`。
- 进化史莱姆：`slime-evolved-animation-v2.png` → `slime-evolved-v2.png`。
- 进化树完成按钮：`tree-complete-button-v2.png`。
- 进化树详情面板：`tree-detail-panel-v3.png`，当前方案为简单完整矩形框，无分区和内置插槽。
- 战斗底座：`battle-platform-*-v2.png`。

## 尚未完成

- 自动检查调色板色数、孤立噪点和主体视觉重量。
- 自动生成资源清单及未引用/重复版本报告。
- 将可伸缩 Panel/Button 真正切成 NineSlice，而非整图等比缩放。
- 为动画表增加帧数量、基线和 alpha 边界的自动测试。
- 清理已不用的 v1/v2 中间正式资源前，先确认引用关系。

## 每批最小验收

- PNG 可读取，alpha 正常，四角无意外实底。
- 纹理键唯一且实际文件存在。
- 同类显示尺寸一致，主体视觉中心稳定。
- Phaser 中没有模糊、白底、切边、邻格污染或方向错误。
- 修改后至少执行处理脚本、相关语法检查和 `git diff --check`；完整 npm 测试不要求每次美术微调都运行。
