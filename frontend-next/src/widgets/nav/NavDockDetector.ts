export type DockEdge = 'left' | 'right' | 'top' | 'bottom' | null

export function detectDockEdge(
  x: number,
  y: number,
  w: number,
  h: number,
  maxCols: number,
  allWidgets: Array<{ y: number; h: number }>,
): DockEdge {
  if (x === 0) return 'left'
  if (x + w >= maxCols) return 'right'
  if (y === 0) return 'top'
  // Check if this is the lowest widget
  const maxBottom = Math.max(...allWidgets.map((widget) => widget.y + widget.h))
  if (y + h >= maxBottom) return 'bottom'
  return null
}
