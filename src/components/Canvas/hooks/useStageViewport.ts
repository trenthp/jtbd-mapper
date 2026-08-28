import { useCallback, useEffect, useRef, useState } from 'react'
import Konva from 'konva'
import { useCanvasStore } from '@/stores/canvasStore'
import { fitToEntities } from '@/lib/canvas/geometry'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 3

/**
 * Owns the Konva stage ref and keeps it in sync with the persisted viewport.
 * Provides animated zoom helpers; wheel zoom is attached directly to the stage.
 */
export function useStageViewport(width: number, height: number) {
  const stageRef = useRef<Konva.Stage>(null)
  const [stageScale, setStageScale] = useState(1)
  const viewport = useCanvasStore(s => s.viewport)
  const setViewport = useCanvasStore(s => s.setViewport)

  // Animate the stage to a new transform and commit it to the store when done.
  const animateTo = useCallback((scale: number, pos: { x: number; y: number }, duration: number, easing = Konva.Easings.EaseOut) => {
    const stage = stageRef.current
    if (!stage) return
    new Konva.Tween({
      node: stage,
      duration,
      easing,
      scaleX: scale,
      scaleY: scale,
      x: pos.x,
      y: pos.y,
      onUpdate: () => setStageScale(stage.scaleX()),
      onFinish: () => setViewport({ x: stage.x(), y: stage.y(), zoom: stage.scaleX() }),
    }).play()
  }, [setViewport])

  /** Zoom by `factor` keeping the given screen point fixed. */
  const zoomAround = useCallback((factor: number, screenPoint: { x: number; y: number }, duration = 0.2) => {
    const stage = stageRef.current
    if (!stage) return
    const oldScale = stage.scaleX()
    const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldScale * factor))
    const worldPoint = {
      x: (screenPoint.x - stage.x()) / oldScale,
      y: (screenPoint.y - stage.y()) / oldScale,
    }
    animateTo(newScale, {
      x: screenPoint.x - worldPoint.x * newScale,
      y: screenPoint.y - worldPoint.y * newScale,
    }, duration)
  }, [animateTo])

  const viewCenter = useCallback(() => ({ x: width / 2, y: height / 2 }), [width, height])
  const zoomIn = useCallback(() => zoomAround(1.2, viewCenter()), [zoomAround, viewCenter])
  const zoomOut = useCallback(() => zoomAround(1 / 1.2, viewCenter()), [zoomAround, viewCenter])

  const zoomToFit = useCallback((entities: Array<{ positionX: number; positionY: number }>) => {
    const fit = fitToEntities(entities, width, height)
    if (fit) animateTo(fit.scale, { x: fit.x, y: fit.y }, 0.5, Konva.Easings.EaseInOut)
  }, [animateTo, width, height])

  // Apply the persisted viewport on mount and whenever it changes elsewhere
  // (minimap, panTo) by more than a rounding error.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const pos = stage.position()
    if (
      Math.abs(stage.scaleX() - viewport.zoom) > 0.01 ||
      Math.abs(pos.x - viewport.x) > 1 ||
      Math.abs(pos.y - viewport.y) > 1
    ) {
      stage.scale({ x: viewport.zoom, y: viewport.zoom })
      stage.position({ x: viewport.x, y: viewport.y })
      setStageScale(viewport.zoom)
    }
  }, [viewport])

  // Wheel zoom around the pointer
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault()
      const pointer = stage.getPointerPosition()
      if (!pointer) return
      zoomAround(e.evt.deltaY < 0 ? 1.08 : 1 / 1.08, pointer, 0.1)
    }
    stage.on('wheel', handleWheel)
    return () => { stage.off('wheel', handleWheel) }
  }, [zoomAround])

  const handleStageDragEnd = useCallback(() => {
    const stage = stageRef.current
    if (stage) setViewport({ x: stage.x(), y: stage.y() })
  }, [setViewport])

  // ---- pinch zoom (touch) ----
  const pinch = useRef<{ dist: number; center: { x: number; y: number } } | null>(null)

  const handleTouchMove = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    const stage = stageRef.current
    const [t1, t2] = [e.evt.touches[0], e.evt.touches[1]]
    if (!stage || !t1 || !t2) return
    e.evt.preventDefault()
    // Two fingers: stop any one-finger pan Konva started
    if (stage.isDragging()) stage.stopDrag()

    const rect = stage.container().getBoundingClientRect()
    const p1 = { x: t1.clientX - rect.left, y: t1.clientY - rect.top }
    const p2 = { x: t2.clientX - rect.left, y: t2.clientY - rect.top }
    const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)

    if (!pinch.current) {
      pinch.current = { dist, center }
      return
    }

    const oldScale = stage.scaleX()
    const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldScale * (dist / pinch.current.dist)))
    // Keep the world point under the previous centre fixed, then follow the centre's movement
    const worldCenter = {
      x: (pinch.current.center.x - stage.x()) / oldScale,
      y: (pinch.current.center.y - stage.y()) / oldScale,
    }
    stage.scale({ x: newScale, y: newScale })
    stage.position({ x: center.x - worldCenter.x * newScale, y: center.y - worldCenter.y * newScale })
    stage.batchDraw()
    setStageScale(newScale)
    pinch.current = { dist, center }
  }, [])

  const handleTouchEnd = useCallback(() => {
    const stage = stageRef.current
    if (pinch.current && stage) {
      setViewport({ x: stage.x(), y: stage.y(), zoom: stage.scaleX() })
    }
    pinch.current = null
  }, [setViewport])

  return { stageRef, stageScale, viewport, zoomIn, zoomOut, zoomToFit, handleStageDragEnd, handleTouchMove, handleTouchEnd }
}
