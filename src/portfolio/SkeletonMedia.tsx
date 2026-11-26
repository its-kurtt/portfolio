import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import type { CanvasHTMLAttributes } from 'react'

const loadedImageCache = new Map<string, HTMLImageElement>()

function drawToCanvas(canvas: HTMLCanvasElement, img: HTMLImageElement) {
  if (img.naturalWidth <= 0 || img.naturalHeight <= 0) return
  if (
    canvas.width !== img.naturalWidth ||
    canvas.height !== img.naturalHeight
  ) {
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
  }
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  }
}

type ProtectedImageCanvasProps = Omit<
  CanvasHTMLAttributes<HTMLCanvasElement>,
  'width' | 'height'
> & {
  src?: string
  alt?: string
  width?: number | string
  height?: number | string
  loading?: 'eager' | 'lazy'
  fetchPriority?: 'high' | 'low' | 'auto'
  onImageLoad?: () => void
  onImageError?: () => void
}

/**
 * Renders an image onto a <canvas> from an in-memory Image object so no raw
 * <img src="..."> URL is exposed in Inspect Element.
 */
export const ProtectedImageCanvas = forwardRef<
  HTMLCanvasElement,
  ProtectedImageCanvasProps
>(function ProtectedImageCanvas(
  {
    src = '',
    alt = '',
    className = '',
    width: _width,
    height: _height,
    loading: _loading,
    fetchPriority: _fetchPriority,
    onImageLoad,
    onImageError,
    ...rest
  },
  forwardedRef,
) {
  void _width
  void _height
  void _loading
  void _fetchPriority

  const localRef = useRef<HTMLCanvasElement | null>(null)
  const onLoadRef = useRef(onImageLoad)
  onLoadRef.current = onImageLoad
  const onErrorRef = useRef(onImageError)
  onErrorRef.current = onImageError

  const setCanvasRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      localRef.current = node
      if (typeof forwardedRef === 'function') {
        forwardedRef(node)
      } else if (forwardedRef) {
        forwardedRef.current = node
      }
      if (node && src) {
        const cached = loadedImageCache.get(src)
        if (cached) {
          drawToCanvas(node, cached)
        }
      }
    },
    [forwardedRef, src],
  )

  useEffect(() => {
    if (!src) return
    const cached = loadedImageCache.get(src)
    if (cached) {
      if (localRef.current) drawToCanvas(localRef.current, cached)
      onLoadRef.current?.()
      return
    }

    let cancelled = false
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      if (cancelled) return
      loadedImageCache.set(src, img)
      if (localRef.current) drawToCanvas(localRef.current, img)
      onLoadRef.current?.()
    }
    img.onerror = () => {
      if (cancelled) return
      onErrorRef.current?.()
    }
    img.src = src

    return () => {
      cancelled = true
    }
  }, [src])

  return (
    <canvas
      ref={setCanvasRef}
      className={className}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      {...rest}
    />
  )
})

type SkeletonImageProps = Omit<
  ProtectedImageCanvasProps,
  'onImageLoad' | 'onImageError'
> & {
  wrapperClassName?: string
}

export const SkeletonImage = forwardRef<HTMLCanvasElement, SkeletonImageProps>(
  function SkeletonImage(
    { src = '', wrapperClassName = '', className = '', ...rest },
    forwardedRef,
  ) {
    const [loadedSrc, setLoadedSrc] = useState<string>(() =>
      src && loadedImageCache.has(src) ? src : '',
    )
    const isLoaded = !src || loadedSrc === src || loadedImageCache.has(src)

    const handleLoaded = useCallback(() => {
      if (src) setLoadedSrc(src)
    }, [src])

    return (
      <span
        className={`skeleton-media ${isLoaded ? 'is-loaded' : 'is-loading'} ${wrapperClassName}`.trim()}
      >
        <ProtectedImageCanvas
          ref={forwardedRef}
          src={src}
          className={`skeleton-media-img ${className}`.trim()}
          onImageLoad={handleLoaded}
          onImageError={handleLoaded}
          {...rest}
        />
      </span>
    )
  },
)
