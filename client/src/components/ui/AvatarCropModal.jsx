import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MagnifyingGlassPlus, MagnifyingGlassMinus, Check, X, ArrowsOutCardinal } from "@phosphor-icons/react";

export function AvatarCropModal({ isOpen, imageSrc, onClose, onApply }) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleApply = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    const img = imgRef.current;
    if (!img) return;

    ctx.clearRect(0, 0, 256, 256);

    const aspect = img.naturalWidth / img.naturalHeight;
    let baseWidth = 256;
    let baseHeight = 256;

    if (aspect > 1) {
      baseWidth = 256 * aspect;
    } else {
      baseHeight = 256 / aspect;
    }

    const drawWidth = baseWidth * zoom;
    const drawHeight = baseHeight * zoom;

    const centerX = 128 + offset.x;
    const centerY = 128 + offset.y;

    ctx.drawImage(
      img,
      centerX - drawWidth / 2,
      centerY - drawHeight / 2,
      drawWidth,
      drawHeight
    );

    const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.92);
    onApply(croppedDataUrl);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onMouseUp={handleMouseUp}
    >
      <div className="relative w-full max-w-sm rounded-[var(--radius-md)] bg-surface-card border border-border p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Adjust Profile Photo</h3>
            <p className="text-[11px] text-text-muted mt-0.5">Drag to reposition and zoom to fit the circular avatar.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div
          className="relative w-56 h-56 mx-auto rounded-full border-2 border-accent shadow-inner overflow-hidden cursor-move bg-black select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Crop target"
            draggable={false}
            className="absolute max-w-none pointer-events-none transition-transform duration-75"
            style={{
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`,
              left: "50%",
              top: "50%",
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none flex items-center justify-center">
            <span className="text-[10px] font-mono text-white/50 bg-black/40 px-2 py-0.5 rounded-full flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
              <ArrowsOutCardinal size={10} /> Drag to pan
            </span>
          </div>
        </div>

        <div className="space-y-1.5 px-2">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <MagnifyingGlassMinus size={13} /> Zoom
            </span>
            <span className="font-mono text-[11px]">{Math.round(zoom * 100)}%</span>
            <span className="flex items-center gap-1">
              <MagnifyingGlassPlus size={13} />
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-surface rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-surface border border-border text-xs font-semibold text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-[var(--radius-sm)] bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm transition-colors btn-tactile cursor-pointer"
          >
            <Check size={14} weight="bold" />
            <span>Apply Crop</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default AvatarCropModal;
