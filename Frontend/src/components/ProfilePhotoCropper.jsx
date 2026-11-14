import { useEffect, useRef, useState, useCallback } from 'react';
import './ProfilePhotoCropper.css';

const CROP_SIZE = 280; // diameter of the circular crop area
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

const ProfilePhotoCropper = ({ file, onCrop, onCancel }) => {
    const canvasRef = useRef(null);
    const imageRef = useRef(null);

    const [imageLoaded, setImageLoaded] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isCropping, setIsCropping] = useState(false);

    // Load image from file
    useEffect(() => {
        if (!file) return;
        const img = new Image();
        img.onload = () => {
            imageRef.current = img;
            // Center the image initially
            const scale = Math.max(CROP_SIZE / img.width, CROP_SIZE / img.height);
            setZoom(scale);
            setOffset({ x: 0, y: 0 });
            setImageLoaded(true);
        };
        img.src = URL.createObjectURL(file);
        return () => URL.revokeObjectURL(img.src);
    }, [file]);

    // Draw canvas
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const img = imageRef.current;
        if (!canvas || !ctx || !img) return;

        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        ctx.clearRect(0, 0, w, h);

        // Draw the full image (panned & zoomed)
        const imgW = img.width * zoom;
        const imgH = img.height * zoom;
        const imgX = cx - imgW / 2 + offset.x;
        const imgY = cy - imgH / 2 + offset.y;
        ctx.drawImage(img, imgX, imgY, imgW, imgH);

        // Draw dark overlay with circular cutout
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(cx, cy, CROP_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Draw circle border
        ctx.beginPath();
        ctx.arc(cx, cy, CROP_SIZE / 2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw grid lines inside circle (WhatsApp-style)
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, CROP_SIZE / 2, 0, Math.PI * 2);
        ctx.clip();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        // Horizontal lines
        const third = CROP_SIZE / 3;
        const startX = cx - CROP_SIZE / 2;
        const startY = cy - CROP_SIZE / 2;
        ctx.beginPath();
        ctx.moveTo(startX, startY + third);
        ctx.lineTo(startX + CROP_SIZE, startY + third);
        ctx.moveTo(startX, startY + third * 2);
        ctx.lineTo(startX + CROP_SIZE, startY + third * 2);
        // Vertical lines
        ctx.moveTo(startX + third, startY);
        ctx.lineTo(startX + third, startY + CROP_SIZE);
        ctx.moveTo(startX + third * 2, startY);
        ctx.lineTo(startX + third * 2, startY + CROP_SIZE);
        ctx.stroke();
        ctx.restore();
    }, [zoom, offset]);

    useEffect(() => {
        if (imageLoaded) {
            requestAnimationFrame(draw);
        }
    }, [imageLoaded, draw]);

    // Mouse/touch handlers
    const getEventPos = (e) => {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    };

    const handlePointerDown = (e) => {
        e.preventDefault();
        const pos = getEventPos(e);
        setDragging(true);
        setDragStart({ x: pos.x - offset.x, y: pos.y - offset.y });
    };

    const handlePointerMove = (e) => {
        if (!dragging) return;
        e.preventDefault();
        const pos = getEventPos(e);
        setOffset({
            x: pos.x - dragStart.x,
            y: pos.y - dragStart.y,
        });
    };

    const handlePointerUp = () => {
        setDragging(false);
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setZoom((prev) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta)));
    };

    // Touch pinch-to-zoom
    const lastTouchDist = useRef(null);
    const handleTouchMove = (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (lastTouchDist.current !== null) {
                const delta = (dist - lastTouchDist.current) * 0.005;
                setZoom((prev) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta)));
            }
            lastTouchDist.current = dist;
        } else if (dragging) {
            handlePointerMove(e);
        }
    };

    const handleTouchEnd = () => {
        lastTouchDist.current = null;
        setDragging(false);
    };

    // Zoom slider
    const handleZoomSlider = (e) => {
        setZoom(parseFloat(e.target.value));
    };

    // Crop and return blob
    const handleCrop = async () => {
        const img = imageRef.current;
        if (!img) return;

        setIsCropping(true);

        const canvas = canvasRef.current;
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        // Create output canvas
        const outputSize = 512; // high-res output
        const outCanvas = document.createElement('canvas');
        outCanvas.width = outputSize;
        outCanvas.height = outputSize;
        const outCtx = outCanvas.getContext('2d');

        // Calculate source coordinates
        const imgW = img.width * zoom;
        const imgH = img.height * zoom;
        const imgX = cx - imgW / 2 + offset.x;
        const imgY = cy - imgH / 2 + offset.y;

        // Crop region in canvas coordinates
        const cropX = cx - CROP_SIZE / 2;
        const cropY = cy - CROP_SIZE / 2;

        // Map back to image coordinates
        const srcX = (cropX - imgX) / zoom;
        const srcY = (cropY - imgY) / zoom;
        const srcW = CROP_SIZE / zoom;
        const srcH = CROP_SIZE / zoom;

        // Draw circular clip
        outCtx.beginPath();
        outCtx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
        outCtx.clip();
        outCtx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outputSize, outputSize);

        // Convert to blob
        outCanvas.toBlob(
            (blob) => {
                setIsCropping(false);
                if (blob) {
                    onCrop(blob);
                }
            },
            'image/jpeg',
            0.92
        );
    };

    const canvasWidth = Math.min(window.innerWidth - 40, 420);
    const canvasHeight = Math.min(window.innerHeight - 280, 420);

    return (
        <div className="cropper-overlay" onClick={onCancel}>
            <div className="cropper-modal" onClick={(e) => e.stopPropagation()}>
                <div className="cropper-header">
                    <h3>Adjust Photo</h3>
                    <p>Drag to reposition • Scroll to zoom</p>
                </div>

                <div className="cropper-canvas-wrapper">
                    <canvas
                        ref={canvasRef}
                        width={canvasWidth}
                        height={canvasHeight}
                        className="cropper-canvas"
                        onMouseDown={handlePointerDown}
                        onMouseMove={handlePointerMove}
                        onMouseUp={handlePointerUp}
                        onMouseLeave={handlePointerUp}
                        onWheel={handleWheel}
                        onTouchStart={handlePointerDown}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    />
                    {!imageLoaded && (
                        <div className="cropper-loading">
                            <div className="cropper-spinner" />
                            <span>Loading image...</span>
                        </div>
                    )}
                </div>

                <div className="cropper-zoom-control">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="8" y1="11" x2="14" y2="11" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="range"
                        min={MIN_ZOOM}
                        max={MAX_ZOOM}
                        step={0.01}
                        value={zoom}
                        onChange={handleZoomSlider}
                        className="cropper-slider"
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="8" y1="11" x2="14" y2="11" />
                        <line x1="11" y1="8" x2="11" y2="14" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                </div>

                <div className="cropper-actions">
                    <button className="cropper-btn cropper-btn-cancel" onClick={onCancel} disabled={isCropping}>
                        Cancel
                    </button>
                    <button className="cropper-btn cropper-btn-confirm" onClick={handleCrop} disabled={!imageLoaded || isCropping}>
                        {isCropping ? (
                            <>
                                <span className="cropper-btn-spinner" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Use This Photo
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfilePhotoCropper;
