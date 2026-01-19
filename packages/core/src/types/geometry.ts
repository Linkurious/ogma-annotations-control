/** 2D coordinate */
export type Point = {
  x: number;
  y: number;
};

/** @private */
export type Vector = Point;

/**
 * Bounding box object, with the following properties:
 * - [0]: min x
 * - [1]: min y
 * - [2]: max x
 * - [3]: max y
 */
export type Bounds = [number, number, number, number];
