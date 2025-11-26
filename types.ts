
export enum LayerType {
  TEXT = 'TEXT',
  STICKER = 'STICKER',
}

export interface FontStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  fontWeight: string; // 'normal' | 'bold'
  textAlign: 'left' | 'center' | 'right';
  padding: number;
  borderRadius: number;
  lineHeight: number;
}

export interface Layer {
  id: string;
  type: LayerType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content: string; 
  style?: FontStyle; // Only for text
}

export interface AspectRatio {
  name: string;
  width: number;
  height: number;
  label: string;
  icon: string;
}

export interface FilterPreset {
  name: string;
  value: string;
  previewColor: string;
}

export interface BackgroundConfig {
  scale: number;
  x: number;
  y: number;
  filter: string;
}
