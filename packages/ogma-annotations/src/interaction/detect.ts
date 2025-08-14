export class HitDetector {
  private hitThreshold: number = 0;

  constructor(hitThreshold: number) {
    this.hitThreshold = hitThreshold;
  }

  public detectHit(point: Point, shapes: Shape[]): Shape | null {
    for (const shape of shapes) {
      if (this.isPointInShape(point, shape)) {
        return shape;
      }
    }
    return null;
  }

  private isPointInShape(point: Point, shape: Shape): boolean {
    // Implement hit detection logic based on shape type
    return false;
  }
}
