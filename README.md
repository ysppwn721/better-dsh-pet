# better-dsh-pet 🐾

<p align="center">
  <a href="https://www.npmjs.com/package/better-dsh-pet"><img alt="npm version" src="https://img.shields.io/npm/v/better-dsh-pet?label=npm&color=blue"></a>
  <a href="https://www.npmjs.com/package/better-dsh-pet"><img alt="npm monthly downloads" src="https://img.shields.io/npm/dm/better-dsh-pet?label=%E6%9C%88%E4%B8%8B%E8%BD%BD&color=brightgreen"></a>
  <a href="https://www.npmjs.com/package/better-dsh-pet"><img alt="total downloads" src="https://img.shields.io/npm/dt/better-dsh-pet?label=%E6%80%BB%E4%B8%8B%E8%BD%BD&color=success"></a>
  <a href="https://github.com/ysppwn721/better-dsh-pet"><img alt="stars" src="https://img.shields.io/github/stars/ysppwn721/better-dsh-pet?style=social"></a>
  <a href="https://github.com/ysppwn721/better-dsh-pet/blob/master/LICENSE"><img alt="license" src="https://img.shields.io/github/license/ysppwn721/better-dsh-pet?color=orange"></a>
  <a href="https://awesome-dsh-plugin.com"><img alt="awesome dsh plugin" src="https://awesome-dsh-plugin.com/badge.svg"></a>
  <img alt="platform" src="https://img.shields.io/badge/platform-DeepSeek%20Harness%20Web-8A2BE2">
  <img alt="assets" src="https://img.shields.io/badge/assets-51%20animations-ff69b4">
</p>

> A desktop-native pet bubble driven by [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) session events.
> 一只住在 Windows 桌面上的透明置顶大肥鱼：由 DSH 真实工作状态驱动，思考/工作/等待/完成/出错时自动切换动画并显示状态气泡。

---

## 🚀 快速开始（安装插件）

```sh
dsh plugin --profile web add better-dsh-pet
```

重启 `dsh web`，桌面会出现独立置顶气泡窗口——51 个透明动画开箱即用。网页内不再显示浮动大肥鱼；设置入口在 `设置 → 插件 → 插件配置 → 大肥鱼桌面伴侣`。

