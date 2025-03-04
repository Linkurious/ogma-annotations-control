import React, { ReactNode } from "react";
import "./ButtonGroup.css";

interface ButtonGroupProps {
  children: ReactNode;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({ children }) => {
  return <div className="button-group">{children}</div>;
};
