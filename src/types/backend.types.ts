export interface BackendPrediction {
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

export interface BackendResponse {
  time: number;
  image: {
    width: number;
    height: number;
  };
  predictions: BackendPrediction[];
}

export interface AiCountingData {
  packaging_count: number;
  boxes_in_packaging: number;
  pallet_count: number;
  boxes_in_pallet: number;
  layer_count: number;
  boxes_in_layers: number;
  separated_boxes: number;
  total_boxes: number;
  image_filename: string;
  annotated_image: string; // base64 string
  roboflow_predictions?: any[]; // Array of detections
}

export interface AiCountingMultipleData {
  results: AiCountingData[];
}

export interface AiCountingResponse {
  success: boolean;
  data: AiCountingData | AiCountingMultipleData;
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
