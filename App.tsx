import React, { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { 
  Upload, Type as TypeIcon, Smile, Layout, Download, 
  Trash2, Image as ImageIcon, Palette,
  RotateCcw, ZoomIn, ZoomOut, AlignLeft, AlignCenter, AlignRight, Bold, X as XIcon
} from 'lucide-react';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';

import { Layer, LayerType, AspectRatio, FontStyle, BackgroundConfig } from './types';
import { ASPECT_RATIOS, FILTERS, FONTS, STICKERS } from './constants';
import { LayerComponent } from './components/LayerComponent';

const INITIAL_TEXT_STYLE: FontStyle = {
  fontFamily: '"Noto Sans SC", sans-serif',
  fontSize: 42,
  color: '#ffffff',
  backgroundColor: 'rgba(0,0,0,0)',
  fontWeight: 'bold',
  textAlign: 'center',
  padding: 10,
  borderRadius: 0,
  lineHeight: 1.2,
};

const INITIAL_BG_CONFIG: BackgroundConfig = {
  scale: 1,
  x: 0,
  y: 0,
  filter: 'none',
};

const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700;900&family=Ma+Shan+Zheng&family=Zcool+KuaiLe&family=Long+Cang&display=swap';

export default function App() {
  // --- State ---
  const [image, setImage] = useState<string | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(ASPECT_RATIOS[0]);
  const [originalSize, setOriginalSize] = useState<{ width: number; height: number } | null>(null);
  
  // Tabs for Left Panel
  const [leftTab, setLeftTab] = useState<'layout' | 'filter' | 'text' | 'sticker'>('layout');
  
  // Background Config
  const [bgConfig, setBgConfig] = useState<BackgroundConfig>(INITIAL_BG_CONFIG);

  // UI State
  const [isExporting, setIsExporting] = useState(false);
  const [canvasScale, setCanvasScale] = useState(0.6); // Viewport zoom

  // Refs
  const workspaceRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Cache for Font CSS to speed up export
  const fontCssRef = useRef<string>('');

  // --- Effects ---
  
  // Pre-fetch Font CSS on mount to make export instant
  useEffect(() => {
    fetch(GOOGLE_FONTS_URL)
      .then(res => {
        if (res.ok) return res.text();
        throw new Error('Network response was not ok.');
      })
      .then(css => {
        fontCssRef.current = css;
      })
      .catch(e => console.warn('Background font fetch failed (will retry on export if needed):', e));
  }, []);

  // --- Computed ---
  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  // --- Handlers ---

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        
        // Load image to get natural dimensions
        const img = new Image();
        img.onload = () => {
          const width = img.naturalWidth;
          const height = img.naturalHeight;
          
          setOriginalSize({ width, height });
          // If it's the first upload OR if currently using original aspect ratio, update it
          if (!image || aspectRatio.name === 'original') {
             setAspectRatio({
              name: 'original',
              width: width,
              height: height,
              label: '原图',
              icon: 'image'
            });
          }
          
          setImage(result);
          // If replacing image, we might want to keep layers, but reset bg config
          setBgConfig(INITIAL_BG_CONFIG);
        };
        img.src = result;
      };
      reader.readAsDataURL(e.target.files[0]);
    }
    // Reset input value to allow re-uploading same file
    if (e.target) e.target.value = '';
  };

  const addTextLayer = () => {
    if (!image) {
        alert("请先上传图片");
        return;
    }

    const content = "双击编辑文本";
    
    const newLayer: Layer = {
      id: uuidv4(),
      type: LayerType.TEXT,
      x: aspectRatio.width / 2 - 200,
      y: aspectRatio.height / 2 - 75,
      width: 400, 
      height: 150, 
      rotation: 0,
      content: content,
      style: { ...INITIAL_TEXT_STYLE },
    };
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const addStickerLayer = (sticker: string) => {
    if (!image) {
        alert("请先上传图片");
        return;
    }

    const newLayer: Layer = {
      id: uuidv4(),
      type: LayerType.STICKER,
      x: aspectRatio.width / 2 - 50,
      y: aspectRatio.height / 2 - 50,
      width: 150,
      height: 150,
      rotation: 0,
      content: sticker,
    };
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const updateLayer = (id: string, updates: Partial<Layer>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };
  
  const updateLayerStyle = (id: string, styleUpdates: Partial<FontStyle>) => {
    setLayers(prev => prev.map(l => 
      l.id === id && l.type === LayerType.TEXT 
        ? { ...l, style: { ...l.style!, ...styleUpdates } } 
        : l
    ));
  };

  const deleteLayer = (id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  const handleExport = async () => {
    if (!workspaceRef.current || !image) return;
    setIsExporting(true);
    const originalSelection = selectedLayerId;
    setSelectedLayerId(null); // Deselect for clean capture

    try {
      // Tiny delay to ensure React renders the deselected state (flushing sync updates)
      await new Promise(resolve => setTimeout(resolve, 10));

      const commonConfig = {
        skipAutoScale: true, // Optimization since we set dimensions manually
        pixelRatio: 1, // 1:1 pixel ratio
        width: aspectRatio.width,
        height: aspectRatio.height,
        canvasWidth: aspectRatio.width, // Force exact output width
        canvasHeight: aspectRatio.height, // Force exact output height
        fontEmbedCSS: fontCssRef.current, // Use pre-fetched CSS
        style: {
          transform: 'none', // Critical: Ignore the viewport zoom
          transformOrigin: 'top left'
        },
        // Only fetch if necessary
        fetchRequestInit: {
            mode: 'cors' as RequestMode,
            credentials: 'omit' as RequestCredentials,
        }
      };

      let dataUrl;
      try {
          // Attempt 1: Fast (No Cache Busting)
          dataUrl = await toPng(workspaceRef.current!, { 
              ...commonConfig,
              cacheBust: false, 
          });
      } catch (error) {
          console.warn("Fast export failed, retrying with cacheBust...", error);
          // Attempt 2: Retry with Cache Busting (Slower fallback)
          dataUrl = await toPng(workspaceRef.current!, { 
              ...commonConfig,
              cacheBust: true, 
          });
      }
      
      if (dataUrl) {
          const link = document.createElement('a');
          link.download = `tuling-design-${Date.now()}.png`;
          link.href = dataUrl;
          link.click();
      } else {
          throw new Error("Failed to generate image data");
      }
    } catch (err) {
      console.error('Export failed', err);
      alert("导出失败，请重试 (Export Failed)");
    } finally {
      setIsExporting(false);
      setSelectedLayerId(originalSelection);
    }
  };

  // Keyboard shortcut for delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedLayerId) {
        // Do not delete if user is typing in an input
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        deleteLayer(selectedLayerId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLayerId]);

  // Fit to screen on image load or resize
  useEffect(() => {
    if (containerRef.current && aspectRatio) {
      const { width: contW, height: contH } = containerRef.current.getBoundingClientRect();
      const pad = 60;
      const scaleW = (contW - pad) / aspectRatio.width;
      const scaleH = (contH - pad) / aspectRatio.height;
      setCanvasScale(Math.min(scaleW, scaleH, 0.8));
    }
  }, [aspectRatio, image]);

  // --- Render Functions ---

  return (
    <div className="flex flex-col h-screen bg-[#111827] text-white overflow-hidden font-sans">
      
      {/* Persistent File Input for Upload/Replace */}
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/*" 
        onChange={handleImageUpload} 
        className="hidden" 
      />

      {/* Header */}
      <Header 
        onReset={() => { setImage(null); setLayers([]); setOriginalSize(null); }} 
        hasImage={!!image}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Toolbar (Sidebar) */}
        <div className="w-16 md:w-20 bg-[#1f2937] border-r border-gray-700 flex flex-col items-center py-4 z-20 shadow-lg justify-between h-full">
           
           {/* Top Tools */}
           <div className="flex flex-col items-center gap-4 w-full">
              <ToolButton active={leftTab === 'layout'} onClick={() => { setLeftTab('layout'); setSelectedLayerId(null); }} icon={<Layout size={20} />} label="布局" />
              <ToolButton active={leftTab === 'filter'} onClick={() => { setLeftTab('filter'); setSelectedLayerId(null); }} icon={<Palette size={20} />} label="滤镜" />
              <ToolButton active={leftTab === 'text'} onClick={() => { setLeftTab('text'); }} icon={<TypeIcon size={20} />} label="文字" />
              <ToolButton active={leftTab === 'sticker'} onClick={() => { setLeftTab('sticker'); }} icon={<Smile size={20} />} label="贴纸" />
           </div>

           {/* Bottom Actions */}
           <div className="flex flex-col items-center gap-4 w-full mb-2">
              <ActionButton 
                onClick={() => fileInputRef.current?.click()} 
                icon={<ImageIcon size={20} />} 
                label="换图" 
                colorClass="bg-blue-100 text-blue-600 hover:bg-blue-200"
              />
              <ActionButton 
                onClick={handleExport} 
                icon={isExporting ? <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div> : <Download size={20} />} 
                label="导出" 
                disabled={!image || isExporting}
                colorClass="bg-green-100 text-green-600 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
              />
           </div>
        </div>

        {/* Left Panel Content (Drawer) */}
        <div className="w-64 bg-[#1f2937] border-r border-gray-700 flex flex-col z-10 overflow-y-auto custom-scrollbar">
           {leftTab === 'layout' && (
             <div className="p-4 space-y-6">
               <h3 className="font-bold text-gray-300 flex items-center gap-2"><Layout size={16}/> 画布尺寸</h3>
               <div className="grid grid-cols-2 gap-3">
                 {/* Original Size Option - Only if image loaded */}
                 {originalSize && (
                   <button
                     onClick={() => setAspectRatio({
                        name: 'original',
                        width: originalSize.width,
                        height: originalSize.height,
                        label: '原图',
                        icon: 'image'
                     })}
                     className={clsx(
                       "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                       aspectRatio.name === 'original'
                         ? "border-primary bg-primary/20 text-primary" 
                         : "border-gray-600 bg-gray-700/50 hover:border-gray-500"
                     )}
                   >
                     <div className={clsx("border-2 rounded-sm transition-colors flex items-center justify-center bg-gray-600", aspectRatio.name === 'original' ? "border-primary" : "border-gray-400")} 
                          style={{ width: 20, height: 20 }}>
                          <span className="text-[10px]">1:1</span>
                     </div>
                     <span className="text-xs">原图尺寸</span>
                   </button>
                 )}

                 {ASPECT_RATIOS.map(ratio => (
                   <button
                     key={ratio.name}
                     onClick={() => setAspectRatio(ratio)}
                     className={clsx(
                       "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                       aspectRatio.name === ratio.name 
                         ? "border-primary bg-primary/20 text-primary" 
                         : "border-gray-600 bg-gray-700/50 hover:border-gray-500"
                     )}
                   >
                     <div className={clsx("border-2 rounded-sm transition-colors", aspectRatio.name === ratio.name ? "border-primary" : "border-gray-400")} 
                          style={{ width: 20, height: (20 * ratio.height) / ratio.width }}></div>
                     <span className="text-xs">{ratio.label}</span>
                   </button>
                 ))}
               </div>
               
               {image && (
                 <div className="pt-4 border-t border-gray-700 animate-in fade-in slide-in-from-left-4 duration-500">
                    <h3 className="font-bold text-gray-300 mb-2">背景调整</h3>
                    <p className="text-xs text-gray-500 mb-4">选中背景图后在右侧调整</p>
                    <button 
                      onClick={() => setSelectedLayerId(null)}
                      className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
                    >
                      选中背景图
                    </button>
                 </div>
               )}
             </div>
           )}

           {leftTab === 'filter' && (
             <div className="p-4 space-y-4">
               <h3 className="font-bold text-gray-300 flex items-center gap-2"><Palette size={16}/> 滤镜风格</h3>
               <div className="grid grid-cols-2 gap-3">
                 {FILTERS.map(filter => (
                   <button
                     key={filter.name}
                     onClick={() => setBgConfig(p => ({ ...p, filter: filter.value }))}
                     disabled={!image}
                     className={clsx(
                       "h-20 rounded-lg relative overflow-hidden border-2 group transition-all",
                       bgConfig.filter === filter.value ? "border-primary" : "border-transparent",
                       !image ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                     )}
                   >
                     <div className="absolute inset-0" style={{ backgroundColor: filter.previewColor }}></div>
                     <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20">
                       <span className="text-sm font-medium">{filter.name}</span>
                     </div>
                   </button>
                 ))}
               </div>
               {!image && <p className="text-xs text-center text-gray-500 mt-2">请先上传图片以应用滤镜</p>}
             </div>
           )}

           {leftTab === 'text' && (
             <div className="p-4 space-y-4">
               <h3 className="font-bold text-gray-300 flex items-center gap-2"><TypeIcon size={16}/> 添加文字</h3>
               <button 
                 onClick={addTextLayer}
                 className="w-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] hover:from-[#4f46e5] hover:to-[#9333ea] text-white p-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg transform hover:-translate-y-0.5"
               >
                 <TypeIcon size={18} /> 普通文本
               </button>
               
               <div className="text-xs text-gray-500 mt-4 leading-relaxed">
                 {!image ? "请先上传图片，然后点击按钮添加文本。" : "点击上方按钮添加文本图层。选中图层后，在右侧面板编辑内容和样式。"}
               </div>
             </div>
           )}

           {leftTab === 'sticker' && (
             <div className="p-4">
               <h3 className="font-bold text-gray-300 mb-4 flex items-center gap-2"><Smile size={16}/> 创意贴纸</h3>
               <div className="grid grid-cols-4 gap-2">
                 {STICKERS.map(s => (
                   <button
                     key={s}
                     onClick={() => addStickerLayer(s)}
                     className="aspect-square bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-2xl transition-transform hover:scale-110"
                   >
                     {s}
                   </button>
                 ))}
               </div>
               {!image && <p className="text-xs text-center text-gray-500 mt-4">请先上传图片</p>}
             </div>
           )}
        </div>

        {/* Center Canvas */}
        <div 
           ref={containerRef}
           className="flex-1 bg-[#0f172a] relative overflow-hidden flex items-center justify-center select-none bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] "
           onMouseDown={() => setSelectedLayerId(null)}
        >
           {!image ? (
               // Empty State / Upload
               <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="group flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-600 rounded-3xl bg-[#1e293b]/50 hover:bg-[#1e293b] hover:border-primary transition-all duration-300 cursor-pointer animate-in fade-in zoom-in duration-500"
               >
                  <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/20 transition-all shadow-lg">
                      <Upload size={36} className="text-gray-400 group-hover:text-primary transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">点击上传图片</h3>
                  <p className="text-sm text-gray-400">支持 JPG, PNG, WebP</p>
               </div>
           ) : (
               // Active Workspace
               <>
                 <div 
                   ref={workspaceRef}
                   className="relative bg-white shadow-2xl overflow-hidden transition-all duration-200 ease-linear origin-center"
                   style={{
                     width: aspectRatio.width,
                     height: aspectRatio.height,
                     transform: `scale(${canvasScale})`,
                   }}
                 >
                    {/* Background Image Layer */}
                    <div 
                      className="absolute inset-0 w-full h-full overflow-hidden"
                      style={{ filter: bgConfig.filter }}
                    >
                       <img 
                         src={image} 
                         alt="background" 
                         className="absolute origin-center object-cover w-full h-full pointer-events-none" 
                         style={{
                           transform: `translate(${bgConfig.x}px, ${bgConfig.y}px) scale(${bgConfig.scale})`,
                         }}
                       />
                    </div>

                    {/* Layers */}
                    {layers.map(layer => (
                      <LayerComponent
                        key={layer.id}
                        layer={layer}
                        isSelected={selectedLayerId === layer.id}
                        onSelect={setSelectedLayerId}
                        onUpdate={updateLayer}
                        onDelete={deleteLayer}
                        scale={canvasScale}
                      />
                    ))}
                 </div>

                 {/* Zoom Controls */}
                 <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-800/90 backdrop-blur rounded-full px-4 py-2 flex items-center gap-4 text-sm text-gray-300 border border-gray-700 shadow-xl z-30">
                    <button onClick={() => setCanvasScale(s => Math.max(0.1, s - 0.1))} className="hover:text-white"><ZoomOut size={16} /></button>
                    <span className="w-12 text-center">{Math.round(canvasScale * 100)}%</span>
                    <button onClick={() => setCanvasScale(s => Math.min(2, s + 0.1))} className="hover:text-white"><ZoomIn size={16} /></button>
                 </div>
               </>
           )}
        </div>

        {/* Right Properties Panel (Contextual) */}
        <div className="w-80 bg-[#1f2937] border-l border-gray-700 flex flex-col z-20 overflow-y-auto custom-scrollbar shadow-xl">
           {!image ? (
               <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
                    <ImageIcon size={32} className="opacity-50" />
                  </div>
                  <div>
                    <h3 className="text-gray-400 font-medium mb-1">准备就绪</h3>
                    <p className="text-xs">上传图片即可开始<br/>使用右侧工具进行编辑</p>
                  </div>
               </div>
           ) : selectedLayerId ? (
              // Layer Selected
              selectedLayer?.type === LayerType.TEXT ? (
                <TextPropertiesPanel 
                  layer={selectedLayer} 
                  onUpdate={(updates) => updateLayer(selectedLayer.id, updates)}
                  onUpdateStyle={(style) => updateLayerStyle(selectedLayer.id, style)}
                  onDelete={() => deleteLayer(selectedLayer.id)}
                />
              ) : (
                <StickerPropertiesPanel
                  layer={selectedLayer!}
                  onDelete={() => deleteLayer(selectedLayerId)}
                />
              )
           ) : (
              // No Layer Selected -> Background Properties
              <BackgroundPropertiesPanel 
                config={bgConfig} 
                onChange={setBgConfig} 
              />
           )}
        </div>

      </div>
    </div>
  );
}

