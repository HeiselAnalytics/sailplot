import { PLAYBACK_SEGMENT_DURATION_MS } from '../features/playback/playback'

export type AnimationExportFormat = 'gif' | 'gif-transparent' | 'mp4'

interface AnimationExportOptions {
  lastPosition: number
  speed: number
  renderFrame: (position: number, transparent: boolean) => Promise<string>
  onProgress?: (progress: number) => void
}

const GIF_FRAMES_PER_SECOND = 20
const MP4_FRAMES_PER_SECOND = 30
const GIF_MAX_WIDTH = 1200
const MP4_MAX_WIDTH = 1600

export const animationPlaybackPositions = (
  lastPosition: number,
  framesPerSecond: number,
  speed = 1,
) => {
  if (lastPosition <= 1) return [1]
  const segmentDurationSeconds = PLAYBACK_SEGMENT_DURATION_MS / 1000
  const safeSpeed = Math.max(Number.EPSILON, speed)
  const frameSteps = Math.max(
    1,
    Math.round(((lastPosition - 1) * segmentDurationSeconds * framesPerSecond) / safeSpeed),
  )
  return Array.from(
    { length: frameSteps + 1 },
    (_, index) => 1 + ((lastPosition - 1) * index) / frameSteps,
  )
}

export const animationFrameDurationSeconds = (framesPerSecond: number) => 1 / framesPerSecond

const loadImage = (source: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not render an animation frame'))
    image.src = source
  })

const scaledDimensions = (
  width: number,
  height: number,
  maximumWidth: number,
  requireEvenDimensions = false,
) => {
  const scale = Math.min(1, maximumWidth / width)
  let outputWidth = Math.max(1, Math.round(width * scale))
  let outputHeight = Math.max(1, Math.round(height * scale))
  if (requireEvenDimensions) {
    outputWidth += outputWidth % 2
    outputHeight += outputHeight % 2
  }
  return { width: outputWidth, height: outputHeight }
}

const prepareFrameCanvas = async (
  firstFrame: string,
  maximumWidth: number,
  requireEvenDimensions = false,
) => {
  const image = await loadImage(firstFrame)
  const { width, height } = scaledDimensions(
    image.naturalWidth,
    image.naturalHeight,
    maximumWidth,
    requireEvenDimensions,
  )
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { alpha: true })
  if (!context) throw new Error('Could not prepare the animation export')
  return { canvas, context, firstImage: image }
}

const drawFrame = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
) => {
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
}

const yieldToBrowser = () => new Promise<void>((resolve) => window.setTimeout(resolve, 0))

const renderNextFrame = async (
  source: string,
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
) => {
  const image = await loadImage(source)
  drawFrame(context, canvas, image)
}

export async function createGifExport(
  options: AnimationExportOptions & { transparent: boolean },
): Promise<Blob> {
  const positions = animationPlaybackPositions(
    options.lastPosition,
    GIF_FRAMES_PER_SECOND,
    options.speed,
  )
  const firstFrame = await options.renderFrame(positions[0], options.transparent)
  const { canvas, context, firstImage } = await prepareFrameCanvas(firstFrame, GIF_MAX_WIDTH)
  const { GIFEncoder, applyPalette, quantize } = await import('gifenc')
  const gif = GIFEncoder()
  const delay = animationFrameDurationSeconds(GIF_FRAMES_PER_SECOND) * 1000

  for (let index = 0; index < positions.length; index += 1) {
    if (index === 0) drawFrame(context, canvas, firstImage)
    else {
      const frame = await options.renderFrame(positions[index], options.transparent)
      await renderNextFrame(frame, canvas, context)
    }

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const format = options.transparent ? 'rgba4444' : 'rgb565'
    const palette = quantize(imageData.data, 256, {
      format,
      oneBitAlpha: options.transparent,
    })
    const indexedPixels = applyPalette(imageData.data, palette, format)
    const transparentIndex = options.transparent ? palette.findIndex((color) => color[3] === 0) : -1
    if (transparentIndex >= 0) {
      for (let pixel = 0; pixel < indexedPixels.length; pixel += 1) {
        if (imageData.data[pixel * 4 + 3] <= 127) indexedPixels[pixel] = transparentIndex
      }
    }
    gif.writeFrame(indexedPixels, canvas.width, canvas.height, {
      palette,
      delay,
      repeat: 0,
      transparent: transparentIndex >= 0,
      transparentIndex: Math.max(0, transparentIndex),
      dispose: options.transparent ? 2 : -1,
    })
    options.onProgress?.((index + 1) / positions.length)
    if (index % 4 === 3) await yieldToBrowser()
  }

  gif.finish()
  return new Blob([gif.bytes()], { type: 'image/gif' })
}

export async function createMp4Export(options: AnimationExportOptions): Promise<Blob> {
  const positions = animationPlaybackPositions(
    options.lastPosition,
    MP4_FRAMES_PER_SECOND,
    options.speed,
  )
  const firstFrame = await options.renderFrame(positions[0], false)
  const { canvas, context, firstImage } = await prepareFrameCanvas(firstFrame, MP4_MAX_WIDTH, true)
  const { BufferTarget, CanvasSource, Mp4OutputFormat, Output, Quality, canEncodeVideo } =
    await import('mediabunny')
  const supported = await canEncodeVideo('avc', {
    width: canvas.width,
    height: canvas.height,
    quality: new Quality('high'),
  })
  if (!supported) {
    throw new Error('MP4 export is not supported by this browser')
  }

  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new BufferTarget(),
  })
  const source = new CanvasSource(canvas, {
    codec: 'avc',
    quality: new Quality('high'),
    keyFrameInterval: 2,
  })
  output.addVideoTrack(source)
  await output.start()
  const frameDuration = animationFrameDurationSeconds(MP4_FRAMES_PER_SECOND)

  try {
    for (let index = 0; index < positions.length; index += 1) {
      if (index === 0) drawFrame(context, canvas, firstImage)
      else {
        const frame = await options.renderFrame(positions[index], false)
        await renderNextFrame(frame, canvas, context)
      }
      await source.add(index * frameDuration, frameDuration, {
        keyFrame: index % (MP4_FRAMES_PER_SECOND * 2) === 0,
      })
      options.onProgress?.((index + 1) / positions.length)
    }
    await output.finalize()
  } catch (error) {
    if (output.state !== 'finalized') await output.cancel()
    throw error
  }

  const buffer = output.target.buffer
  if (!buffer) throw new Error('Could not finalize the MP4 export')
  return new Blob([buffer], { type: 'video/mp4' })
}
