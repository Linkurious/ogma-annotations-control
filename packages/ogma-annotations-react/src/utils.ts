// mean value
export function mean(array: number[]) {
  return array.reduce((a, b) => a + b, 0) / array.length;
}
export function interpolate(t: number, min = 0, max = 1) {
  return min + (max - min) * t;
}

export function normalize(t: number, min = 0, max = 1) {
  return (t - min) / (max - min);
}
