/**
 * Idempotent registration of the `vanilla-colorful` rgba color picker.
 *
 * The package's `vanilla-colorful/rgba-color-picker.js` entry calls
 * `customElements.define('rgba-color-picker', ...)` unconditionally. When that
 * module is evaluated more than once in a page — which happens when it is
 * reached through two different bundling/resolution paths (e.g. a consuming app
 * bundling its own copy alongside our externalized copy) — the second `define`
 * throws `NotSupportedError: the name "rgba-color-picker" has already been
 * used`. We import the non-defining base class and register it ourselves behind
 * a `customElements.get()` guard so registration is safe to run any number of
 * times.
 */
import { RgbaBase } from "vanilla-colorful/lib/entrypoints/rgba";

/** Channel-wise rgba color, as read/written by the picker's `color` property. */
export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * The public surface of the `<rgba-color-picker>` element we rely on. Declared
 * locally (rather than re-exporting `vanilla-colorful`'s class type) so that
 * consumers don't have to resolve the package's deep `lib/entrypoints` types,
 * which it does not expose via its `exports` map.
 */
export interface RgbaColorPicker extends HTMLElement {
  color: RgbaColor;
  addEventListener(
    type: "color-changed",
    listener: (event: CustomEvent<{ value: RgbaColor }>) => void
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
}

const TAG = "rgba-color-picker";

class OgmaRgbaColorPicker extends RgbaBase {}

/**
 * Registers `<rgba-color-picker>` if it isn't already, then returns a fresh
 * instance. Safe to call repeatedly and from multiple module copies.
 */
export function createRgbaColorPicker(): RgbaColorPicker {
  if (!customElements.get(TAG)) {
    customElements.define(TAG, OgmaRgbaColorPicker);
  }
  // Construct via the registered element so we get the same definition
  // regardless of which module copy first defined it.
  return document.createElement(TAG) as RgbaColorPicker;
}
