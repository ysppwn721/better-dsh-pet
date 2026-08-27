/**
 * ============================================================================
 * better-dsh-pet 浏览器半侧的类型声明（TypeScript）
 * ============================================================================
 *
 * 【用途】
 *   给 lib/client.js（浏览器半侧）提供类型信息。纯类型文件，不影响运行时。
 *
 * 【对应实现】
 *   lib/client.js —— 不再渲染网页浮动宠物，只在 DSH 设置页注册“小宠物桌面伴侣”
 *   配置卡片，通过 /plugins/better-dsh-pet/config 读写宿主配置。
 *
 * ============================================================================
 * @module better-dsh-pet/client
 */
import type { Context } from '@deepseek-ai/dsh-client-runtime';

/** Cordis 插件名（loader 诊断用），与 lib/client.js 的 name 一致 */
export declare const name = 'pet';
/** 需要注入的服务列表（slots 槽位注册表），与 lib/client.js 的 inject 一致 */
export declare const inject: string[];

/** 客户端插件配置（目前只用于设置卡片展示，实际值由宿主 /config 提供） */
export interface Config {
    enabled?: boolean;
    scale?: number;
    bubbleScale?: number;
    activityLevel?: 'quiet' | 'normal' | 'lively';
    reducedMotion?: boolean;
    bubbleMode?: 'always' | 'hidden' | 'custom';
    bubbleStates?: string[];
    includeSubagents?: boolean;
    workMinutes?: number;
    breakMinutes?: number;
    roastEnabled?: boolean;
    walkEnabled?: boolean;
    enabledActions?: string[];
    actionOrder?: string[];
    petSize?: number;
    moveChance?: number;
    actionDelayMs?: number;
    playbackRate?: number;
    voiceWakeAutoStart?: boolean;
}

/**
 * 客户端插件主体：注册设置卡片到 `settings.plugin.item`。
 * @param ctx    - 客户端根上下文（ctx.slots 提供槽位注册）
 * @param config - 本行配置（来自 patch 树；当前实际为空对象）
 */
export declare function apply(ctx: Context, config: Config): void;
