
import React, { useRef, useState, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { Layer, LayerType } from '../types';
import { X } from 'lucide-react';
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
  
  // Store initial values for scaling calculations
  const resizeStartData = useRef<{ width: number; height: number; fontSize: number } | null>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

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

        // Scale Font Size if it's a Corner Resize on Text
        const isCorner = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].includes(direction);
        
        if (
          layer.type === LayerType.TEXT && 
          layer.style && 
          resizeStartData.current && 
          isCorner
        ) {
          // Calculate scale based on height change
          const scaleRatio = newHeight / resizeStartData.current.height;
          updates.style = {
            ...layer.style,
            fontSize: Math.max(12, resizeStartData.current.fontSize * scaleRatio) // Prevent becoming too small
          };
        }

        onUpdate(layer.id, updates);
      }}
      bounds="parent"
      scale={scale}
      lockAspectRatio={layer.type === LayerType.STICKER} // Allow free resize for text unless specific logic added
      minWidth={30}
      minHeight={30}
      disableDragging={isEditing}
      // Enable resizing only when selected and NOT editing
      enableResizing={isSelected && !isEditing ? { 
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
      {/* Visual Selection Border & Handles - Hidden when editing */}
      {isSelected && !isEditing && (
        <div className="absolute inset-0 border-2 border-primary pointer-events-none">
           {/* Corner Handles */}
           <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-primary rounded-full z-20 shadow-sm" />
           <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-primary rounded-full z-20 shadow-sm" />
           <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-primary rounded-full z-20 shadow-sm" />
           <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-primary rounded-full z-20 shadow-sm" />
           
           {/* Side Handles */}
           {layer.type === LayerType.TEXT && (
             <>
               <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-primary rounded-full z-20 shadow-sm" />
               <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border border-primary rounded-full z-20 shadow-sm" />
               <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-white border border-primary rounded-full z-20 shadow-sm" />
               <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-white border border-primary rounded-full z-20 shadow-sm" />
             </>
           )}

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
        style={{
          transform: `rotate(${layer.rotation}deg)`,
        }}
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
              onMouseDown={(e) => e.stopPropagation()} // Allow text selection without dragging
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
    </Rnd>
  );
};
