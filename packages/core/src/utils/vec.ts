import { Vector } from "../types";

// subtract two vectors
export const subtract = (a: Vector, b: Vector): Vector => ({
  x: a.x - b.x,
  y: a.y - b.y
});

export const length = (v: Vector): number => Math.sqrt(v.x * v.x + v.y * v.y);

export const invert = (v: Vector): Vector => ({
  x: -v.x,
  y: -v.y
});

export const clone = (v: Vector) => ({
  x: v.x,
  y: v.y
});

export const normalize = (v: Vector): Vector => {
  const l = length(v);
  if (l === 0) return { x: 0, y: 0 };
  return {
    x: v.x / l,
    y: v.y / l
  };
};

export const add = (a: Vector, b: Vector): Vector => ({
  x: a.x + b.x,
  y: a.y + b.y
});

export const mul = (v: Vector, s: number): Vector => ({
  x: v.x * s,
  y: v.y * s
});

export const multiply = (a: Vector, b: Vector): Vector => ({
  x: a.x * b.x,
  y: a.y * b.y
});

export const rotateRadians = (v: Vector, angle: number): Vector => {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos
  };
};

export const divScalar = (v: Vector, s: number): Vector => ({
  x: v.x / s,
  y: v.y / s
});

export const dot = (a: Vector, b: Vector): number => a.x * b.x + a.y * b.y;

export const cross = (a: Vector, b: Vector): number => a.x * b.y - a.y * b.x;
