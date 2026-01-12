export interface RoboflowPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
  class_id: number;
  detection_id: string;
  points?: Array<{ x: number; y: number }>;
}

export interface RoboflowResponse {
  time: number;
  image: {
    width: number;
    height: number;
  };
  predictions: RoboflowPrediction[];
}

export interface DetectionStats {
  totalDetections: number;
  uniqueClasses: string[];
  classCounts: Record<string, number>;
}

export interface LabelVisibility {
  [key: string]: boolean;
}

export interface DetectionFilter {
  [className: string]: boolean;
}

export interface UploadedImage {
  file: File;
  preview: string;
  name: string;
}