// --- Sub Components ---

const Header = ({ onReset, hasImage }: any) => (
  <header className="h-16 bg-[#1f2937] border-b border-gray-700 flex items-center justify-between px-6 z-30 shadow-md">
    <div className="flex items-center gap-3 font-bold text-xl tracking-tight">
       <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/25">
         <ImageIcon size={20} className="text-white" />
       </div>
       <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">图灵智绘</span>
    </div>
    <div className="flex items-center gap-4">
      {hasImage && (
        <button onClick={onReset} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors text-sm">
           <RotateCcw size={16} /> 重置
        </button>
      )}
    </div>
  </header>
);

const ToolButton = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={clsx(
      "w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all duration-200",
      active ? "bg-primary text-white shadow-lg shadow-primary/25" : "text-gray-400 hover:text-white hover:bg-gray-700"
    )}
  >
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

const ActionButton = ({ onClick, icon, label, colorClass, disabled }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={clsx(
      "w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all duration-200",
      colorClass
    )}
    title={label}
  >
    {icon}
  </button>
);

const BackgroundPropertiesPanel = ({ config, onChange }: { config: BackgroundConfig, onChange: React.Dispatch<React.SetStateAction<BackgroundConfig>> }) => (
  <div className="p-5 space-y-6 animate-in slide-in-from-right-4 duration-300">
    <div className="flex items-center gap-2 pb-4 border-b border-gray-700">
       <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Layout size={18}/></div>
       <h2 className="font-bold">背景调整</h2>
    </div>

    <div className="space-y-4">
      <div className="space-y-2">
         <div className="flex justify-between">
            <label className="text-xs text-gray-400">缩放 (Zoom)</label>
            <span className="text-xs text-gray-500">{config.scale.toFixed(2)}x</span>
         </div>
         <input 
           type="range" min="0.5" max="3" step="0.1"
           value={config.scale}
           onChange={(e) => onChange(p => ({ ...p, scale: parseFloat(e.target.value) }))}
           className="w-full accent-primary h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
         />
      </div>

      <div className="space-y-2">
         <div className="flex justify-between">
            <label className="text-xs text-gray-400">水平位置 (X)</label>
            <span className="text-xs text-gray-500">{config.x}px</span>
         </div>
         <input 
           type="range" min="-500" max="500" step="10"
           value={config.x}
           onChange={(e) => onChange(p => ({ ...p, x: parseInt(e.target.value) }))}
           className="w-full accent-primary h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
         />
      </div>

      <div className="space-y-2">
         <div className="flex justify-between">
            <label className="text-xs text-gray-400">垂直位置 (Y)</label>
            <span className="text-xs text-gray-500">{config.y}px</span>
         </div>
         <input 
           type="range" min="-500" max="500" step="10"
           value={config.y}
           onChange={(e) => onChange(p => ({ ...p, y: parseInt(e.target.value) }))}
           className="w-full accent-primary h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
         />
      </div>
      
      <div className="pt-2">
         <button 
           onClick={() => onChange(INITIAL_BG_CONFIG)}
           className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
         >
           <RotateCcw size={12} /> 重置位置
         </button>
      </div>
    </div>
  </div>
);

