/**
 * Shared, framework-agnostic configuration for the annotation style panel UI.
 * Consumed by both the vanilla `AnnotationPanel` (core) and the React controllers.
 */

export interface BackgroundOption {
  value: string;
  /** Inline style for the swatch's color circle. */
  style: string;
}

export const BACKGROUNDS: BackgroundOption[] = [
  { value: "#f5f5f5", style: "--circle-color: #f5f5f5;" },
  { value: "#EDE6FF", style: "--circle-color: #EDE6FF;" },
  {
    value: "transparent",
    style: "--circle-color: white; border: 2px dashed #ccc;"
  }
];

export interface FontOption {
  value: string;
  label: string;
  /** Icon name from the shared icon set (see `ui/icons`). */
  icon: string;
}

export const FONTS: FontOption[] = [
  { value: "sans-serif", label: "Sans Serif", icon: "type" },
  { value: "serif", label: "Serif", icon: "italic" },
  { value: "monospace", label: "Monospace", icon: "code" }
];

export interface ExtremityOption {
  value: string;
  label: string;
  icon: string;
}

export const EXTREMITY_OPTIONS: ExtremityOption[] = [
  { value: "none", label: "None", icon: "x" },
  { value: "arrow", label: "Open Arrow", icon: "arrow-left" },
  { value: "arrow-plain", label: "Filled Arrow", icon: "play" },
  { value: "halo-dot", label: "Halo Dot", icon: "circle-dot" },
  { value: "dot", label: "Dot", icon: "dot" }
];

export interface LineTypeOption {
  value: string;
  icon: IconName;
}

export const LINE_TYPES: LineTypeOption[] = [
  { value: "plain", icon: "circle" },
  { value: "dashed", icon: "circle-dashed" }
];

/** Default palette used to seed the recent-colors strip. */
export const DEFAULT_RECENT_COLORS = ["#0099FF", "#FF7523", "#44AA99"];
