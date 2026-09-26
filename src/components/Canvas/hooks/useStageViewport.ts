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
  // Native listeners rather than Konva's: Konva stops firing touchmove while
  // a drag is in progress, so a pinch that begins with one finger panning
  // would stall. The stage is transformed directly while pinching; React
  // state and the store are only updated at a throttled rate and at the end,
  // so a pinch doesn't re-render every entity on every move.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const el = stage.container()
    let pinch: { dist: number; center: { x: number; y: number }; lastCommit: number } | null = null

    const commit = () => {
      setStageScale(stage.scaleX())
      setViewport({ x: stage.x(), y: stage.y(), zoom: stage.scaleX() })
    }

    const measure = (touches: TouchList) => {
      const rect = el.getBoundingClientRect()
      const p1 = { x: touches[0].clientX - rect.left, y: touches[0].clientY - rect.top }
      const p2 = { x: touches[1].clientX - rect.left, y: touches[1].clientY - rect.top }
      return {
        center: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
        dist: Math.max(1, Math.hypot(p2.x - p1.x, p2.y - p1.y)),
      }
    }

    // A second finger cancels whatever the first one started (stage pan or
    // entity drag), including drags that haven't passed the drag threshold yet.
    const stopDrags = () => {
      Konva.DD._dragElements.forEach(elem => elem.node.stopDrag())
    }

    const onStart = (e: TouchEvent) => {
      if (e.touches.length < 2) return
      e.preventDefault()
      stopDrags()
      pinch = { ...measure(e.touches), lastCommit: performance.now() }
    }

    const onMove = (e: TouchEvent) => {
      if (!pinch || e.touches.length < 2) return
      e.preventDefault()
      stopDrags()
      const { center, dist } = measure(e.touches)
      const oldScale = stage.scaleX()
      const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldScale * (dist / pinch.dist)))
      // Keep the world point under the previous centre fixed, then follow the centre's movement
      const world = {
        x: (pinch.center.x - stage.x()) / oldScale,
        y: (pinch.center.y - stage.y()) / oldScale,
      }
      stage.scale({ x: newScale, y: newScale })
      stage.position({ x: center.x - world.x * newScale, y: center.y - world.y * newScale })
      stage.batchDraw()

      // Refresh the grid and anything else reading the store now and then
      const now = performance.now()
      const due = now - pinch.lastCommit > 120
      pinch = { center, dist, lastCommit: due ? now : pinch.lastCommit }
      if (due) commit()
    }

    const onEnd = (e: TouchEvent) => {
      if (!pinch || e.touches.length >= 2) return
      pinch = null
      commit()
    }

    const opts = { capture: true, passive: false }
    el.addEventListener('touchstart', onStart, opts)
    el.addEventListener('touchmove', onMove, opts)
    el.addEventListener('touchend', onEnd, opts)
    el.addEventListener('touchcancel', onEnd, opts)
    return () => {
      el.removeEventListener('touchstart', onStart, opts)
      el.removeEventListener('touchmove', onMove, opts)
      el.removeEventListener('touchend', onEnd, opts)
      el.removeEventListener('touchcancel', onEnd, opts)
    }
  }, [setViewport])

  return { stageRef, stageScale, viewport, zoomIn, zoomOut, zoomToFit, handleStageDragEnd }
}
