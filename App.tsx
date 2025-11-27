import React, { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { 
  Upload, Type as TypeIcon, Smile, Layout, Download, 
  Trash2, Image as ImageIcon, Palette,
  RotateCcw, ZoomIn, ZoomOut, AlignLeft, AlignCenter, AlignRight, Bold, X as XIcon,
  ChevronDown, Layers, Check, Sun, Moon
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
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'layout' | 'filter' | 'text' | 'sticker' | null>('layout');
  
  // Background Config
  const [bgConfig, setBgConfig] = useState<BackgroundConfig>(INITIAL_BG_CONFIG);

  // UI State
  const [isExporting, setIsExporting] = useState(false);
  const [canvasScale, setCanvasScale] = useState(0.6);
  
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Mobile specific state
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Refs
  const workspaceRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  
  const fontCssRef = useRef<string>('');

  // --- Effects ---
  
  useEffect(() => {
    fetch(GOOGLE_FONTS_URL)
      .then(res => {
        if (res.ok) return res.text();
        throw new Error('Network response was not ok.');
      })
      .then(css => {
        fontCssRef.current = css;
      })
      .catch(e => console.warn('Background font fetch failed:', e));
  }, []);

  // Responsive Check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-open sheet on mobile when selecting a layer or tab
  useEffect(() => {
    if (isMobile) {
      if (selectedLayerId) {
        // If layer selected, close tool tab and open sheet (for properties)
        setActiveTab(null);
        setIsMobileSheetOpen(true);
      } else if (activeTab) {
        // If tool selected, open sheet
        setIsMobileSheetOpen(true);
      } else {
        setIsMobileSheetOpen(false);
      }
    }
  }, [selectedLayerId, activeTab, isMobile]);

  // --- Computed ---
  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  // --- Handlers ---
  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isReplace = false) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const width = img.naturalWidth;
          const height = img.naturalHeight;
          setOriginalSize({ width, height });
          if (!image || (!isReplace && aspectRatio.name === 'original') || (isReplace && aspectRatio.name === 'original')) {
             setAspectRatio({
              name: 'original',
              width: width,
              height: height,
              label: '原图',
              icon: 'image'
            });
          }
          setImage(result);
          setBgConfig(INITIAL_BG_CONFIG);
        };
        img.src = result;
      };
      reader.readAsDataURL(e.target.files[0]);
    }
    if (e.target) e.target.value = '';
  };

  const addTextLayer = () => {
    if (!image) { alert("请先上传图片"); return; }
    const content = "双击编辑文本";
    const newLayer: Layer = {
      id: uuidv4(),
      type: LayerType.TEXT,
      // Position higher up on mobile to avoid bottom sheet
      x: aspectRatio.width / 2 - 200,
      y: isMobile ? aspectRatio.height * 0.2 : aspectRatio.height / 2 - 75,
      width: 400, height: 150, rotation: 0, content,
      style: { ...INITIAL_TEXT_STYLE },
    };
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const addStickerLayer = (sticker: string) => {
    if (!image) { alert("请先上传图片"); return; }
    const newLayer: Layer = {
      id: uuidv4(),
      type: LayerType.STICKER,
      x: aspectRatio.width / 2 - 50,
      y: isMobile ? aspectRatio.height * 0.2 : aspectRatio.height / 2 - 50,
      width: 150, height: 150, rotation: 0, content: sticker,
    };
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const updateLayer = (id: string, updates: Partial<Layer>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };
  
  const updateLayerStyle = (id: string, styleUpdates: Partial<FontStyle>) => {
    setLayers(prev => prev.map(l => l.id === id && l.type === LayerType.TEXT ? { ...l, style: { ...l.style!, ...styleUpdates } } : l));
  };

  const deleteLayer = (id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  const handleExport = async () => {
    if (!workspaceRef.current || !image) return;
    setIsExporting(true);
    const originalSelection = selectedLayerId;
    setSelectedLayerId(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 10));
      const commonConfig = {
        skipAutoScale: true, pixelRatio: 1,
        width: aspectRatio.width, height: aspectRatio.height,
        canvasWidth: aspectRatio.width, canvasHeight: aspectRatio.height,
        fontEmbedCSS: fontCssRef.current,
        style: { transform: 'none', transformOrigin: 'top left' },
        fetchRequestInit: { mode: 'cors' as RequestMode, credentials: 'omit' as RequestCredentials }
      };

      let dataUrl;
      try {
          dataUrl = await toPng(workspaceRef.current!, { ...commonConfig, cacheBust: false });
      } catch (error) {
          dataUrl = await toPng(workspaceRef.current!, { ...commonConfig, cacheBust: true });
      }
      
      if (dataUrl) {
          const link = document.createElement('a');
          link.download = `tuling-design-${Date.now()}.png`;
          link.href = dataUrl;
          link.click();
      }
    } catch (err) {
      console.error('Export failed', err);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
      setSelectedLayerId(originalSelection);
    }
  };

  // Callback to close sheet when editing starts on canvas
  const handleLayerEditStart = () => {
    if (isMobile) {
      setIsMobileSheetOpen(false);
    }
  };

  const renderToolsPanel = () => (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">
           {activeTab === 'layout' && '画布尺寸'}
           {activeTab === 'filter' && '滤镜效果'}
           {activeTab === 'text' && '添加文字'}
           {activeTab === 'sticker' && '添加贴纸'}
        </h3>
        {/* Mobile Close Button */}
        <button 
          className="md:hidden p-1 text-gray-500 dark:text-gray-400"
          onClick={() => { setActiveTab(null); setIsMobileSheetOpen(false); }}
        >
          <ChevronDown />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {/* Layout Tab */}
        {activeTab === 'layout' && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
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
                    "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all",
                    aspectRatio.name === 'original' ? "border-primary bg-primary/10 text-primary" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-200"
                  )}
                >
                  <span className="text-2xl mb-2 font-bold">1:1</span>
                  <span className="text-sm">原图尺寸</span>
                </button>
              )}
              {ASPECT_RATIOS.map(ratio => (
                <button
                  key={ratio.name}
                  onClick={() => setAspectRatio(ratio)}
                  className={clsx(
                    "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all",
                    aspectRatio.name === ratio.name ? "border-primary bg-primary/10 text-primary" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-200"
                  )}
                >
                  <div className={clsx(
                    "border-2 mb-2 rounded-sm",
                    aspectRatio.name === ratio.name ? "border-primary" : "border-gray-400",
                    ratio.name === '1:1' && "w-6 h-6",
                    ratio.name === '4:3' && "w-8 h-6",
                    ratio.name === '3:4' && "w-6 h-8",
                    ratio.name === '16:9' && "w-9 h-5",
                    ratio.name === '9:16' && "w-5 h-9",
                  )} />
                  <span className="text-sm">{ratio.label}</span>
                </button>
              ))}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm text-gray-500 dark:text-gray-400 mb-3">背景调整</h4>
              <button
                onClick={() => setSelectedLayerId(null)}
                className="w-full py-3 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-white"
              >
                选中背景图
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">选中背景图后在右侧/下方调整</p>
            </div>
          </>
        )}

        {/* Filters Tab */}
        {activeTab === 'filter' && (
          <div className="grid grid-cols-3 gap-3">
            {FILTERS.map(filter => (
              <button
                key={filter.name}
                onClick={() => setBgConfig(prev => ({ ...prev, filter: filter.value }))}
                className={clsx(
                  "flex flex-col items-center gap-2 p-2 rounded-lg transition-all text-gray-700 dark:text-gray-200",
                  bgConfig.filter === filter.value ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-gray-100 dark:hover:bg-[#1e293b]"
                )}
              >
                <div 
                  className="w-full aspect-square rounded-full shadow-inner border border-gray-200 dark:border-gray-600"
                  style={{ backgroundColor: filter.previewColor }}
                />
                <span className="text-xs">{filter.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Text Tab */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            <button
              onClick={addTextLayer}
              className="w-full py-4 bg-gradient-to-r from-[#6366f1] to-[#a855f7] rounded-xl font-bold text-lg text-white shadow-lg hover:shadow-primary/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <TypeIcon size={24} /> 普通文本
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">
              点击上方按钮添加文本图层。选中图层后，在右侧面板编辑内容和样式。
            </p>
          </div>
        )}

        {/* Sticker Tab */}
        {activeTab === 'sticker' && (
          <div className="grid grid-cols-5 gap-3">
            {STICKERS.map((sticker, i) => (
              <button
                key={i}
                onClick={() => addStickerLayer(sticker)}
                className="text-3xl hover:scale-125 transition-transform p-2 cursor-pointer"
              >
                {sticker}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderPropertiesPanel = () => (
    <div className="h-full flex flex-col">
       <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">
           {selectedLayer ? (selectedLayer.type === LayerType.TEXT ? '编辑文字' : '编辑元素') : '背景调整'}
        </h3>
        <div className="flex gap-2">
            {/* Mobile Done Button */}
            <button 
              className="md:hidden p-1.5 bg-primary/20 text-primary rounded-lg flex items-center gap-1 px-3"
              onClick={() => { setSelectedLayerId(null); setIsMobileSheetOpen(false); }}
            >
              <Check size={16} /> <span className="text-xs font-bold">完成</span>
            </button>
            <button 
              className="md:hidden p-1 text-gray-500 dark:text-gray-400"
              onClick={() => { setSelectedLayerId(null); setIsMobileSheetOpen(false); }}
            >
              <ChevronDown />
            </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
      {selectedLayer ? (
        <>
          {selectedLayer.type === LayerType.TEXT && selectedLayer.style && (
            <div className="space-y-6">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">内容</label>
                <textarea
                  value={selectedLayer.content}
                  onChange={(e) => updateLayer(selectedLayer.id, { content: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg p-3 text-sm focus:border-primary outline-none resize-none h-24"
                  placeholder="输入文本内容..."
                />
              </div>

              <div>
                 <div className="flex justify-between mb-2">
                    <label className="text-xs text-gray-500 dark:text-gray-400">大小 ({Math.round(selectedLayer.style.fontSize)})</label>
                 </div>
                <input
                  type="range"
                  min="12"
                  max="200"
                  value={selectedLayer.style.fontSize}
                  onChange={(e) => updateLayerStyle(selectedLayer.id, { fontSize: Number(e.target.value) })}
                  className="w-full accent-primary h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

               <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">字体</label>
                <select
                  value={selectedLayer.style.fontFamily}
                  onChange={(e) => updateLayerStyle(selectedLayer.id, { fontFamily: e.target.value })}
                  className="w-full bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg p-2 text-sm focus:border-primary outline-none"
                >
                  {FONTS.map(font => (
                    <option key={font.value} value={font.value}>{font.name}</option>
                  ))}
                </select>
              </div>

              {/* Advanced Text Styles */}
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">对齐</label>
                    <div className="flex bg-gray-100 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
                      {[
                        { icon: AlignLeft, value: 'left' },
                        { icon: AlignCenter, value: 'center' },
                        { icon: AlignRight, value: 'right' }
                      ].map((opt) => (
                        <button
                           key={opt.value}
                           onClick={() => updateLayerStyle(selectedLayer.id, { textAlign: opt.value as any })}
                           className={clsx(
                             "flex-1 p-1 rounded flex justify-center",
                             selectedLayer.style?.textAlign === opt.value ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-400"
                           )}
                        >
                          <opt.icon size={16} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                     <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">样式</label>
                      <button
                           onClick={() => updateLayerStyle(selectedLayer.id, { fontWeight: selectedLayer.style?.fontWeight === 'bold' ? 'normal' : 'bold' })}
                           className={clsx(
                             "w-full p-2 rounded border border-gray-200 dark:border-gray-700 flex justify-center items-center gap-2",
                             selectedLayer.style?.fontWeight === 'bold' ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" : "text-gray-400"
                           )}
                        >
                          <Bold size={16} /> 粗体
                        </button>
                  </div>
              </div>

               <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">颜色</label>
                <div className="flex flex-wrap gap-2">
                  {['#000000', '#ffffff', '#ef4444', '#e11d48', '#9333ea', '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#22c55e', '#84cc16', '#eab308', '#f97316', '#f43f5e'].map(color => (
                    <button
                      key={color}
                      onClick={() => updateLayerStyle(selectedLayer.id, { color })}
                      className={clsx(
                        "w-6 h-6 rounded-full border border-gray-200 dark:border-gray-600 transition-transform hover:scale-110",
                        selectedLayer.style?.color === color && "ring-2 ring-primary scale-110"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

               <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">背景颜色</label>
                <div className="flex flex-wrap gap-2">
                   <button
                      onClick={() => updateLayerStyle(selectedLayer.id, { backgroundColor: 'transparent' })}
                      className={clsx(
                        "w-6 h-6 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center text-[10px] text-gray-500 dark:text-gray-300",
                        selectedLayer.style?.backgroundColor === 'transparent' && "ring-2 ring-primary"
                      )}
                    >无</button>
                  {['#000000', '#ffffff', '#ef4444', '#e11d48', '#9333ea', '#6366f1', '#3b82f6', '#06b6d4'].map(color => (
                    <button
                      key={color}
                      onClick={() => updateLayerStyle(selectedLayer.id, { backgroundColor: color })}
                      className={clsx(
                        "w-6 h-6 rounded-full border border-gray-200 dark:border-gray-600 transition-transform hover:scale-110",
                        selectedLayer.style?.backgroundColor === color && "ring-2 ring-primary scale-110"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">内边距</label>
                     <input
                        type="range" min="0" max="50"
                        value={selectedLayer.style.padding}
                        onChange={(e) => updateLayerStyle(selectedLayer.id, { padding: Number(e.target.value) })}
                        className="w-full accent-primary h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">圆角</label>
                     <input
                        type="range" min="0" max="50"
                        value={selectedLayer.style.borderRadius}
                        onChange={(e) => updateLayerStyle(selectedLayer.id, { borderRadius: Number(e.target.value) })}
                        className="w-full accent-primary h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                  </div>
              </div>

            </div>
          )}
          
          <button
            onClick={() => deleteLayer(selectedLayer.id)}
            className="w-full mt-8 py-3 bg-red-500/10 text-red-500 border border-red-500/50 rounded-lg hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <Trash2 size={18} /> 删除此元素
          </button>
        </>
      ) : (
        <div className="space-y-6">
           <div>
              <div className="flex justify-between mb-2">
                 <label className="text-xs text-gray-500 dark:text-gray-400">缩放 (Zoom)</label>
                 <span className="text-xs text-gray-600 dark:text-gray-500">{bgConfig.scale.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={bgConfig.scale}
                onChange={(e) => setBgConfig(prev => ({ ...prev, scale: Number(e.target.value) }))}
                className="w-full accent-primary h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
           </div>
           
           <div>
              <div className="flex justify-between mb-2">
                 <label className="text-xs text-gray-500 dark:text-gray-400">水平位置 (X)</label>
                 <span className="text-xs text-gray-600 dark:text-gray-500">{bgConfig.x}px</span>
              </div>
              <input
                type="range"
                min="-500"
                max="500"
                value={bgConfig.x}
                onChange={(e) => setBgConfig(prev => ({ ...prev, x: Number(e.target.value) }))}
                className="w-full accent-primary h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
           </div>

           <div>
              <div className="flex justify-between mb-2">
                 <label className="text-xs text-gray-500 dark:text-gray-400">垂直位置 (Y)</label>
                 <span className="text-xs text-gray-600 dark:text-gray-500">{bgConfig.y}px</span>
              </div>
              <input
                type="range"
                min="-500"
                max="500"
                value={bgConfig.y}
                onChange={(e) => setBgConfig(prev => ({ ...prev, y: Number(e.target.value) }))}
                className="w-full accent-primary h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
           </div>

           <button 
             onClick={() => setBgConfig(INITIAL_BG_CONFIG)}
             className="text-primary text-sm flex items-center gap-1 hover:underline"
           >
             <RotateCcw size={14} /> 重置位置
           </button>
        </div>
      )}
      </div>
    </div>
  );

  return (
    <div className={clsx("w-full h-full", isDarkMode && "dark")}>
      <div className="flex h-screen w-full bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white overflow-hidden flex-col md:flex-row relative transition-colors duration-300">
        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleImageUpload(e, false)}
          accept="image/*"
          className="hidden"
        />
        <input
          type="file"
          ref={replaceInputRef}
          onChange={(e) => handleImageUpload(e, true)}
          accept="image/*"
          className="hidden"
        />

        {/* --- DESKTOP LEFT SIDEBAR --- */}
        <div className="hidden md:flex w-20 flex-col items-center py-6 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] z-20 transition-colors">
          <div className="mb-8 p-2 bg-gradient-to-br from-primary to-secondary rounded-xl shadow-lg shadow-primary/20">
            <ImageIcon className="text-white" size={24} />
          </div>
          
          <nav className="flex-1 flex flex-col gap-6 w-full px-2">
            {[
              { id: 'layout', icon: Layout, label: '布局' },
              { id: 'filter', icon: Palette, label: '滤镜' },
              { id: 'text', icon: TypeIcon, label: '文字' },
              { id: 'sticker', icon: Smile, label: '贴纸' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id as any); setSelectedLayerId(null); }}
                className={clsx(
                  "flex flex-col items-center gap-1 p-2 rounded-lg transition-all w-full group relative",
                  activeTab === item.id ? "text-primary" : "text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                )}
              >
                <div className={clsx(
                  "p-2 rounded-lg transition-all",
                  activeTab === item.id ? "bg-primary text-white shadow-lg shadow-primary/30" : "group-hover:scale-110"
                )}>
                  <item.icon size={22} />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
                {activeTab === item.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full -ml-2" />
                )}
              </button>
            ))}
          </nav>

          {/* Desktop Bottom Actions */}
          <div className="flex flex-col gap-4 w-full px-2 mb-2">
            <button
              onClick={() => replaceInputRef.current?.click()}
              className="flex flex-col items-center gap-1 p-2 rounded-lg text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-500/10 transition-all"
              title="换图"
            >
              <div className="p-2 rounded-lg bg-blue-500/20">
                <ImageIcon size={20} />
              </div>
              <span className="text-[10px]">换图</span>
            </button>
            
            <button
              onClick={handleExport}
              disabled={!image}
              className="flex flex-col items-center gap-1 p-2 rounded-lg text-green-500 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300 hover:bg-green-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="导出"
            >
              <div className="p-2 rounded-lg bg-green-500/20">
                <Download size={20} />
              </div>
              <span className="text-[10px]">导出</span>
            </button>
          </div>
        </div>

        {/* --- DESKTOP TOOL DRAWER --- */}
        <div className={clsx(
          "hidden md:flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-[#1e293b]/50 backdrop-blur-md transition-all duration-300 ease-in-out overflow-hidden",
          activeTab ? "w-80 opacity-100" : "w-0 opacity-0 border-none"
        )}>
          {activeTab && renderToolsPanel()}
        </div>

        {/* --- MAIN WORKSPACE --- */}
        <div 
          ref={containerRef}
          className="flex-1 flex flex-col relative overflow-hidden bg-gray-100 dark:bg-black transition-colors"
        >
          {/* Mobile Header */}
          <div className="md:hidden h-14 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e293b] z-30 transition-colors">
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleTheme}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <div className="flex items-center gap-2">
                 <div className="p-1.5 bg-gradient-to-br from-primary to-secondary rounded-lg">
                    <ImageIcon className="text-white" size={16} />
                 </div>
                 <span className="font-bold text-gray-900 dark:text-white">图灵智绘</span>
              </div>
            </div>
            <div className="flex gap-3">
                <button 
                  onClick={() => replaceInputRef.current?.click()}
                  className="text-blue-500 dark:text-blue-400 p-1.5 bg-blue-500/10 rounded-lg"
                >
                  <ImageIcon size={18} />
                </button>
                <button 
                  onClick={handleExport}
                  disabled={!image}
                  className="text-green-500 dark:text-green-400 p-1.5 bg-green-500/10 rounded-lg disabled:opacity-50"
                >
                  <Download size={18} />
                </button>
            </div>
          </div>

          {/* Desktop Header Controls */}
          <div className="hidden md:flex absolute top-4 right-4 z-40 bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur rounded-lg border border-gray-200 dark:border-gray-700 p-1 shadow-lg gap-1 transition-colors">
            <button 
              onClick={toggleTheme} 
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded text-gray-600 dark:text-gray-300"
              title={isDarkMode ? "切换到亮色模式" : "切换到暗色模式"}
            >
              {isDarkMode ? <Sun size={16}/> : <Moon size={16}/>}
            </button>
            <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1" />
            <button onClick={() => setCanvasScale(s => Math.max(0.2, s - 0.1))} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded text-gray-600 dark:text-gray-300"><ZoomOut size={16}/></button>
            <span className="text-xs flex items-center px-2 text-gray-500 dark:text-gray-400 min-w-[3rem] justify-center">{Math.round(canvasScale * 100)}%</span>
            <button onClick={() => setCanvasScale(s => Math.min(2, s + 0.1))} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded text-gray-600 dark:text-gray-300"><ZoomIn size={16}/></button>
            <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1" />
            <button onClick={() => { setBgConfig(INITIAL_BG_CONFIG); setLayers([]); setImage(null); }} className="px-3 py-1.5 text-xs hover:bg-red-500/10 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 rounded flex items-center gap-1">
              <RotateCcw size={14} /> 重置
            </button>
          </div>
          
          {/* Canvas Area */}
          <div className="flex-1 flex items-center justify-center p-4 md:p-10 relative overflow-hidden pb-20 md:pb-10">
            {!image ? (
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl bg-white/50 dark:bg-[#1e293b]/30 max-w-md w-full text-center transition-colors">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                  <ImageIcon size={40} className="text-gray-400 dark:text-gray-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">上传图片开始排版</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8">支持 JPG, PNG 格式</p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-8 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                >
                  <Upload size={20} /> 选择图片
                </button>
              </div>
            ) : (
              <div 
                className="relative shadow-2xl transition-transform duration-200 ease-out"
                style={{ 
                  width: aspectRatio.width, 
                  height: aspectRatio.height,
                  transform: `scale(${isMobile ? (window.innerWidth / aspectRatio.width) * 0.85 : canvasScale})`,
                  transformOrigin: 'center center'
                }}
              >
                {/* Capture Area */}
                <div 
                  ref={workspaceRef}
                  className="w-full h-full relative bg-gray-900 overflow-hidden"
                  onClick={() => setSelectedLayerId(null)}
                >
                  {/* Background Image */}
                  <div 
                    className="w-full h-full absolute inset-0"
                    style={{ 
                      filter: bgConfig.filter,
                      transform: `scale(${bgConfig.scale}) translate(${bgConfig.x}px, ${bgConfig.y}px)`
                    }}
                  >
                    <img src={image} alt="Background" className="w-full h-full object-cover pointer-events-none select-none" />
                  </div>

                  {/* Layers */}
                  {layers.map((layer) => (
                    <LayerComponent
                      key={layer.id}
                      layer={layer}
                      scale={isMobile ? (window.innerWidth / aspectRatio.width) * 0.85 : canvasScale}
                      isSelected={selectedLayerId === layer.id}
                      onSelect={setSelectedLayerId}
                      onUpdate={updateLayer}
                      onDelete={deleteLayer}
                      onEditStart={handleLayerEditStart}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- DESKTOP RIGHT SIDEBAR (PROPERTIES) --- */}
        <div className="hidden md:flex w-80 flex-col border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] z-20 transition-colors">
          {renderPropertiesPanel()}
        </div>

        {/* --- MOBILE BOTTOM NAVIGATION --- */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-[#1e293b] border-t border-gray-200 dark:border-gray-800 flex justify-around items-center z-50 pb-safe transition-colors">
            {[
              { id: 'layout', icon: Layout, label: '布局' },
              { id: 'filter', icon: Palette, label: '滤镜' },
              { id: 'text', icon: TypeIcon, label: '文字' },
              { id: 'sticker', icon: Smile, label: '贴纸' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { 
                  if (activeTab === item.id && isMobileSheetOpen) {
                    setIsMobileSheetOpen(false); // Toggle close if clicking same
                    setActiveTab(null);
                  } else {
                    setActiveTab(item.id as any); 
                    setSelectedLayerId(null);
                  }
                }}
                className={clsx(
                  "flex flex-col items-center gap-1",
                  activeTab === item.id ? "text-primary" : "text-gray-400 dark:text-gray-500"
                )}
              >
                <item.icon size={22} />
                <span className="text-[10px]">{item.label}</span>
              </button>
            ))}
            <button 
              onClick={() => { setSelectedLayerId(null); setActiveTab(null); setIsMobileSheetOpen(true); }} // Open background/layers
              className={clsx(
                "flex flex-col items-center gap-1",
                (!activeTab && !selectedLayerId && isMobileSheetOpen) ? "text-primary" : "text-gray-400 dark:text-gray-500"
              )}
            >
              <Layers size={22} />
              <span className="text-[10px]">背景</span>
            </button>
        </div>

        {/* --- MOBILE SHEET (TOOLS & PROPERTIES) --- */}
        {isMobile && (
          <div 
            className={clsx(
              "fixed inset-x-0 bottom-16 bg-white dark:bg-[#1e293b] border-t border-gray-200 dark:border-gray-700 z-40 transition-transform duration-300 ease-in-out rounded-t-2xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_-5px_20px_rgba(0,0,0,0.5)]",
              isMobileSheetOpen ? "translate-y-0" : "translate-y-full"
            )}
            style={{ height: '40vh' }}
          >
            {/* If a layer is selected, OR activeTab is null (meaning background edit), show Property Panel */}
            {/* If activeTab is set AND no layer selected, show Tools Panel */}
            {(selectedLayerId || !activeTab) ? renderPropertiesPanel() : renderToolsPanel()}
          </div>
        )}

      </div>
    </div>
  );
}