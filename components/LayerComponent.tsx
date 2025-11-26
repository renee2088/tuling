
import React, { useRef, useState, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { Layer, LayerType } from '../types';
import { X, RotateCw } from 'lucide-react';
import clsx from 'clsx';

interface LayerComponentProps {
  layer: Layer;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Layer>) => void;
  onDelete: (id: string) => void;
  scale: number;
}

export const LayerComponent: React.FC<LayerComponentProps> = ({
  layer,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  scale,
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  
  // Store initial values for scaling calculations
  const resizeStartData = useRef<{ width: number; height: number; fontSize: number } | null>(null);
  const rotateOffset = useRef<number>(0);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // Rotation Logic
  const handleRotateStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    
    if (!nodeRef.current) return;
    const rect = nodeRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    
    // Current mouse angle relative to center
    const startAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    
    // Calculate offset so rotation doesn't jump
    // New Rotation = MouseAngle - Offset
    // So: Offset = MouseAngle - CurrentRotation
    rotateOffset.current = startAngle - layer.rotation;

    setIsRotating(true);
  };

  useEffect(() => {
    if (!isRotating) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!nodeRef.current) return;
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const rect = nodeRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = clientX - centerX;
      const deltaY = clientY - centerY;
      
      // Calculate degrees
      const deg = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
      
      // Apply offset
      let rotation = deg - rotateOffset.current;
      
      // Snap to common angles
      // Normalize rotation to -180 to 180 for easier snapping logic if needed, 
      // but simple mod checks work too.
      
      // Helper to normalize angle to 0-360 for snapping checks
      const normalizedRot = (rotation % 360 + 360) % 360;
      
      if (normalizedRot < 5 || normalizedRot > 355) rotation = Math.round(rotation / 360) * 360;
      else if (Math.abs(normalizedRot - 90) < 5) rotation = Math.round(rotation / 360) * 360 + 90;
      else if (Math.abs(normalizedRot - 180) < 5) rotation = Math.round(rotation / 360) * 360 + 180;
      else if (Math.abs(normalizedRot - 270) < 5) rotation = Math.round(rotation / 360) * 360 + 270;
      
      onUpdate(layer.id, { rotation });
    };

    const handleUp = () => setIsRotating(false);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleUp);
    
    return () => {
       window.removeEventListener('mousemove', handleMove);
       window.removeEventListener('mouseup', handleUp);
       window.removeEventListener('touchmove', handleMove);
       window.removeEventListener('touchend', handleUp);
    };
  }, [isRotating, layer.id, onUpdate]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    onSelect(layer.id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (layer.type === LayerType.TEXT) {
      e.stopPropagation();
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  return (
    <Rnd
      size={{ width: layer.width, height: layer.height }}
      position={{ x: layer.x, y: layer.y }}
      onDragStop={(e, d) => {
        onUpdate(layer.id, { x: d.x, y: d.y });
      }}
      onResizeStart={() => {
        if (layer.type === LayerType.TEXT && layer.style) {
          resizeStartData.current = {
            width: layer.width,
            height: layer.height,
            fontSize: layer.style.fontSize
          };
        }
      }}
      onResize={(e, direction, ref, delta, position) => {
        const newWidth = parseInt(ref.style.width);
        const newHeight = parseInt(ref.style.height);
        
        const updates: Partial<Layer> = {
          width: newWidth,
          height: newHeight,
          ...position,
        };

        const isCorner = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].includes(direction);
        
        if (
          layer.type === LayerType.TEXT && 
          layer.style && 
          resizeStartData.current && 
          isCorner
        ) {
          const scaleRatio = newHeight / resizeStartData.current.height;
          updates.style = {
            ...layer.style,
            fontSize: Math.max(12, resizeStartData.current.fontSize * scaleRatio)
          };
        }

        onUpdate(layer.id, updates);
      }}
      bounds="parent"
      scale={scale}
      lockAspectRatio={layer.type === LayerType.STICKER}
      minWidth={30}
      minHeight={30}
      disableDragging={isEditing || isRotating}
      enableResizing={isSelected && !isEditing && !isRotating ? { 
        top: true, right: true, bottom: true, left: true,
        topRight: true, bottomRight: true, bottomLeft: true, topLeft: true
      } : false}
      resizeHandleStyles={{
        top: { cursor: 'ns-resize' },
        bottom: { cursor: 'ns-resize' },
        left: { cursor: 'ew-resize' },
        right: { cursor: 'ew-resize' },
        topLeft: { cursor: 'nwse-resize' },
        topRight: { cursor: 'nesw-resize' },
        bottomLeft: { cursor: 'nesw-resize' },
        bottomRight: { cursor: 'nwse-resize' },
      }}
      className={clsx(
        "absolute group",
        isSelected ? "z-50" : "z-10 hover:outline hover:outline-1 hover:outline-blue-300 hover:outline-dashed",
        isEditing ? "cursor-text" : "touch-none"
      )}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      {/* Wrapper Div that applies Rotation to Content + Selection UI */}
      <div className="w-full h-full relative" style={{ transform: `rotate(${layer.rotation}deg)` }}>
        
        {/* Visual Selection Border & Handles */}
        {isSelected && !isEditing && (
          <div className="absolute inset-0 border-2 border-primary pointer-events-none">
             {/* Corner Handles */}
             <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-primary rounded-full z-20 shadow-sm" />
             <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-primary rounded-full z-20 shadow-sm" />
             <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-primary rounded-full z-20 shadow-sm" />
             <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-primary rounded-full z-20 shadow-sm" />
             
             {/* Side Handles (Text Only) */}
             {layer.type === LayerType.TEXT && (
               <>
                 <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-primary rounded-full z-20 shadow-sm" />
                 <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-primary rounded-full z-20 shadow-sm" />
                 <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-white border border-primary rounded-full z-20 shadow-sm" />
                 <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-white border border-primary rounded-full z-20 shadow-sm" />
               </>
             )}

             {/* Rotation Handle - Moved to Bottom Right */}
             <div 
               className="absolute -bottom-6 -right-6 w-6 h-6 bg-white border border-primary rounded-full z-20 shadow-sm flex items-center justify-center cursor-alias pointer-events-auto hover:bg-gray-50 active:bg-blue-50"
               onMouseDown={handleRotateStart}
               onTouchStart={handleRotateStart}
             >
                <RotateCw size={14} className="text-primary" />
             </div>

             {/* Delete Button */}
             <button
               className="absolute -top-8 -right-8 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-colors pointer-events-auto flex items-center justify-center"
               onMouseDown={(e) => e.stopPropagation()}
               onClick={(e) => {
                 e.stopPropagation();
                 onDelete(layer.id);
               }}
             >
               <X size={14} />
             </button>
          </div>
        )}

        <div
          ref={nodeRef}
          className="w-full h-full relative flex cursor-move select-none"
          onDoubleClick={handleDoubleClick}
        >
          {/* Text Content Render */}
          {layer.type === LayerType.TEXT && layer.style && (
            isEditing ? (
              <textarea
                ref={textareaRef}
                value={layer.content}
                onChange={(e) => onUpdate(layer.id, { content: e.target.value })}
                onBlur={handleBlur}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full h-full resize-none outline-none border-none overflow-hidden bg-transparent p-0 m-0"
                style={{
                  fontFamily: layer.style.fontFamily,
                  fontSize: `${layer.style.fontSize}px`,
                  color: layer.style.color,
                  backgroundColor: layer.style.backgroundColor,
                  fontWeight: layer.style.fontWeight,
                  textAlign: layer.style.textAlign,
                  padding: `${layer.style.padding}px`,
                  borderRadius: `${layer.style.borderRadius}px`,
                  lineHeight: layer.style.lineHeight,
                }}
              />
            ) : (
              <div
                style={{
                  fontFamily: layer.style.fontFamily,
                  fontSize: `${layer.style.fontSize}px`,
                  color: layer.style.color,
                  backgroundColor: layer.style.backgroundColor,
                  fontWeight: layer.style.fontWeight,
                  textAlign: layer.style.textAlign,
                  padding: `${layer.style.padding}px`,
                  borderRadius: `${layer.style.borderRadius}px`,
                  lineHeight: layer.style.lineHeight,
                  width: '100%',
                  height: '100%',
                  display: 'block', 
                  overflow: 'hidden', 
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {layer.content}
              </div>
            )
          )}

          {/* Sticker Content Render */}
          {layer.type === LayerType.STICKER && (
            <div 
              className="w-full h-full flex items-center justify-center" 
              style={{ fontSize: `${Math.min(layer.width, layer.height) * 0.8}px` }} 
            >
               <span style={{ lineHeight: 1 }}>
                  {layer.content}
               </span>
            </div>
          )}
        </div>
      </div>
    </Rnd>
  );
};
