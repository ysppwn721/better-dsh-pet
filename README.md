<div align="center">

# 🐋 better-dsh-pet

**一只住在 Windows 桌面上的大肥鱼，由 DeepSeek Harness 真实工作状态驱动。**

透明 · 置顶 · 会吐槽 · 会番茄钟 · 会喂食 · 会语音 · 会执行任务 · 会陪你干活

<br/>

[![npm version](https://img.shields.io/npm/v/better-dsh-pet?label=npm&color=blue)](https://www.npmjs.com/package/better-dsh-pet)
[![npm downloads](https://img.shields.io/npm/dm/better-dsh-pet?label=downloads&color=brightgreen)](https://www.npmjs.com/package/better-dsh-pet)
[![GitHub stars](https://img.shields.io/github/stars/ysppwn721/better-dsh-pet?style=social)](https://github.com/ysppwn721/better-dsh-pet)
[![License](https://img.shields.io/github/license/ysppwn721/better-dsh-pet?color=orange)](LICENSE)
![platform](https://img.shields.io/badge/platform-Windows%20%7C%20DeepSeek%20Harness-8A2BE2)
![assets](https://img.shields.io/badge/assets-91%20animations-ff69b4)
![voice](https://img.shields.io/badge/voice-SenseVoice%20Offline-00C4CC)

<br/>

**如果这个大肥鱼让你开心，给个 ⭐ 支持一下吧～**

</div>

---

## 📑 目录

- [🎬 视频推广](#-视频推广)
- [📖 项目简介](#-项目简介)
- [✨ 功能特性](#-功能特性)
- [📸 效果预览](#-效果预览)
- [🚀 快速开始](#-快速开始)
- [⬇️ 下载说明](#️-下载说明)
- [🖱️ 使用指南](#️-使用指南)
- [⚙️ 配置说明](#️-配置说明)
- [🎭 情绪系统](#-情绪系统)
- [🤖 任务执行机制](#-任务执行机制)
- [🎙️ 语音说明](#️-语音说明)
- [❓ 常见问题](#-常见问题)
- [🛠️ 开发 / 发布](#️-开发--发布)
- [📌 二创声明](#-二创声明)
- [🔎 相关链接](#-相关链接)
- [📄 许可](#-许可)

---

## 🎬 视频推广

> 📹 点击观看 better-dsh-pet 演示视频：
>
> [▶️ B站：一行命令，把大肥鱼放到桌面](https://www.bilibili.com/video/BV1YH8h6WEvi)

---

## 📖 项目简介

`better-dsh-pet` 是一个 **DSH 桌面宠物插件**，基于 [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet) 二创增强。

它和普通网页桌宠最大的区别是：

- 🪟 使用 **独立透明置顶窗口** 运行，不占用 DSH 网页界面
- 🧠 能感知 DSH 的真实工作状态：思考 / 工作 / 等待 / 完成 / 出错
- 🎞️ 内置 **91 个透明动画**，全部开箱即用
- 🎙️ 支持 **本地语音识别 / 语音唤醒 / 语音闲聊**（SenseVoice，离线运行）
- 🤖 识别到任务时**填入输入框手动确认**，再在 DSH 中开启真实会话执行
- 🎛️ 提供大量自定义玩法：动作选择、播放顺序、移动频率、番茄钟、喂食、吐槽、余额、节日、情绪系统

> 简单说：**DSH 在干活，大肥鱼在陪你。**

---

## ✨ 功能特性

### 🧠 DSH 状态联动

- 监听 DSH 会话事件，实时感知 Agent 状态
- 状态变化自动切换动画和气泡文案
- 支持状态：空闲、思考、工作、等待确认、完成、出错
- 支持子 Agent 状态选择（可关闭）
- 自动统计 Token 用量，并在对话结束后刷新余额

### 🖥️ 独立桌面气泡

- 透明、无边框、始终置顶
- 不占用网页界面
- 支持点击穿透，不挡鼠标
- 可拖拽到屏幕任意位置
- 支持系统托盘：显示 / 隐藏 / 退出
- 置顶看门狗：定期重新置顶，防止被资源管理器 / 全屏应用顶掉
- 全屏自动隐藏：仅在全屏游戏 / 视频时自动隐藏，不影响日常使用
- Helper 看门狗：桌宠进程意外退出后自动重新拉起

### 🎞️ 91 个透明动画

包含但不限于：

- 待机呼吸、东张西望、打瞌睡、伸懒腰
- 写代码、照镜子、玩魔方、敲桌面
- 吃白饭、吃火锅、吃大闸蟹、吃汤圆、吃饺子
- 放风筝、堆雪人、放烟花、放孔明灯
- 拆礼物、变鸽子、扑克魔术、撸猫、骑木马
- 小提琴、女仆舞、宅舞、摇摆舞
- 点击回应：开心、害羞、傲娇、挠痒、元气挥手

全部 **91 个透明动画** 见仓库：`assets/thumb/`

### 🚶 屏幕漫游

- 可开启 / 关闭行走
- 可调节移动频率
- 支持螃蟹走路、原地漂浮踏步、向左奔跑
- 移动和动画节奏同步

### 🍚 喂食互动

- 右键菜单一键喂食
- 随机播放吃饭动画
- 显示“谢谢投喂”气泡
- 增加心情和精力

### 💰 余额显示

- 自动读取 DeepSeek 账户余额
- 气泡中显示余额，如 `余额 ¥11.06`
- 每次对话结束后自动刷新
- 每 5 分钟定时刷新
- 点击余额气泡可手动刷新

### 🍅 番茄钟

- 自定义工作时长 / 休息时长
- 气泡显示倒计时
- 结束时播放 MP3 闹钟 + 抖动
- 可随时停止
- 完成番茄钟会增加心情和精力

### 💬 对话吐槽

- 根据当前对话生成俏皮吐槽
- 可手动触发
- 可开启自动吐槽（会消耗 Token）
- 自动吐槽可一键关闭

### 🎙️ 语音聊天与唤醒

- 本地 SenseVoice 语音识别（`sherpa-onnx-node`，无需联网）
- 可自定义唤醒词，默认“大肥鱼”
- 说“大肥鱼 + 指令”即可控制：喂食、番茄钟、余额、闲聊
- 语音识别为任务时，**不会自动发送**，而是填入输入框并显示「执行任务」按钮，等你确认后再执行，避免误识别白烧 Token
- 支持自动录音、断句静音时长、自动发送开关

### 🤖 真实任务执行

- 识别到复杂任务后，在 DSH 中**新建真实会话**执行（方案三）
- 可配置任务工作目录（`taskCwd`，留空默认用户主目录）
- 任务执行前需要手动点击「执行任务」确认
- 任务会话被归档时会自动停止，避免“以为关了还在跑”烧 Token

### 🎭 情绪系统

- 心情 / 精力 / 焦虑 / 无聊 四维情绪
- 互动、喂食、番茄钟、DSH 状态都会影响情绪
- 情绪会改变空闲动作和气泡文案
- 情绪值自动保存，重新打开桌宠不会重置

### 📅 节日模式

- 支持阳历 + 农历节日识别
- 可一键播放节日祝福动画
- 可开启节日自动播放
- 内置元旦、春节、元宵、劳动节、儿童节、端午、七夕、中秋、重阳、腊八、国庆、圣诞等

### 🎛️ 自定义动作

- 右键勾选要播放的动作
- 支持自定义播放顺序
- 支持动作切换间隔
- 支持移动频率
- 支持动画播放速度（1.0x～2.0x）

### ⚙️ 行为设置

- 宠物大小（px）
- 角色大小百分比
- 气泡大小
- 移动频繁度
- 动作切换间隔
- 播放速度
- 行走开关
- 自动吐槽开关
- 语音开关 / 唤醒词 / 自动录音 / 自动发送
- 任务工作目录
- 节日开关

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

---

## 🚀 快速开始

### 环境要求

| 项目 | 要求 |
|---|---|
| 操作系统 | Windows 10 / 11 |
| DSH | 已安装 DeepSeek Harness（DSH） |
| Node.js | 可用（用于 DSH / pnpm 插件安装） |
| Electron | 不需要手动安装，首次启动自动下载到 `~/.dsh/electron/` |

### 安装

```bash
dsh plugin --profile web add better-dsh-pet
```

> 如果刚发布新版本不到 24 小时，pnpm 11 的 `minimumReleaseAge` 安全策略可能不会自动选最新版，而是退回旧版。此时请指定精确版本安装：
>
> ```bash
> dsh plugin --profile web add better-dsh-pet@0.3.3
> ```
>
> pnpm 会自动把该版本加入 `minimumReleaseAgeExclude` 并完成安装；也可以等待 24 小时后直接用上面的普通命令。

### 启动

```bash
dsh web
```

启动后，桌面右下角会出现大肥鱼。

首次启动时插件会自动探测 / 下载 Electron，可能需要一点时间，请耐心等待。

### 卸载

```bash
dsh plugin --profile web remove better-dsh-pet
```

---

## ⬇️ 下载说明

better-dsh-pet 有两类下载：

1. **Electron**：桌宠窗口运行环境，首次启动自动下载；
2. **SenseVoice 语音模型**：本地离线语音识别模型，需要手动下载（可选增强）。

> 路径会自动识别 DSH 主目录：`DSH_HOME` 环境变量 → 从插件安装路径自动推断 → 默认 `~/.dsh`。所以在不同电脑、不同 DSH 安装目录下都能保持一致。

### Electron 自动下载

- 首次启动 DSH / 桌宠时，如果找不到 Electron，会自动下载到：
  ```text
  C:\Users\Administrator\.dsh\electron\electron.exe
  ```
- 下载进度会显示在：
  - 终端（如果你用 `dsh web` 启动且能看到宿主输出）
  - 日志文件：`C:\Users\Administrator\.dsh\logs\better-dsh-pet-electron.log`
- 查看最新进度：
  ```powershell
  Get-Content "C:\Users\Administrator\.dsh\logs\better-dsh-pet-electron.log" -Tail 20
  ```

手动触发下载（可在终端直接看进度）：

```powershell
node "C:\Users\Administrator\.dsh\profiles\web\node_modules\better-dsh-pet\scripts\ensure-electron.mjs"
```

### SenseVoice 语音模型下载

语音模型**不会自动下载**，需要手动执行一次：

```powershell
cd C:\Users\Administrator\.dsh\profiles\web\node_modules\better-dsh-pet
npm run download:sensevoice
```

脚本会自动尝试多个镜像源，哪个可用就用哪个：

```text
1. GitHub 官方
2. ghproxy.net
3. ghfast.top
4. gh-proxy.com
```

下载进度显示在终端，也会写入：

```text
C:\Users\Administrator\.dsh\logs\better-dsh-pet-sensevoice.log
```

查看进度：

```powershell
Get-Content "C:\Users\Administrator\.dsh\logs\better-dsh-pet-sensevoice.log" -Tail 20
```

模型下载完成后位于：

```text
C:\Users\Administrator\.dsh\voice\sensevoice\model.int8.onnx
C:\Users\Administrator\.dsh\voice\sensevoice\tokens.txt
```

### 如何判断下载完成

| 项目 | 完成标志 |
|---|---|
| Electron | `C:\Users\Administrator\.dsh\electron\electron.exe` 存在（约 215MB） |
| 语音模型 | `C:\Users\Administrator\.dsh\voice\sensevoice\model.int8.onnx` 和 `tokens.txt` 存在 |
| 下载日志 | 日志末尾出现 `下载完成` |

### 重新下载 / 清除缓存

```powershell
# 删除 Electron
Remove-Item "C:\Users\Administrator\.dsh\electron" -Recurse -Force

# 删除语音模型
Remove-Item "C:\Users\Administrator\.dsh\voice" -Recurse -Force
```

然后重新启动 DSH 或重新运行上面的下载命令。

### 下载失败排查

- **Electron 解压报“文件正由另一进程使用”**：
  - 先关闭 DSH / 桌宠，再重新下载；
  - 或手动运行 `ensure-electron.mjs`。
- **语音模型一直 0% / 进度条半天不动**：
  - 脚本会在 30 秒无数据后自动切换到下一个镜像；
  - 如果所有镜像都失败才会报错；
  - 也可以手动指定镜像：
    ```powershell
    $env:DSH_VOICE_MODEL_URL = "https://ghfast.top/https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17.tar.bz2"
    npm run download:sensevoice
    ```
- **升级时提示 EPERM**：
  - 先完全退出 DSH / 桌宠，再执行：
    ```bash
    dsh plugin --profile web add better-dsh-pet@0.3.3
    ```

---

## 🖱️ 使用指南

### 右键菜单

右键点击大肥鱼，可以看到：

| 菜单项 | 作用 |
|---|---|
| 情绪状态 | 实时显示心情 / 精力 / 焦虑 / 无聊 |
| 喂食 | 播放吃饭动画 + 感谢气泡 |
| 开始番茄钟 / 开始短休息 | 启动番茄钟 |
| 停止番茄钟 | 停止当前番茄钟 |
| 让大肥鱼吐槽一下 | 手动生成一条吐槽 |
| 语音控制 | 开始一次语音指令识别 |
| 开启/关闭语音唤醒 | 切换“大肥鱼 + 指令”唤醒 |
| 闲聊 | 打开聊天面板，支持语音 / 文字 / 任务确认 |
| 检查更新 | 检查 GitHub 新版本 |
| 设置… | 打开完整设置页（外观、动作、番茄钟、语音、任务目录、节日等） |
| 本次隐藏 | 隐藏本次大肥鱼 |
| 本次关闭 | 关闭本次大肥鱼 |

### 聊天面板

- 点击右键菜单「闲聊」打开聊天面板
- 支持文字输入、语音输入
- 识别为普通问题 → 直接聊天
- 识别为任务 → **填入输入框，显示「执行任务」按钮**，手动确认后才执行
- 任务模式下隐藏普通「发送」按钮，按回车也等于执行任务

### 语音控制

常用指令示例：

```text
大肥鱼，开始番茄钟
大肥鱼，喂食
大肥鱼，看看余额
大肥鱼，打开聊天
```

也可以直接点右键菜单「语音控制」说一次指令。

### 节日祝福

- 在设置中开启「节日祝福」
- 遇到节日时，右键菜单会出现「播放节日祝福」
- 也可开启自动播放，节日当天自动播放对应动画

---

## ⚙️ 配置说明

### DSH 设置页

```text
设置 → 插件 → 插件配置 → Better DSH Pet（大肥鱼增强版）
```

也可以在桌宠右键菜单 →「设置…」中直接修改。

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
| `playbackRate` | 动画播放速度（1.0x～2.0x） | `1` |
| `enabledActions` | 自定义待机动作 | `[]`（全部） |
| `actionOrder` | 自定义播放顺序 | `[]`（随机） |
| `roastEnabled` | 自动吐槽（耗 Token） | `false` |
| `workMinutes` | 番茄钟工作时长 | `25` |
| `breakMinutes` | 番茄钟休息时长 | `5` |
| `voiceEnabled` | 启用语音（麦克风） | `true` |
| `voiceWakeAutoStart` | 启动时自动开启语音唤醒 | `false` |
| `voiceSilenceMs` | 语音断句静音时长（ms） | `1200` |
| `voiceAutoSend` | 语音识别后自动发送 | `true` |
| `voiceAutoRecord` | 闲聊时说唤醒词自动开始录音 | `true` |
| `wakeWord` | 语音唤醒词 | `大肥鱼` |
| `holidayEnabled` | 启用节日祝福（阳历 + 农历） | `false` |
| `taskCwd` | 复杂任务工作目录（留空=用户主目录） | `` |

---

## 🎭 情绪系统

大肥鱼有四维情绪：

| 情绪 | 范围 | 说明 |
|---|---|---|
| 心情 Mood | -100 ~ 100 | 负=低落，正=开心 |
| 精力 Energy | 0 ~ 100 | 越低越容易犯困 |
| 焦虑 Anxiety | 0 ~ 100 | 越高越紧张 |
| 无聊 Boredom | 0 ~ 100 | 越高越想找事做 |

### 情绪如何变化

- 点击、喂食、番茄钟完成 → 心情和精力上升
- 空闲太久 → 越来越无聊、疲惫
- DSH 工作 / 思考 → 消耗精力
- DSH 等待确认 / 出错 → 焦虑上升

### 情绪影响

- 情绪强烈时，大肥鱼会优先播放对应情绪动作
- 会弹出心情气泡，例如：
  - 开心：`今天心情超好！`
  - 犯困：`好累啊，让我趴一会儿…`
  - 焦虑：`有点小紧张…`
  - 无聊：`好无聊啊…`

### 持久化

情绪值会自动保存到本地，**重新打开桌宠不会重置**。

---

## 🤖 任务执行机制

### 流程

1. 你对大肥鱼说 / 输入一个复杂任务
2. 插件先用 LLM 做意图分类
3. 如果识别为 `task`：
   - **不会自动发送**
   - 把任务文本填入聊天输入框
   - 显示「执行任务」按钮
   - 等你确认后再执行
4. 点击「执行任务」后，插件会在 DSH 中**新建一个真实会话**，把任务作为首条消息发送
5. 任务在工作目录（`taskCwd`）中执行，默认是用户主目录

### 为什么需要手动确认

因为自动识别偶尔会出错，直接执行可能会白烧 Token。手动确认可以给你一个修改 / 取消的机会。

### 归档自动停止

如果任务会话被归档（隐藏），插件会自动取消正在运行的 Agent；如果 3 秒后仍在运行，会强制销毁，避免“以为关了还在跑”的情况。

---

## 🎙️ 语音说明

### 识别引擎

- 默认使用 **Windows 系统语音识别（SAPI）**，开箱即用
- 可选安装 **SenseVoice** 本地模型 + `sherpa-onnx-node`，完全离线、更准、不上传音频
- 首次使用 SenseVoice 需要下载模型：

```bash
cd node_modules/better-dsh-pet
npm run download:sensevoice
```

> 模型会下载到 `~/.dsh/voice/sensevoice`。
> 下载脚本会自动尝试多个镜像源，详细说明见 [⬇️ 下载说明](#️-下载说明)。

### 唤醒词

默认唤醒词是 `大肥鱼`，可以在设置中修改。

开启语音唤醒后，说：

```text
大肥鱼，开始番茄钟
```

大肥鱼就会执行对应指令。

### 语音闲聊

在聊天面板中点击 🎤，或说唤醒词后，大肥鱼会自动开始录音。

识别结果会进入聊天输入框：

- 普通内容 → 可修改后发送
- 任务内容 → 自动进入任务确认模式

---

## ❓ 常见问题

### Q：为什么大肥鱼没有出现？

1. 确认安装的是 `better-dsh-pet`
2. 完全退出并重启 DSH
3. 检查设置里“启用大肥鱼”是否开启
4. 首次启动需要自动下载 Electron，请稍等片刻
5. 如果下载失败，可手动设置 `DSH_PET_ELECTRON_PATH` 指向 `electron.exe`

### Q：为什么没有余额显示？

- 需要 DSH 中配置了 `DEEPSEEK_API_KEY`
- 插件会自动读取 `~/.dsh/.credentials.yaml`
- 网络不通时不会显示

### Q：余额多久刷新一次？

- 每次对话/任务结束后自动刷新
- 每 5 分钟定时刷新
- 点击余额气泡可手动刷新

### Q：自动吐槽会消耗 Token 吗？

会。所以默认关闭，可以在设置或右键菜单中开启。

### Q：如何让大肥鱼只播放指定动作？

右键 → **设置…** → 在“自定义待机动作”中勾选要播放的动作。

### Q：如何自定义播放顺序？

在设置页的“自定义播放顺序”中填写动作名，用逗号分隔。

### Q：大小设置无效？

- 在设置页或右键“设置…”中修改
- 现在是**实时生效**的，不需要重启
- 如果没生效，确认保存成功后再看

### Q：没有 DSH 桌面端能运行吗？

可以。

- 本插件**不依赖 DSH Desktop.exe**
- 只需要 DSH 本体（`dsh web`）正常运行
- 右键“打开 DSH 桌面版”只是可选功能，找不到桌面端也不影响桌宠本体

### Q：其他电脑需要额外安装 Electron 吗？

不需要手动安装。

- 本插件**不打包 Electron**（npm 包体积限制）
- 首次启动会自动下载到 `~/.dsh/electron/electron.exe`
- 下载方式 / 进度查看见 [⬇️ 下载说明](#️-下载说明)
- 也可以通过环境变量指定：
  ```powershell
  $env:DSH_PET_ELECTRON_PATH = "C:\path\to\electron.exe"
  ```

### Q：插件会在没有 Electron 的电脑上崩溃吗？

不会导致 DSH 崩溃。首次启动会自动下载 Electron；如果下载失败，桌宠窗口无法显示，日志会提示：

```text
better-dsh-pet: cannot resolve Electron executable.
```

### Q：语音模型怎么下载？

语音模型是可选增强，不会自动下载。手动执行：

```powershell
cd C:\Users\Administrator\.dsh\profiles\web\node_modules\better-dsh-pet
npm run download:sensevoice
```

详细说明见 [⬇️ 下载说明](#️-下载说明)。

### Q：没有语音模型能使用语音功能吗？

能。

- 没有 SenseVoice 模型时，会自动回退到 **Windows 系统语音识别（SAPI）**
- 下载 SenseVoice 后，会使用更准的本地离线识别

### Q：为什么任务识别后没有自动执行？

这是故意的。识别为任务后需要你点击「执行任务」按钮确认，防止误识别白烧 Token。

### Q：任务会话归档后还在跑怎么办？

已经修复：归档后会自动取消 Agent，3 秒兜底强杀。如果仍然遇到，请升级到最新版本。

### Q：情绪值为什么还是重置？

请确认使用的是 0.3.0 及以上版本，并**重启一次 DSH / 桌宠进程**。旧版本没有情绪持久化。

---

## 🛠️ 开发 / 发布

### 本地调试

```bash
# 使用本地源码
dsh plugin --profile web add "D:\dsh-pet"

# 打包
npm pack

# 发布前检查
node scripts/prepack-check.js

# 发布到 npm
npm publish
```

### 目录结构

```text
better-dsh-pet/
├── lib/                      # 宿主半侧（DSH 插件逻辑）
│   ├── index.js              # 插件入口
│   ├── client.js             # 浏览器半侧（DSH 设置卡片）
│   ├── pet-reducer.js        # DSH 状态 → 桌宠状态
│   ├── pet-helper-process.js # Electron Helper 进程管理
│   └── sensevoice.js         # 本地语音识别
├── runtime/electron-helper/  # Electron 桌面端
│   ├── main.js               # 主进程（托盘 / 看门狗 / 全屏检测）
│   ├── preload.js            # 安全桥
│   └── renderer.js           # 桌宠 UI / 动画 / 聊天 / 语音
├── assets/                   # 动画、音效、图标
├── scripts/                  # 下载、转码、发布检查
└── cordis.patch.yml          # DSH bundle 挂载声明
```

---

## 📌 二创声明

本项目是基于 [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet) 的**二创修改版**。

- 感谢原作者的桌宠动画与设计
- 本项目在保留原动画基础上，增加了 DSH 状态联动、桌面独立窗口、余额、番茄钟、吐槽、语音、任务执行、情绪、节日、自定义动作等能力
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

🐋 **DSH 在干活，大肥鱼在陪你。**

</div>
