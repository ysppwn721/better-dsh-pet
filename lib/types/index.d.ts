/**
 * ============================================================================
 * better-dsh-pet 宿主半侧的类型声明（TypeScript）
 * ============================================================================
 *
 * 【用途】
 *   给 lib/index.js（宿主半侧）提供类型信息，让 TypeScript 用户/编辑器
 *   在 import 本包时获得智能提示和类型检查。纯类型文件，不影响运行时。
 *
 * 【对应实现】
 *   lib/index.js —— 监听 DSH session 事件，驱动 Electron 桌面 Helper，
 *   并注册 /plugins/better-dsh-pet/config 设置端点与 /pet 静态资源路由。
 *
 * ============================================================================
 * @module better-dsh-pet
 */
import type { Context } from '@deepseek-ai/cordis';
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver';

/** Cordis 插件名（loader 诊断用），与 lib/index.js 的 name 一致 */
export declare const name = 'pet';
/** 需要注入的服务列表（sessions），与 lib/index.js 的 inject 一致 */
export declare const inject: string[];

/** 插件配置：桌面气泡与状态联动 */
export interface Config {
    /** 是否启用桌面小宠物。默认 true。 */
    enabled?: boolean;
    /** 角色大小（0.7～1.4）。默认 1。 */
    scale?: number;
    /** 气泡大小（0.8～1.2）。默认 1。 */
    bubbleScale?: number;
    /** 空闲微动作频率：quiet / normal / lively。默认 normal。 */
    activityLevel?: 'quiet' | 'normal' | 'lively';
    /** 减少动态效果。默认 false。 */
    reducedMotion?: boolean;
    /** 气泡显示模式：always / hidden / custom。默认 always。 */
    bubbleMode?: 'always' | 'hidden' | 'custom';
    /** 自定义模式下显示气泡的状态。 */
    bubbleStates?: string[];
    /** 是否允许子 Agent 抢占宠物状态。默认 false。 */
    includeSubagents?: boolean;
    /** 番茄钟工作时长（分钟）。默认 25。 */
    workMinutes?: number;
    /** 番茄钟休息时长（分钟）。默认 5。 */
    breakMinutes?: number;
    /** 是否根据本次对话自动吐槽（会消耗 Token）。默认 false。 */
    roastEnabled?: boolean;
    /** 待机时是否允许走动。默认 true。 */
    walkEnabled?: boolean;
    /** 自定义待机动作（留空=全部动作）。 */
    enabledActions?: string[];
    /** 自定义待机动作播放顺序（留空=随机）。 */
    actionOrder?: string[];
    /** 宠物宽度（px）。默认 460。 */
    petSize?: number;
    /** 移动频繁度（百分比）。默认 20。 */
    moveChance?: number;
    /** 动作切换间隔（毫秒）。默认 0。 */
    actionDelayMs?: number;
    /** 动画播放速度（1.0～2.0）。默认 1。 */
    playbackRate?: number;
    /** 启动桌宠时自动开启语音唤醒（麦克风）。默认 false。 */
    voiceWakeAutoStart?: boolean;
    /** 旧版 /pet 路由的 full 资源根目录。 */
    fullRoot?: string;
    /** Helper 进程选项。 */
    helper?: {
        /** Electron 可执行文件路径；缺省时尝试 DSH_PET_ELECTRON_PATH / require('electron')。 */
        electronPath?: string;
    };
}

/**
 * 宿主插件主体：监听 DSH 状态并驱动桌面 Helper。
 * @param ctx    - 插件上下文；ctx.sessions 提供会话事件
 * @param config - 本行配置（来自 patch 树）
 */
export declare function apply(ctx: Context, config: Config): void;

export type { WebRoute };
