/**
 * sensevoice.js —— 宿主端本地语音转写（SenseVoice + sherpa-onnx-node）。
 *
 * 参考 dsh-voice-local 的封装方式：
 * - recognizer 单例复用，模型只加载一次
 * - decode 串行化
 * - 输入 WAV 统一转成 16kHz 单声道 float32
 */
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join, isAbsolute } from 'node:path'
import { existsSync } from 'node:fs'

const require = createRequire(import.meta.url)
export const TARGET_SAMPLE_RATE = 16000

export function defaultModelDir() {
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'voice', 'sensevoice')
}

export function resolveModelDir(dir) {
  if (typeof dir === 'string' && dir.trim() !== '') {
    return isAbsolute(dir) ? dir : join(process.cwd(), dir)
  }
  if (typeof process.env.DSH_VOICE_MODEL_DIR === 'string' && process.env.DSH_VOICE_MODEL_DIR.trim() !== '') {
    return process.env.DSH_VOICE_MODEL_DIR.trim()
  }
  return defaultModelDir()
}

export function modelFiles(dir = resolveModelDir()) {
  return {
    model: join(dir, 'model.int8.onnx'),
    tokens: join(dir, 'tokens.txt'),
  }
}

export function modelReady(dir = resolveModelDir()) {
  const { model, tokens } = modelFiles(dir)
  return existsSync(model) && existsSync(tokens)
}

let recognizer = null
let recognizerDir = null
let queue = Promise.resolve()

function loadRecognizer(dir) {
  const sherpa = require('sherpa-onnx-node/non-streaming-asr.js')
  const { OfflineRecognizer } = sherpa
  const { model, tokens } = modelFiles(dir)
  return new OfflineRecognizer({
    modelConfig: {
      senseVoice: {
        model,
        language: 'auto',
        useInverseTextNormalization: 1,
      },
      tokens,
      provider: 'cpu',
      numThreads: 4,
    },
    featConfig: { sampleRate: TARGET_SAMPLE_RATE, featureDim: 80 },
  })
}

async function ensureRecognizer(dir = resolveModelDir()) {
  if (recognizer !== null && recognizerDir === dir) return recognizer
  if (!modelReady(dir)) {
    throw new Error('SenseVoice 模型未就绪：请先运行 npm run download:sensevoice 或等待自动下载')
  }
  recognizer = loadRecognizer(dir)
  recognizerDir = dir
  return recognizer
}

/** 解析 WAV（支持 PCM16 单/双声道）为 16kHz 单声道 Float32Array。 */
export function wavToFloat32(buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  if (buffer.length < 44) throw new Error('invalid WAV: too short')
  if (view.getUint32(0, true) !== 0x46464952) throw new Error('invalid WAV: not RIFF')
  let channels = 1
  let sampleRate = 16000
  let bitsPerSample = 16
  let dataOffset = -1
  let dataLength = 0
  let offset = 12
  while (offset + 8 <= buffer.length) {
    const id = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3))
    const size = view.getUint32(offset + 4, true)
    if (id === 'fmt ') {
      channels = view.getUint16(offset + 10, true)
      sampleRate = view.getUint32(offset + 12, true)
      bitsPerSample = view.getUint16(offset + 22, true)
    } else if (id === 'data') {
      dataOffset = offset + 8
      dataLength = size
      break
    }
    offset += 8 + size + (size % 2)
  }
  if (dataOffset < 0) throw new Error('invalid WAV: no data chunk')
  if (bitsPerSample !== 16) throw new Error(`unsupported WAV bits: ${bitsPerSample}`)
  const bytesPerSample = bitsPerSample / 8
  const frameCount = Math.floor(dataLength / (bytesPerSample * channels))
  const samples = new Float32Array(frameCount)
  for (let i = 0; i < frameCount; i++) {
    let sum = 0
    for (let ch = 0; ch < channels; ch++) {
      const byteIndex = dataOffset + (i * channels + ch) * bytesPerSample
      const int16 = view.getInt16(byteIndex, true)
      sum += int16 / 32768
    }
    samples[i] = channels > 1 ? sum / channels : sum
  }
  if (sampleRate === TARGET_SAMPLE_RATE) return samples
  return resampleLinear(samples, sampleRate, TARGET_SAMPLE_RATE)
}

function resampleLinear(input, fromRate, toRate) {
  if (input.length === 0) return new Float32Array(0)
  const ratio = fromRate / toRate
  const outputLength = Math.max(1, Math.round(input.length / ratio))
  const output = new Float32Array(outputLength)
  for (let i = 0; i < outputLength; i++) {
    const pos = i * ratio
    const index = Math.floor(pos)
    const frac = pos - index
    const a = input[Math.min(index, input.length - 1)]
    const b = input[Math.min(index + 1, input.length - 1)]
    output[i] = a + (b - a) * frac
  }
  return output
}

/** 转写 WAV Buffer，返回文本。 */
export async function transcribeWav(buffer, dir = resolveModelDir()) {
  const samples = wavToFloat32(buffer)
  const rec = await ensureRecognizer(dir)
  const run = () => {
    const stream = rec.createStream()
    stream.acceptWaveform({ samples, sampleRate: TARGET_SAMPLE_RATE })
    return rec.decodeAsync(stream)
  }
  const result = await (queue = queue.then(run, run))
  const text = result?.text || ''
  return text.trim()
}
