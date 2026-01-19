import React from "react";
import "./JsonExportPopup.css";

interface JsonExportPopupProps {
  isOpen: boolean;
  jsonContent: string;
  onClose: () => void;
  onDownload: () => void;
}

export const JsonExportPopup: React.FC<JsonExportPopupProps> = ({
  isOpen,
  jsonContent,
  onClose,
  onDownload
}) => {
  const handleBackdropClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  const handleWheel = React.useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
  }, []);

  if (!isOpen) return null;

  return (
    <div className="popup-backdrop" onClick={handleBackdropClick}>
      <div className="popup-content" onWheel={handleWheel}>
        <div className="popup-header">
          <h2>JSON Export Preview</h2>
          <button className="popup-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="popup-body">
          <div className="json-preview">
            <pre>
              <code>{jsonContent}</code>
            </pre>
          </div>
        </div>
        <div className="popup-footer">
          <button className="popup-button" onClick={onDownload}>
            Download JSON
          </button>
        </div>
      </div>
    </div>
  );
};
