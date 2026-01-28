export interface FileData {
  base64: string;
  mimeType: string;
  file?: File;
  objectURL?: string;
  width?: number; // New: width of the image
  height?: number; // New: height of the image
}

export interface OptionItem {
  value: string;
  label: string;
  description?: string;
}

export interface RenderOptions {
  category: string;
  style: string;
  colorPalette: string;
  surfaceMaterial: string; // New: specific surface material
  textileMaterial: string; // New: specific textile material
  textileColor1: string; // New: primary textile color
  textileColor2: string; // New: secondary textile color
  additionalPrompt: string;
  hiddenAIContext?: string; // New: Hidden AI analysis context
  isAutoFocus: boolean; // New: AI Photography Auto-Focus
  cameraPreset: string; // New: Photography Lens Preset Key
}

export enum AppState {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export enum Tool {
  RENDER = 'render',
  UPSCALE = 'upscale',
  ADVANCED_EDIT = 'advanced_edit',
  SKETCH_CONVERTER = 'sketch_converter',
  IDEA_GENERATOR = 'idea_generator' // New tool
}

export type Resolution = '1K' | '2K' | '4K';

export interface UpscaleState {
  sourceImage: FileData | null;
  isLoading: boolean;
  error: string | null;
  upscaledImages: string[];
  resolution: Resolution;
}

export interface UpscaleProps {
  state: UpscaleState;
  onStateChange: (newState: Partial<UpscaleState>) => void;
  userCredits: number;
  onDeductCredits?: (cost: number, description: string) => Promise<void>;
  onReset: () => void;
}

// New AdvancedEdit state and props
export type EditMode = 'NOTE' | 'SWAP';

export interface ClickPoint {
  x: number;
  y: number;
}

export interface AdvancedEditState {
  sourceImage: FileData | null;
  editMode: EditMode;
  refObject: FileData | null; // For SWAP mode
  annotatedBase64: string | null; // For NOTE mode (base64 of image with annotations)
  clickPoint: ClickPoint | null; // For SWAP mode (single point reference for detection/swap)
  detectedPoints: ClickPoint[]; // New: List of automatically detected similar objects
  resultImage: string | null; // AI generated result
  isLoading: boolean;
  error: string | null;
  isAnnotating: boolean; // Controls whether AnnotationCanvas is visible
  additionalPrompt?: string; // New: Optional user text prompt for edits
}

export interface AdvancedEditProps {
  state: AdvancedEditState;
  onStateChange: (newState: Partial<AdvancedEditState>) => void;
  userCredits: number;
  onDeductCredits?: (cost: number, description: string) => Promise<void>;
  onReset: () => void;
}

// New Sketch Converter types
export type SketchStyle = 'pencil' | 'charcoal' | 'watercolor' | 'architectural';

export interface SketchConverterState {
  sourceImage: FileData | null;
  resultImage: string | null;
  isLoading: boolean;
  error: string | null;
  sketchStyle: SketchStyle;
  resolution: Resolution;
}

export interface SketchConverterProps {
  state: SketchConverterState;
  onStateChange: (newState: Partial<SketchConverterState>) => void;
  userCredits: number;
  onDeductCredits?: (cost: number, description: string) => Promise<void>;
  onReset: () => void;
}

// New Idea Generator Types
export interface IdeaAsset {
  id: string;
  x: number; // Percentage coordinate 0-100
  y: number; // Percentage coordinate 0-100
  image: FileData | null;
  label: string;
}

export interface IdeaGeneratorState {
  sourceSketch: FileData | null;
  assets: IdeaAsset[];
  isLoading: boolean;
  error: string | null;
  resultImage: string | null;
}

export interface IdeaGeneratorProps {
  state: IdeaGeneratorState;
  onStateChange: (newState: Partial<IdeaGeneratorState>) => void;
  userCredits: number;
  onDeductCredits?: (cost: number, description: string) => Promise<void>;
  onReset: () => void;
}


// Annotation Types for AnnotationCanvas
export type AnnotationTool = 'brush' | 'arrow' | 'text';

export interface StrokeAnnotation {
  type: 'brush';
  points: { x: number; y: number }[];
  color: string;
  lineWidth: number;
}

export interface ArrowAnnotation {
  type: 'arrow';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  lineWidth: number;
}

export interface TextAnnotation {
  type: 'text';
  x: number;
  y: number;
  content: string;
  color: string;
  fontSize: number;
  fontFamily: string;
}

export type Annotation = StrokeAnnotation | ArrowAnnotation | TextAnnotation;

// --- LEARNING & FEEDBACK TYPES ---
export interface LearningContext {
    examples: string;
    constraints: string;
}

export interface RenderHistoryEntry {
    id: string;
    category: string;
    style: string;
    master_prompt: string;
    rating?: number;
    feedback_tags?: string[];
    created_at?: string;
}