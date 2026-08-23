/**
 * ============================================================================
 * better-dsh-pet 浏览器半侧（browser half）—— 设置卡片
 * ============================================================================
 *
 * 桌面宠物本体已迁移到独立的 Electron Helper 窗口，不再在 DSH 网页里浮动。
 * 浏览器半侧现在只负责在 DSH 设置页提供一个“大肥鱼”配置卡片，通过
 * /plugins/better-dsh-pet/config 读写宿主配置。
 *
 * ============================================================================
 */
window.__ModuleLoader__.load({
  id: 'better-dsh-pet',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    const React = require('react')
    const { useEffect, useRef, useState } = React
    const { jsx: h } = require('react/jsx-runtime')
    const CONFIG_ENDPOINT = '/plugins/better-dsh-pet/config'

    const cardStyle = {
      listStyle: 'none', border: '1px solid var(--border-color, #d8d8d8)', borderRadius: 12,
      padding: 16, background: 'var(--surface-color, transparent)', display: 'grid', gap: 14,
    }
    const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20 }
    const selectStyle = { minWidth: 120, padding: '6px 10px', borderRadius: 8 }
    const BUBBLE_STATE_OPTIONS = [
      ['IDLE', '空闲'],
      ['THINKING', '思考中'],
      ['WORKING', '工作中'],
      ['WAITING', '等待确认'],
      ['SUCCESS', '完成'],
      ['ERROR', '错误'],
    ]
    const bubbleGridStyle = {
      display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: '6px 14px',
      padding: '10px 12px', border: '1px solid var(--border-color, #d8d8d8)', borderRadius: 8,
    }

    function Field({ label, hint, children }) {
      return h('label', { style: rowStyle },
        h('span', null,
          h('span', { style: { display: 'block', fontWeight: 600 } }, label),
          h('small', { style: { display: 'block', opacity: 0.65, marginTop: 3 } }, hint),
        ),
        children,
      )
    }

    function BubbleStatePicker({ value, disabled, onChange }) {
      const selected = Array.isArray(value) ? value : []
      const toggle = (state, checked) => {
        const next = new Set(selected)
        if (checked) next.add(state)
        else next.delete(state)
        onChange([...next])
      }
      return h('div', { style: bubbleGridStyle },
        ...BUBBLE_STATE_OPTIONS.map(([state, label]) =>
          h('label', { key: state, style: { display: 'flex', alignItems: 'center', gap: 4 } },
            h('input', {
              type: 'checkbox', checked: selected.includes(state), disabled,
              onChange: (event) => toggle(state, event.target.checked),
            }),
            label,
          ),
        ),
      )
    }

    function PetSettingsCard() {
      const [status, setStatus] = useState('loading')
      const [value, setValue] = useState({})
      const [busy, setBusy] = useState(false)
      const patchSeq = useRef(0)
      const sliderTimers = useRef(new Map())
      const writable = status === 'ready' && !busy

      useEffect(() => {
        let active = true
        fetch(CONFIG_ENDPOINT, { cache: 'no-store' })
          .then(async (response) => {
            if (!response.ok) throw new Error(`settings request failed: ${response.status}`)
            return response.json()
          })
          .then((next) => { if (active) { setValue(next); setStatus('ready') } })
          .catch(() => { if (active) setStatus('unavailable') })
        return () => {
          active = false
          for (const timer of sliderTimers.current.values()) clearTimeout(timer)
          sliderTimers.current.clear()
        }
      }, [])

      const write = async (field, next) => {
        const seq = ++patchSeq.current
        setBusy(true)
        try {
          const response = await fetch(CONFIG_ENDPOINT, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ [field]: next }),
          })
          if (!response.ok) throw new Error(`settings write failed: ${response.status}`)
          const updated = await response.json()
          if (seq === patchSeq.current) {
            setValue(updated)
            setStatus('ready')
          }
        } catch {
          if (seq === patchSeq.current) setStatus('unavailable')
        } finally {
          if (seq === patchSeq.current) setBusy(false)
        }
      }

      const writeSlider = (field, next) => {
        setValue((prev) => ({ ...prev, [field]: next }))
        patchSeq.current += 1
        const pending = sliderTimers.current.get(field)
        if (pending) clearTimeout(pending)
        const timer = setTimeout(() => {
          sliderTimers.current.delete(field)
          void write(field, next)
        }, 250)
        sliderTimers.current.set(field, timer)
      }

      return h('li', { style: cardStyle, 'data-testid': 'better-dsh-pet-settings' },
        h('div', null,
          h('strong', { style: { fontSize: 16 } }, 'Better DSH Pet（大肥鱼增强版）'),
          h('p', { style: { margin: '5px 0 0', opacity: 0.72 } }, '由 better-dsh-pet 提供：独立桌面气泡，DSH 状态联动、余额、番茄钟、吐槽、自定义动作。'),
        ),
        status === 'unavailable'
          ? h('span', { role: 'status' }, 'Better DSH Pet 设置尚未连接到 DSH Host。')
          : status === 'loading'
          ? h('span', null, '正在读取设置…')
          : h(React.Fragment, null,
            h(Field, { label: '启用 Better DSH Pet', hint: '关闭后立即退出桌面气泡；重新开启无需单独启动程序。' },
              h('input', {
                type: 'checkbox', checked: value.enabled !== false, disabled: !writable,
                onChange: (event) => void write('enabled', event.target.checked),
              }),
            ),
            h(Field, { label: '角色大小', hint: `${Math.round((value.scale ?? 1) * 100)}%` },
              h('input', {
                type: 'range', min: 0.7, max: 1.4, step: 0.05, value: value.scale ?? 1,
                disabled: status !== 'ready',
                onChange: (event) => void writeSlider('scale', Number(event.target.value)),
              }),
            ),
            h(Field, { label: '宠物宽度（px）', hint: '基础尺寸，配合“角色大小”百分比使用，重启后生效。' },
              h('input', {
                type: 'number', min: 100, max: 1000, step: 10,
                value: value.petSize ?? 460, disabled: !writable, style: selectStyle,
                onChange: (event) => void write('petSize', Number(event.target.value)),
              }),
            ),
            h(Field, { label: '移动频繁度（%）', hint: '数值越高，待机时越容易走动。' },
              h('input', {
                type: 'range', min: 0, max: 100, step: 1,
                value: value.moveChance ?? 20, disabled: status !== 'ready',
                onChange: (event) => void writeSlider('moveChance', Number(event.target.value)),
              }),
            ),
            h(Field, { label: '动作切换间隔（ms）', hint: '每个动作播完后的停顿时间，0 表示立即切换。' },
              h('input', {
                type: 'range', min: 0, max: 5000, step: 100,
                value: value.actionDelayMs ?? 0, disabled: status !== 'ready',
                onChange: (event) => void writeSlider('actionDelayMs', Number(event.target.value)),
              }),
            ),
            h(Field, { label: '活跃程度', hint: '控制空闲时微动作的出现频率。' },
              h('select', {
                value: value.activityLevel ?? 'normal', disabled: !writable, style: selectStyle,
                onChange: (event) => void write('activityLevel', event.target.value),
              },
              h('option', { value: 'quiet' }, '安静'),
              h('option', { value: 'normal' }, '标准'),
              h('option', { value: 'lively' }, '活泼')),
            ),
            h(Field, { label: '减少动态效果', hint: '减少走动、循环帧和程序化晃动。' },
              h('input', {
                type: 'checkbox', checked: value.reducedMotion === true, disabled: !writable,
                onChange: (event) => void write('reducedMotion', event.target.checked),
              }),
            ),
            h(Field, { label: '气泡显示', hint: '常驻显示、完全隐藏，或自定义哪些状态显示气泡。' },
              h('select', {
                value: value.bubbleMode ?? 'always', disabled: !writable, style: selectStyle,
                onChange: (event) => void write('bubbleMode', event.target.value),
              },
              h('option', { value: 'always' }, '常驻显示'),
              h('option', { value: 'hidden' }, '完全隐藏'),
              h('option', { value: 'custom' }, '自定义显示状态')),
            ),
            (value.bubbleMode ?? 'always') !== 'hidden'
              ? h(Field, { label: '气泡大小', hint: `${Math.round((value.bubbleScale ?? 1) * 100)}%` },
                  h('input', {
                    type: 'range', min: 0.8, max: 1.2, step: 0.05, value: value.bubbleScale ?? 1,
                    disabled: status !== 'ready',
                    onChange: (event) => void writeSlider('bubbleScale', Number(event.target.value)),
                  }),
                )
              : null,
            (value.bubbleMode ?? 'always') === 'custom'
              ? h(Field, { label: '自定义显示状态', hint: '勾选后，只有这些状态出现时才会显示气泡。' },
                  h(BubbleStatePicker, {
                    value: value.bubbleStates ?? ['SUCCESS', 'ERROR', 'WAITING'],
                    disabled: !writable,
                    onChange: (next) => void write('bubbleStates', next),
                  }),
                )
              : null,
            h(Field, { label: '响应子 Agent', hint: '默认只跟随顶层任务，避免状态过度跳动。' },
              h('input', {
                type: 'checkbox', checked: value.includeSubagents === true, disabled: !writable,
                onChange: (event) => void write('includeSubagents', event.target.checked),
              }),
            ),
            h(Field, { label: '自动吐槽', hint: '根据本次对话自动生成吐槽（会消耗 Token）。' },
              h('input', {
                type: 'checkbox', checked: value.roastEnabled === true, disabled: !writable,
                onChange: (event) => void write('roastEnabled', event.target.checked),
              }),
            ),
            h(Field, { label: '允许行走', hint: '关闭后待机不会再走动。' },
              h('input', {
                type: 'checkbox', checked: value.walkEnabled !== false, disabled: !writable,
                onChange: (event) => void write('walkEnabled', event.target.checked),
              }),
            ),
            h(Field, { label: '自定义待机动作', hint: '填写动作名，用逗号分隔；留空=全部动作。' },
              h('textarea', {
                rows: 3,
                style: Object.assign({ width: '100%', padding: '6px 8px', borderRadius: 8 }, selectStyle),
                value: Array.isArray(value.enabledActions) ? value.enabledActions.join(', ') : '',
                disabled: !writable,
                onChange: (event) => void write('enabledActions', event.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean)),
              }),
            ),
            h(Field, { label: '自定义播放顺序', hint: '按顺序播放这些动作，用逗号分隔；留空=随机。' },
              h('textarea', {
                rows: 3,
                style: Object.assign({ width: '100%', padding: '6px 8px', borderRadius: 8 }, selectStyle),
                value: Array.isArray(value.actionOrder) ? value.actionOrder.join(', ') : '',
                disabled: !writable,
                onChange: (event) => void write('actionOrder', event.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean)),
              }),
            ),
            h(Field, { label: '番茄钟工作时长（分钟）', hint: '右键菜单“开始番茄钟”使用此时长。' },
              h('input', {
                type: 'number', min: 1, max: 120, step: 1,
                value: value.workMinutes ?? 25, disabled: !writable, style: selectStyle,
                onChange: (event) => void write('workMinutes', Number(event.target.value)),
              }),
            ),
            h(Field, { label: '番茄钟休息时长（分钟）', hint: '右键菜单“开始短休息”使用此时长。' },
              h('input', {
                type: 'number', min: 1, max: 60, step: 1,
                value: value.breakMinutes ?? 5, disabled: !writable, style: selectStyle,
                onChange: (event) => void write('breakMinutes', Number(event.target.value)),
              }),
            ),
            busy ? h('small', { role: 'status' }, '正在保存…') : null,
          ),
      )
    }

    function apply(ctx) {
      ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
        name: 'settings.plugin.item', id: 'better-dsh-pet', order: 30,
        inject: () => ({}),
      }, PetSettingsCard))
    }

    exports.name = 'better-dsh-pet-client'
    exports.inject = ['slots']
    exports.apply = apply
    return module.exports
  },
})
