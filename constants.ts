import { AspectRatio, FilterPreset } from "./types";

export const ASPECT_RATIOS: AspectRatio[] = [
  { name: '1:1', width: 1080, height: 1080, label: '正方形', icon: 'square' },
  { name: '4:3', width: 1024, height: 768, label: '标准', icon: 'rectangle-horizontal' },
  { name: '3:4', width: 768, height: 1024, label: '各种', icon: 'rectangle-vertical' },
  { name: '16:9', width: 1920, height: 1080, label: '横屏', icon: 'monitor' },
  { name: '9:16', width: 1080, height: 1920, label: '竖屏', icon: 'smartphone' },
];

export const FILTERS: FilterPreset[] = [
  { name: '原图', value: 'none', previewColor: '#ffffff' },
  { name: '黑白', value: 'grayscale(100%)', previewColor: '#555555' },
  { name: '复古', value: 'sepia(80%) contrast(90%)', previewColor: '#c0a080' },
  { name: '冷色', value: 'hue-rotate(180deg) brightness(95%)', previewColor: '#80a0c0' },
  { name: '鲜艳', value: 'saturate(200%) contrast(110%)', previewColor: '#ff5555' },
  { name: '胶片', value: 'contrast(110%) brightness(110%) saturate(130%) sepia(30%)', previewColor: '#d4b886' },
  { name: '模糊', value: 'blur(2px)', previewColor: '#999999' },
];

export const FONTS = [
  { name: '思源黑体', value: '"Noto Sans SC", sans-serif' },
  { name: '马山正毛笔', value: '"Ma Shan Zheng", cursive' },
  { name: '站酷快乐体', value: '"Zcool KuaiLe", cursive' },
  { name: '龙苍草书', value: '"Long Cang", cursive' },
  { name: '系统默认', value: 'sans-serif' },
];

export const STICKERS = [
  '🔥', '✨', '💖', '🎉', '🇨🇳', '📷', '🎨', '🚀', '💡', '🌟', 
  '🐶', '🐱', '🌸', '🍀', '🎵', '🔞', '✅', '❌', '💯', '🆒'
];
