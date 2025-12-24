import React from "react";
import "./SvgExportPopup.css";

interface SvgExportPopupProps {
  isOpen: boolean;
  svgContent: string;
  onClose: () => void;
  onDownload: () => void;
}

export const SvgExportPopup: React.FC<SvgExportPopupProps> = ({
  isOpen,
  svgContent,
  onClose,
  onDownload
}) => {
  const [imageUrl, setImageUrl] = React.useState<string>("");

  React.useEffect(() => {
    if (svgContent) {
      const blob = new Blob([svgContent], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      setImageUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [svgContent]);

  const handleBackdropClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="popup-backdrop" onClick={handleBackdropClick}>
      <div className="popup-content">
        <div className="popup-header">
          <h2>SVG Export Preview</h2>
          <button className="popup-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="popup-body">
          <div className="svg-preview">
            {imageUrl && <img src={imageUrl} alt="Graph Export" />}
          </div>
        </div>
        <div className="popup-footer">
          <button className="popup-button" onClick={onDownload}>
            Download SVG
          </button>
        </div>
      </div>
    </div>
  );
};
