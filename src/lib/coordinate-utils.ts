/**
 * Coordinate Normalization Utilities
 * Handles different bounding box coordinate formats
 * 
 * Common formats:
 * - Center format (Roboflow): { x, y, width, height } where x,y is center
 * - Corner format (COCO/VOC): { xmin, ymin, xmax, ymax }
 * - YOLO format: { x, y, w, h } normalized to 0-1
 */

export type BoxFormat = "center" | "corners" | "yolo";

export interface CenterBox {
  x: number;       // Center X
  y: number;       // Center Y
  width: number;   // Width
  height: number;  // Height
  class?: string;
  confidence?: number;
}

export interface CornerBox {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
  class?: string;
  confidence?: number;
}

export interface YoloBox {
  x: number;       // Normalized center X (0-1)
  y: number;       // Normalized center Y (0-1)
  w: number;       // Normalized width (0-1)
  h: number;       // Normalized height (0-1)
  class?: string;
  confidence?: number;
}

export type AnyBox = CenterBox | CornerBox | YoloBox;

/**
 * Detect box format based on properties
 */
export function detectBoxFormat(box: any): BoxFormat {
  if ("xmin" in box && "ymin" in box && "xmax" in box && "ymax" in box) {
    return "corners";
  }
  
  if ("w" in box && "h" in box) {
    // Check if normalized (YOLO format)
    if (box.x <= 1 && box.y <= 1 && box.w <= 1 && box.h <= 1) {
      return "yolo";
    }
  }
  
  return "center";
}

/**
 * Convert corner format to center format
 */
export function cornerToCenter(box: CornerBox): CenterBox {
  return {
    x: (box.xmin + box.xmax) / 2,
    y: (box.ymin + box.ymax) / 2,
    width: box.xmax - box.xmin,
    height: box.ymax - box.ymin,
    class: box.class,
    confidence: box.confidence,
  };
}

/**
 * Convert center format to corner format
 */
export function centerToCorner(box: CenterBox): CornerBox {
  const halfWidth = box.width / 2;
  const halfHeight = box.height / 2;
  
  return {
    xmin: box.x - halfWidth,
    ymin: box.y - halfHeight,
    xmax: box.x + halfWidth,
    ymax: box.y + halfHeight,
    class: box.class,
    confidence: box.confidence,
  };
}

/**
 * Convert YOLO format to center format
 */
export function yoloToCenter(box: YoloBox, imageWidth: number, imageHeight: number): CenterBox {
  return {
    x: box.x * imageWidth,
    y: box.y * imageHeight,
    width: box.w * imageWidth,
    height: box.h * imageHeight,
    class: box.class,
    confidence: box.confidence,
  };
}

/**
 * Convert center format to YOLO format
 */
export function centerToYolo(box: CenterBox, imageWidth: number, imageHeight: number): YoloBox {
  return {
    x: box.x / imageWidth,
    y: box.y / imageHeight,
    w: box.width / imageWidth,
    h: box.height / imageHeight,
    class: box.class,
    confidence: box.confidence,
  };
}

/**
 * Normalize any box format to center format (standard for metrics calculation)
 * This is the main function to use before comparing predictions with ground truth
 */
export function normalizeToCenter(
  box: any,
  imageWidth?: number,
  imageHeight?: number
): CenterBox {
  const format = detectBoxFormat(box);
  
  switch (format) {
    case "corners":
      return cornerToCenter(box as CornerBox);
    
    case "yolo":
      if (!imageWidth || !imageHeight) {
        throw new Error("Image dimensions required for YOLO format conversion");
      }
      return yoloToCenter(box as YoloBox, imageWidth, imageHeight);
    
    case "center":
    default:
      return {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        class: box.class,
        confidence: box.confidence,
      };
  }
}

/**
 * Normalize array of boxes
 */
export function normalizeBoxes(
  boxes: any[],
  imageWidth?: number,
  imageHeight?: number
): CenterBox[] {
  return boxes.map((box) => normalizeToCenter(box, imageWidth, imageHeight));
}

/**
 * Get bounding box coordinates for drawing (returns corners)
 */
export function getDrawingCoords(box: CenterBox): { x: number; y: number; width: number; height: number } {
  return {
    x: box.x - box.width / 2,
    y: box.y - box.height / 2,
    width: box.width,
    height: box.height,
  };
}

/**
 * Calculate area of a box
 */
export function calculateBoxArea(box: CenterBox): number {
  return box.width * box.height;
}

/**
 * Check if box coordinates are valid
 */
export function isValidBox(box: CenterBox): boolean {
  return (
    typeof box.x === "number" &&
    typeof box.y === "number" &&
    typeof box.width === "number" &&
    typeof box.height === "number" &&
    box.width > 0 &&
    box.height > 0 &&
    !isNaN(box.x) &&
    !isNaN(box.y) &&
    !isNaN(box.width) &&
    !isNaN(box.height)
  );
}

/**
 * Clamp box coordinates to image boundaries
 */
export function clampBoxToImage(
  box: CenterBox,
  imageWidth: number,
  imageHeight: number
): CenterBox {
  const corners = centerToCorner(box);
  
  const clampedCorners: CornerBox = {
    xmin: Math.max(0, Math.min(corners.xmin, imageWidth)),
    ymin: Math.max(0, Math.min(corners.ymin, imageHeight)),
    xmax: Math.max(0, Math.min(corners.xmax, imageWidth)),
    ymax: Math.max(0, Math.min(corners.ymax, imageHeight)),
    class: box.class,
    confidence: box.confidence,
  };
  
  return cornerToCenter(clampedCorners);
}