> 💡 想自己造一只专属宠物？克隆 [ysppwn721/better-dsh-pet](https://github.com/ysppwn721/better-dsh-pet) 仓库，用内置素材链（AI 提示词 → 绿幕视频 → 透明动画，素材由豆包生成）从零生成，全流程可复现。

## ✨ 功能特性

- **DSH 状态联动**：监听 DSH 会话事件，按思考 / 工作 / 等待 / 完成 / 错误切换动画和气泡文案
- **独立桌面气泡**：不再占用网页界面；透明、无边框、始终置顶的 Electron 窗口
- **51 个手绘风透明动画**：待机呼吸、打瞌睡、玩魔方、哼歌、炸毛、吐泡泡、玩水枪、小提琴演奏、蓝鲸现世、吃白饭、照镜子、三支舞、写代码、四季动作（放风筝、堆雪人、吃冰淇淋、放烟花……）全部无缝衔接
- **永不停止的动画链**：空闲时每段动画播完立即按概率选下一个（30% 待机 / 10% 转向 / 40% 动作 / 20% 移动）
- **点击 / 拖拽**：点击有随机回应动画（开心 / 害羞 / 傲娇），可拖到任意位置
- **喂食互动**：右键菜单可喂食，播放吃饭动画并显示感谢气泡
- **余额 / 进度汇报**：气泡中显示当前任务进度和 DeepSeek 账户余额
- **完成反馈**：任务完成时播放提示音并抖动宠物
- **对话吐槽**：根据本次对话生成俏皮吐槽（会消耗 Token，可开关；也可右键手动触发）
- **番茄钟**：右键菜单可开始 25 分钟专注 / 5 分钟短休息，气泡显示倒计时，结束时提示音 + 抖动
- **左右朝向**：所有动画 CSS 镜像，人物可朝左 / 朝右
- **落地对齐**：动画统一脚底线，宠物始终站在"地面"上
- **流畅切换**：双缓冲 video 交叉淡入，切换零空白帧
- **无障碍友好**：支持 `prefers-reduced-motion`

## ⚙️ 配置

| 配置项 | 说明 | 当前状态 |
|---|---|---|
| `enabled` | 是否启用桌面大肥鱼 | 默认 true，可在 DSH 设置页切换 |
| `scale` | 角色大小（70%～140%） | 默认 100%，设置页实时生效 |
| `bubbleScale` | 气泡大小（80%～120%） | 默认 100%，设置页实时生效 |
| `activityLevel` | 空闲微动作频率：quiet / normal / lively | 默认 normal |
| `reducedMotion` | 减少动态效果 | 默认关闭 |
| `bubbleMode` | 气泡显示：always / hidden / custom | 默认 always |
| `bubbleStates` | 自定义模式下显示气泡的状态 | 默认 SUCCESS / ERROR / WAITING |
| `includeSubagents` | 是否让子 Agent 参与状态选择 | 默认关闭 |
| `helper.electronPath` | 自定义 Electron 可执行文件路径 | 缺省自动探测 `DSH_PET_ELECTRON_PATH` / `require('electron')` / 本地 dsh-desktop-electron |

## 🗑️ 卸载

```sh
dsh plugin --profile web remove better-dsh-pet
```

## 🖥️ 运行效果

宠物实际运行在 DSH Web 界面中的样子：

<p>
  <img src="https://raw.githubusercontent.com/ysppwn721/better-dsh-pet/main/assets/screenshots/better-dsh-pet-running-1.png" width="380" alt="better-dsh-pet running in DSH Web UI 1" title="better-dsh-pet running in DSH Web UI 1">
  <img src="https://raw.githubusercontent.com/ysppwn721/better-dsh-pet/main/assets/screenshots/better-dsh-pet-running-2.png" width="380" alt="better-dsh-pet running in DSH Web UI 2" title="better-dsh-pet running in DSH Web UI 2">
</p>

## 🎬 效果预览

> 动画为透明背景；GIF 预览中透明部分显示为页面底色，实际播放为透明。

<p>
  <img src="https://raw.githubusercontent.com/ysppwn721/better-dsh-pet/main/https://raw.githubusercontent.com/ysppwn721/better-dsh-pet/main/better-dsh-pet/assets/preview/daiji-huxi-xiuxian.gif" width="160" alt="待机呼吸休闲" title="待机呼吸休闲">
  <img src="https://raw.githubusercontent.com/ysppwn721/better-dsh-pet/main/https://raw.githubusercontent.com/ysppwn721/better-dsh-pet/main/better-dsh-pet/assets/preview/dongzhangxiwang.gif" width="160" alt="东张西望" title="东张西望">
  <img src="https://raw.githubusercontent.com/ysppwn721/better-dsh-pet/main/https://raw.githubusercontent.com/ysppwn721/better-dsh-pet/main/better-dsh-pet/assets/preview/yuandi-piaofu-tabu.gif" width="160" alt="原地漂浮踏步" title="原地漂浮踏步">
  <img src="https://raw.githubusercontent.com/ysppwn721/better-dsh-pet/main/https://raw.githubusercontent.com/ysppwn721/better-dsh-pet/main/better-dsh-pet/assets/preview/yuandi-xiaoqi-chenmian.gif" width="160" alt="原地小憩沉眠" title="原地小憩沉眠">
  <img src="https://raw.githubusercontent.com/ysppwn721/better-dsh-pet/main/https://raw.githubusercontent.com/ysppwn721/better-dsh-pet/main/better-dsh-pet/assets/preview/dianji-huiying-kaixin-yuedong.gif" width="160" alt="点击回应 - 开心跃动" title="点击回应 - 开心跃动">
  <img src="https://raw.githubusercontent.com/ysppwn721/better-dsh-pet/main/https://raw.githubusercontent.com/ysppwn721/better-dsh-pet/main/better-dsh-pet/assets/preview/beishubiao-tuozhuai-xuankong-fankui.gif" width="160" alt="被鼠标拖拽悬空反馈" title="被鼠标拖拽悬空反馈">
</p>

全部 51 个动画见仓库：`better-dsh-pet/assets/thumb/`。

## 📚 完整项目（不止是插件）

这是**完整的三件套项目**，任何人 clone 仓库都可以从零生成自己的桌面宠物：

```
① 提示词（配方）    →  ② 素材生成链（引擎）  →  ③ 插件（成品）
AI 生成动画的配方     源视频 → 透明动画的管线    运行在 DSH 里的宠物
```

- 仓库：[ysppwn721/better-dsh-pet](https://github.com/ysppwn721/better-dsh-pet)
- 设计与实现文档：[DESIGN.md](https://github.com/ysppwn721/better-dsh-pet/blob/master/DESIGN.md)

## 🔎 发现更多 DSH 插件

- 社区插件目录：[awesome-dsh-plugin.com](https://awesome-dsh-plugin.com)
- DSH 官方仓库：[deepseek-ai/DeepSeek-Harness](https://github.com/deepseek-ai/deepseek-harness)

## 📄 许可

- 代码：MIT
- 素材（动画/提示词）：见仓库说明
