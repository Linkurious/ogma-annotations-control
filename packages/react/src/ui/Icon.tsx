import { ICON_PATHS, type IconName } from "@linkurious/ogma-annotations/ui";
import React from "react";

export interface IconProps {
  name: IconName;
  size?: number;
  rotate?: boolean;
  className?: string;
}

/**
 * Renders an inline SVG icon from the shared icon set. Keeps the React UI free
 * of any icon font / `lucide-react` runtime dependency for consumers.
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 18,
  rotate = false,
  className
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={rotate ? { transform: "rotate(180deg)" } : undefined}
    dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] }}
  />
);