const TextPropertiesPanel = ({ layer, onUpdate, onUpdateStyle, onDelete }: { layer: Layer, onUpdate: any, onUpdateStyle: any, onDelete: any }) => {
  if (!layer.style) return null;

  return (
    <div className="p-5 space-y-6 animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between pb-4 border-b border-gray-700">
         <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><TypeIcon size={18}/></div>
            <h2 className="font-bold">编辑文字</h2>
         </div>
         <button onClick={onDelete} className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-lg transition-colors" title="删除">
            <Trash2 size={16} />
         </button>
      </div>

      <div className="space-y-4">
        {/* Content Input */}
        <div className="space-y-2">
           <label className="text-xs text-gray-400 font-bold">内容</label>
           <textarea 
             value={layer.content}
             onChange={(e) => onUpdate({ content: e.target.value })}
             className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:border-primary outline-none min-h-[80px] resize-none"
             placeholder="输入文字..."
           />
        </div>

        {/* Font Family */}
        <div className="space-y-2">
           <label className="text-xs text-gray-400 font-bold">字体</label>
           <select 
             value={layer.style.fontFamily}
             onChange={(e) => onUpdateStyle({ fontFamily: e.target.value })}
             className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm focus:border-primary outline-none"
           >
             {FONTS.map(f => <option key={f.name} value={f.value}>{f.name}</option>)}
           </select>
        </div>

        {/* Basic Style Row */}
        <div className="flex items-end gap-3">
           <div className="flex-1 space-y-2">
              <label className="text-xs text-gray-400 font-bold">颜色</label>
              <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg p-1.5">
                  <input type="color" value={layer.style.color} onChange={(e) => onUpdateStyle({ color: e.target.value })} className="w-6 h-6 rounded bg-transparent border-none cursor-pointer" />
                  <span className="text-xs uppercase text-gray-400">{layer.style.color}</span>
              </div>
           </div>
           <div className="flex-1 space-y-2">
              <label className="text-xs text-gray-400 font-bold">字号</label>
              <input 
                type="number" value={layer.style.fontSize} 
                onChange={(e) => onUpdateStyle({ fontSize: parseInt(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm focus:border-primary outline-none" 
              />
           </div>
        </div>

        {/* Alignment & Bold */}
        <div className="bg-gray-800 rounded-lg p-1 flex justify-between">
           <div className="flex">
              <StyleBtn active={layer.style.textAlign === 'left'} onClick={() => onUpdateStyle({ textAlign: 'left' })} icon={<AlignLeft size={16}/>} />
              <StyleBtn active={layer.style.textAlign === 'center'} onClick={() => onUpdateStyle({ textAlign: 'center' })} icon={<AlignCenter size={16}/>} />
              <StyleBtn active={layer.style.textAlign === 'right'} onClick={() => onUpdateStyle({ textAlign: 'right' })} icon={<AlignRight size={16}/>} />
           </div>
           <div className="w-px bg-gray-700 my-1 mx-1"></div>
           <StyleBtn active={layer.style.fontWeight === 'bold'} onClick={() => onUpdateStyle({ fontWeight: layer.style.fontWeight === 'bold' ? 'normal' : 'bold' })} icon={<Bold size={16}/>} />
        </div>

        {/* Sliders */}
        <div className="space-y-4 pt-2">
            <RangeControl label="内边距" value={layer.style.padding} min={0} max={50} onChange={(v) => onUpdateStyle({ padding: v })} />
            <RangeControl label="圆角" value={layer.style.borderRadius} min={0} max={50} onChange={(v) => onUpdateStyle({ borderRadius: v })} />
            
            <div className="space-y-2">
               <label className="text-xs text-gray-400 font-bold">背景颜色</label>
               <div className="flex items-center gap-2">
                   <button 
                     onClick={() => onUpdateStyle({ backgroundColor: 'rgba(0,0,0,0)' })}
                     className={clsx("w-8 h-8 rounded border border-gray-600 flex items-center justify-center text-red-400", layer.style.backgroundColor === 'rgba(0,0,0,0)' ? 'bg-gray-700' : '')}
                     title="清除背景"
                   >
                     <XIcon size={14} />
                   </button>
                   <input 
                     type="color" 
                     value={layer.style.backgroundColor === 'rgba(0,0,0,0)' ? '#000000' : layer.style.backgroundColor}
                     onChange={(e) => onUpdateStyle({ backgroundColor: e.target.value })}
                     className="flex-1 h-8 rounded cursor-pointer bg-transparent border-none"
                   />
               </div>
            </div>
        </div>

      </div>
    </div>
  );
};

const StickerPropertiesPanel = ({ layer, onDelete }: { layer: Layer, onDelete: any }) => (
   <div className="p-5 space-y-6 animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between pb-4 border-b border-gray-700">
         <div className="flex items-center gap-2">
            <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400"><Smile size={18}/></div>
            <h2 className="font-bold">编辑贴纸</h2>
         </div>
         <button onClick={onDelete} className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
            <Trash2 size={16} />
         </button>
      </div>
      <div className="text-center py-8 text-gray-500 text-sm">
         拖动角落调整贴纸大小<br/>或拖动贴纸移动位置
      </div>
   </div>
);

const RangeControl = ({ label, value, min, max, onChange }: any) => (
  <div className="space-y-2">
    <div className="flex justify-between">
      <label className="text-xs text-gray-400 font-bold">{label}</label>
      <span className="text-xs text-gray-500">{value}px</span>
    </div>
    <input 
      type="range" min={min} max={max} 
      value={value} 
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="w-full accent-primary h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer" 
    />
  </div>
);

const StyleBtn = ({ active, onClick, icon }: any) => (
  <button 
    onClick={onClick}
    className={clsx(
      "p-2 rounded transition-colors",
      active ? "bg-primary text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"
    )}
  >
    {icon}
  </button>
);