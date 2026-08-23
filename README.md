<div align="center">

# 🐋 better-dsh-pet

**一只住在 Windows 桌面上的大肥鱼，由 DeepSeek Harness 真实工作状态驱动。**

透明 · 置顶 · 会吐槽 · 会番茄钟 · 会喂食 · 会陪你干活

<br/>

[![npm version](https://img.shields.io/npm/v/better-dsh-pet?label=npm&color=blue)](https://www.npmjs.com/package/better-dsh-pet)
[![npm downloads](https://img.shields.io/npm/dm/better-dsh-pet?label=downloads&color=brightgreen)](https://www.npmjs.com/package/better-dsh-pet)
[![GitHub stars](https://img.shields.io/github/stars/ysppwn721/better-dsh-pet?style=social)](https://github.com/ysppwn721/better-dsh-pet)
[![License](https://img.shields.io/github/license/ysppwn721/better-dsh-pet?color=orange)](LICENSE)
![platform](https://img.shields.io/badge/platform-Windows%20%7C%20DeepSeek%20Harness-8A2BE2)
![assets](https://img.shields.io/badge/assets-91%20animations-ff69b4)

</div>

---

## 🎬 视频推广

> 📹 演示视频占位：拍好视频后把链接放到这里。
>
> ```md
> [▶️ 点击观看 better-dsh-pet 演示视频](https://www.bilibili.com/video/你的视频ID)
> ```

---

## 📖 项目简介

`better-dsh-pet` 是一个 **DSH 桌面宠物插件**，基于 [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet) 二创增强。

它和普通网页桌宠最大的区别是：

- 🪟 使用 **独立透明置顶窗口** 运行，不占用 DSH 网页界面
- 🧠 能感知 DSH 的真实工作状态：思考 / 工作 / 等待 / 完成 / 出错
- 🎞️ 内置 **91 个透明动画**，全部开箱即用
- 🎛️ 提供大量自定义玩法：动作选择、播放顺序、移动频率、番茄钟、喂食、吐槽、余额显示

> 简单说：**DSH 在干活，大肥鱼在陪你。**

---

## ✨ 功能特性

### 🧠 DSH 状态联动

- 监听 DSH 会话事件
- 状态变化自动切换动画和气泡文案
- 支持状态：空闲、思考、工作、等待确认、完成、出错
- 支持子 Agent 状态选择（可关闭）

### 🖥️ 独立桌面气泡

- 透明、无边框、始终置顶
- 不占用网页界面
- 支持点击穿透，不挡鼠标
- 可拖拽到屏幕任意位置

### 🎞️ 91 个透明动画

包含但不限于：

- 待机呼吸、东张西望、打瞌睡、伸懒腰
- 写代码、照镜子、玩魔方、敲桌面
- 吃白饭、吃火锅、吃大闸蟹、吃汤圆、吃饺子
- 放风筝、堆雪人、放烟花、放孔明灯
- 拆礼物、变鸽子、扑克魔术、撸猫、骑木马
- 小提琴、女仆舞、宅舞、摇摆舞
- 点击回应：开心、害羞、傲娇、挠痒、元气挥手

### 🚶 屏幕漫游

- 可开启 / 关闭行走
- 可调节移动频率
- 支持螃蟹走路、原地漂浮踏步、向左奔跑
- 移动和动画节奏同步

### 🍚 喂食互动

- 右键菜单一键喂食
- 随机播放吃饭动画
- 显示“谢谢投喂”气泡

### 💰 余额显示

- 自动读取 DeepSeek 账户余额
- 气泡中显示余额，如 `余额 ¥11.06`
- 定时刷新

### 🍅 番茄钟

- 自定义工作时长 / 休息时长
- 气泡显示倒计时
- 结束时播放 MP3 闹钟 + 抖动
- 可随时停止

### 💬 对话吐槽

- 根据当前对话生成俏皮吐槽
- 可手动触发
- 可开启自动吐槽（会消耗 Token）
- 自动吐槽可一键关闭

### 🎛️ 自定义动作

- 右键勾选要播放的动作
- 支持自定义播放顺序
- 支持动作切换间隔
- 支持移动频率

### ⚙️ 行为设置

- 宠物大小（px）
- 角色大小百分比
- 气泡大小
- 移动频繁度
- 动作切换间隔
- 行走开关
- 自动吐槽开关

---

## 📸 效果预览

> 动画为透明背景；GIF 预览中透明部分显示为页面底色，实际播放为透明。

### 😴 待机 / 日常

<p align="center">
  <img src="assets/preview/daiji-huxi-xiuxian.gif" width="150" alt="待机呼吸休闲" title="待机呼吸休闲">
  <img src="assets/preview/dongzhangxiwang.gif" width="150" alt="东张西望" title="东张西望">
  <img src="assets/preview/haqian-liantian.gif" width="150" alt="哈欠连天" title="哈欠连天">
  <img src="assets/preview/yuandi-xiaoqi-chenmian.gif" width="150" alt="原地小憩沉眠" title="原地小憩沉眠">
  <img src="assets/preview/chaoda-shenlanyao.gif" width="150" alt="超大伸懒腰" title="超大伸懒腰">
  <img src="assets/preview/youxian-hengga.gif" width="150" alt="悠闲哼歌" title="悠闲哼歌">
</p>

### 🏃 移动

<p align="center">
  <img src="assets/preview/yuandi-piaofu-tabu.gif" width="150" alt="原地漂浮踏步" title="原地漂浮踏步">
  <img src="assets/preview/pangxie-zoulu.gif" width="150" alt="螃蟹走路" title="螃蟹走路">
  <img src="assets/preview/beishubiao-tuozhuai-xuankong-fankui.gif" width="150" alt="被鼠标拖拽悬空反馈" title="被鼠标拖拽悬空反馈">
</p>

### 🍜 吃东西

<p align="center">
  <img src="assets/preview/chi-baifan.gif" width="150" alt="吃白饭" title="吃白饭">
  <img src="assets/preview/chi-token.gif" width="150" alt="吃Token" title="吃Token">
  <img src="assets/preview/dakou-chi-lingshi.gif" width="150" alt="大口吃零食" title="大口吃零食">
  <img src="assets/preview/chi-zaocan.gif" width="150" alt="吃早餐" title="吃早餐">
  <img src="assets/preview/chi-bingqilin-ronghua.gif" width="150" alt="吃冰淇淋融化" title="吃冰淇淋融化">
</p>

### 🎮 玩耍 / 才艺

<p align="center">
  <img src="assets/preview/yuandi-zhuanxin-wan-mofang.gif" width="150" alt="原地专心玩魔方" title="原地专心玩魔方">
  <img src="assets/preview/wan-shuiqiang.gif" width="150" alt="玩水枪" title="玩水枪">
  <img src="assets/preview/xiaotiqin-yanzou.gif" width="150" alt="小提琴演奏" title="小提琴演奏">
  <img src="assets/preview/youya-nvpuwu.gif" width="150" alt="优雅女仆舞" title="优雅女仆舞">
  <img src="assets/preview/keai-zhaiwu.gif" width="150" alt="可爱宅舞" title="可爱宅舞">
</p>

### 🎉 节日 / 季节

<p align="center">
  <img src="assets/preview/duixueren.gif" width="150" alt="堆雪人" title="堆雪人">
  <img src="assets/preview/fang-fengzheng.gif" width="150" alt="放风筝" title="放风筝">
  <img src="assets/preview/zhongqiu-shangyue-chi-yuebing.gif" width="150" alt="中秋赏月吃月饼" title="中秋赏月吃月饼">
  <img src="assets/preview/beiluoye-yanmo.gif" width="150" alt="被落叶淹没" title="被落叶淹没">
</p>

### 🖱️ 点击回应

<p align="center">
  <img src="assets/preview/dianji-huiying-kaixin-yuedong.gif" width="150" alt="开心跃动" title="开心跃动">
  <img src="assets/preview/dianji-huiying-haixiu-jingya.gif" width="150" alt="害羞惊讶" title="害羞惊讶">
  <img src="assets/preview/dianji-huiying-aojiao-shengqi-ceshen-zhanshi.gif" width="150" alt="傲娇生气" title="傲娇生气">
</p>

全部 **91 个透明动画** 见仓库：`assets/thumb/`

---

## 🚀 快速开始

### 环境要求

- Windows 10 / 11
- 已安装 DeepSeek Harness（DSH）
- Node.js 环境可用

### 安装

```bash
dsh plugin --profile web add better-dsh-pet
```

### 启动

```bash
dsh web
```

启动后，桌面右下角会出现大肥鱼。

### 卸载

```bash
dsh plugin --profile web remove better-dsh-pet
```

---

## 🖱️ 右键菜单使用指南

右键点击大肥鱼，可以看到：

| 菜单项 | 作用 |
|---|---|
| 喂食 | 播放吃饭动画 + 感谢气泡 |
| 开始番茄钟 / 开始短休息 | 启动番茄钟 |
| 停止番茄钟 | 停止当前番茄钟 |
| 番茄钟设置 | 设置工作时长 / 休息时长 |
| 行为设置 | 设置大小、移动频率、动作切换间隔 |
| 选择待机动作 | 勾选要播放的动作（悬停展开） |
| 开启/关闭行走 | 切换是否走动 |
| 开启/关闭自动吐槽 | 切换自动吐槽 |
| 让大肥鱼吐槽一下 | 手动生成一条吐槽 |
| 打开 DSH 桌面版 | 打开 DSH 桌面客户端 |
| 本次隐藏 | 隐藏本次大肥鱼 |
| 本次关闭 | 关闭本次大肥鱼 |

---

## ⚙️ 配置说明

### DSH 设置页

```text
设置 → 插件 → 插件配置 → 大肥鱼桌面伴侣
```

| 配置项 | 说明 | 默认 |
|---|---|---|
| `enabled` | 是否启用大肥鱼 | `true` |
| `petSize` | 宠物宽度（px） | `460` |
| `scale` | 角色大小（70%～140%） | `100%` |
| `bubbleScale` | 气泡大小（80%～120%） | `100%` |
| `activityLevel` | 空闲微动作频率 | `normal` |
| `reducedMotion` | 减少动态效果 | `false` |
| `bubbleMode` | 气泡显示模式 | `always` |
| `bubbleStates` | 自定义气泡状态 | `SUCCESS/ERROR/WAITING` |
| `includeSubagents` | 是否响应子 Agent | `false` |
| `walkEnabled` | 是否允许走动 | `true` |
| `moveChance` | 移动频繁度（%） | `20` |
| `actionDelayMs` | 动作切换间隔（ms） | `0` |
| `enabledActions` | 自定义待机动作 | `[]`（全部） |
| `actionOrder` | 自定义播放顺序 | `[]`（随机） |
| `roastEnabled` | 自动吐槽（耗 Token） | `false` |
| `workMinutes` | 番茄钟工作时长 | `25` |
| `breakMinutes` | 番茄钟休息时长 | `5` |

---

## ❓ 常见问题

### Q：为什么大肥鱼没有出现？

1. 确认安装的是 `better-dsh-pet`
2. 完全退出并重启 DSH
3. 检查设置里“启用大肥鱼”是否开启
4. 确认 Electron 路径可用（一般会自动探测）

### Q：为什么没有余额显示？

- 需要 DSH 中配置了 `DEEPSEEK_API_KEY`
- 插件会自动读取 `~/.dsh/.credentials.yaml`
- 网络不通时不会显示

### Q：自动吐槽会消耗 Token 吗？

会。所以默认关闭，可以在设置或右键菜单中开启。

### Q：如何让大肥鱼只播放指定动作？

右键 → **选择待机动作** → 勾选要播放的动作 → 保存。

### Q：如何自定义播放顺序？

在 DSH 设置页的“自定义播放顺序”中填写动作名，用逗号分隔。

### Q：大小设置无效？

- 在 DSH 设置页或右键“行为设置”中修改
- 现在是**实时生效**的，不需要重启
- 如果没生效，确认保存成功后再看

---

## 🛠️ 开发 / 本地调试

```bash
# 使用本地源码
dsh plugin --profile web add "D:\dsh-pet"

# 打包
npm pack

# 发布前检查
node scripts/prepack-check.js
```

---

## 📌 二创声明

本项目是基于 [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet) 的**二创修改版**。

- 感谢原作者的桌宠动画与设计
- 本项目在保留原动画基础上，增加了 DSH 状态联动、桌面独立窗口、余额、番茄钟、吐槽、自定义动作等能力
- 素材使用请遵守原作者仓库的许可说明

---

## 🔎 相关链接

- 社区插件目录：[awesome-dsh-plugin.com](https://awesome-dsh-plugin.com)
- DSH 官方仓库：[deepseek-ai/DeepSeek-Harness](https://github.com/deepseek-ai/deepseek-harness)
- 上游原版：[PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet)
- 上游 Windows 移植参考：[MerZlin/dsh-pet-indesktop](https://github.com/MerZlin/dsh-pet-indesktop)

---

## 📄 许可

- 代码：MIT
- 素材（动画 / 提示词 / 源视频）：见仓库说明，**禁止商用**

---

<div align="center">

**如果这个大肥鱼让你开心，给个 ⭐ 支持一下吧～**

</div>
