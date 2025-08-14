export type Point = {
  x: number;
  y: number;
};

export type Vector = Point;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Bounding box object, with the following properties:
 * - [0]: min x
 * - [1]: min y
 * - [2]: max x
 * - [3]: max y
 */
export type Bounds = [number, number, number, number];
