export interface ViewTransform {
  x: number
  y: number
  scale: number
}

export interface Coordinate {
  x: number
  y: number
}

export function screenToCanvas(point: Coordinate, view: ViewTransform): Coordinate {
  return { x: (point.x - view.x) / view.scale, y: (point.y - view.y) / view.scale }
}

export function canvasToScreen(point: Coordinate, view: ViewTransform): Coordinate {
  return { x: point.x * view.scale + view.x, y: point.y * view.scale + view.y }
}

export function translateGroup<T extends { id: string; x: number; y: number }>(
  objects: T[],
  dx: number,
  dy: number,
): T[] {
  return objects.map((object) => ({ ...object, x: object.x + dx, y: object.y + dy }))
}
