/**
 * Object Detection Metrics Calculation Library
 * Implements IoU, precision, recall, F1, mAP calculations
 */

export interface BoundingBox {
  x: number; // center x
  y: number; // center y
  width: number;
  height: number;
  class: string;
  confidence?: number;
}

export interface GroundTruthBox {
  x: number;
  y: number;
  width: number;
  height: number;
  class: string;
}

export interface MatchedPrediction {
  prediction: BoundingBox;
  groundTruth: GroundTruthBox | null;
  iou: number;
  isCorrect: boolean;
}

export interface ClassMetrics {
  className: string;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  averageIoU: number;
  sampleCount: number;
}

export interface OverallMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  mAP: number;
  totalPredictions: number;
  totalGroundTruths: number;
  classMetrics: ClassMetrics[];
  confusionMatrix: number[][];
  classNames: string[];
}

/**
 * Calculate Intersection over Union (IoU) between two bounding boxes
 */
export function calculateIoU(box1: BoundingBox | GroundTruthBox, box2: BoundingBox | GroundTruthBox): number {
  // Convert from center coordinates to corner coordinates
  const box1X1 = box1.x - box1.width / 2;
  const box1Y1 = box1.y - box1.height / 2;
  const box1X2 = box1.x + box1.width / 2;
  const box1Y2 = box1.y + box1.height / 2;

  const box2X1 = box2.x - box2.width / 2;
  const box2Y1 = box2.y - box2.height / 2;
  const box2X2 = box2.x + box2.width / 2;
  const box2Y2 = box2.y + box2.height / 2;

  // Calculate intersection area
  const intersectionX1 = Math.max(box1X1, box2X1);
  const intersectionY1 = Math.max(box1Y1, box2Y1);
  const intersectionX2 = Math.min(box1X2, box2X2);
  const intersectionY2 = Math.min(box1Y2, box2Y2);

  const intersectionWidth = Math.max(0, intersectionX2 - intersectionX1);
  const intersectionHeight = Math.max(0, intersectionY2 - intersectionY1);
  const intersectionArea = intersectionWidth * intersectionHeight;

  // Calculate union area
  const box1Area = box1.width * box1.height;
  const box2Area = box2.width * box2.height;
  const unionArea = box1Area + box2Area - intersectionArea;

  // Avoid division by zero
  if (unionArea === 0) return 0;

  const iou = intersectionArea / unionArea;
  
  // Log extreme cases for debugging
  if (iou > 0 && iou < 0.01) {
    console.log('⚠️ Very low IoU detected:', iou);
    console.log('Box1 bounds:', { x1: box1X1, y1: box1Y1, x2: box1X2, y2: box1Y2 });
    console.log('Box2 bounds:', { x1: box2X1, y1: box2Y1, x2: box2X2, y2: box2Y2 });
    console.log('Intersection:', { width: intersectionWidth, height: intersectionHeight, area: intersectionArea });
  }

  return iou;
}

/**
 * Match predictions with ground truth boxes using IoU threshold
 */
export function matchPredictions(
  predictions: BoundingBox[],
  groundTruths: GroundTruthBox[],
  iouThreshold: number = 0.5
): MatchedPrediction[] {
  console.log('\n🔍 Starting matchPredictions...');
  console.log('Predictions:', predictions.length);
  console.log('Ground truths:', groundTruths.length);
  console.log('IoU threshold:', iouThreshold);
  
  if (predictions.length > 0) {
    console.log('First prediction:', predictions[0]);
  }
  if (groundTruths.length > 0) {
    console.log('First ground truth:', groundTruths[0]);
  }
  
  const matches: MatchedPrediction[] = [];
  const usedGroundTruths = new Set<number>();

  // Sort predictions by confidence (descending)
  const sortedPredictions = [...predictions].sort(
    (a, b) => (b.confidence || 0) - (a.confidence || 0)
  );

  for (const prediction of sortedPredictions) {
    let bestMatch: GroundTruthBox | null = null;
    let bestIoU = 0;
    let bestIndex = -1;

    // Find best matching ground truth
    for (let i = 0; i < groundTruths.length; i++) {
      if (usedGroundTruths.has(i)) continue;

      const gt = groundTruths[i];
      
      // Check class match first
      if (gt.class !== prediction.class) {
        continue;
      }

      const iou = calculateIoU(prediction, gt);
      
      if (matches.length === 0 && i === 0) {
        console.log(`IoU between first prediction and first GT: ${iou.toFixed(3)}`);
        console.log('Prediction class:', prediction.class);
        console.log('GT class:', gt.class);
        console.log('Classes match:', gt.class === prediction.class);
      }
      
      if (iou > bestIoU) {
        bestIoU = iou;
        bestMatch = gt;
        bestIndex = i;
      }
    }

    // Check if match meets threshold
    const isCorrect = bestIoU >= iouThreshold && bestMatch !== null;
    if (isCorrect && bestIndex >= 0) {
      usedGroundTruths.add(bestIndex);
    }

    matches.push({
      prediction,
      groundTruth: isCorrect ? bestMatch : null,
      iou: bestIoU,
      isCorrect,
    });
  }
  
  const correctMatches = matches.filter(m => m.isCorrect).length;
  console.log(`✅ Matches found: ${correctMatches}/${predictions.length}`);
  console.log(`Unused ground truths: ${groundTruths.length - usedGroundTruths.size}/${groundTruths.length}`);

  return matches;
}

/**
 * Calculate per-class metrics
 */
export function calculateClassMetrics(
  predictions: BoundingBox[],
  groundTruths: GroundTruthBox[],
  className: string,
  iouThreshold: number = 0.5
): ClassMetrics {
  const classPredictions = predictions.filter((p) => p.class === className);
  const classGroundTruths = groundTruths.filter((gt) => gt.class === className);

  const matches = matchPredictions(classPredictions, classGroundTruths, iouThreshold);

  const truePositives = matches.filter((m) => m.isCorrect).length;
  const falsePositives = matches.filter((m) => !m.isCorrect).length;
  const falseNegatives = classGroundTruths.length - truePositives;

  const precision = truePositives + falsePositives > 0 
    ? truePositives / (truePositives + falsePositives) 
    : 0;
  const recall = truePositives + falseNegatives > 0 
    ? truePositives / (truePositives + falseNegatives) 
    : 0;
  const f1Score = precision + recall > 0 
    ? (2 * precision * recall) / (precision + recall) 
    : 0;

  const averageIoU = matches.length > 0
    ? matches.reduce((sum, m) => sum + m.iou, 0) / matches.length
    : 0;

  return {
    className,
    truePositives,
    falsePositives,
    falseNegatives,
    precision,
    recall,
    f1Score,
    averageIoU,
    sampleCount: classGroundTruths.length,
  };
}

/**
 * Build confusion matrix
 */
export function buildConfusionMatrix(
  predictions: BoundingBox[],
  groundTruths: GroundTruthBox[],
  classNames: string[],
  iouThreshold: number = 0.5
): number[][] {
  const n = classNames.length;
  const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  
  const matches = matchPredictions(predictions, groundTruths, iouThreshold);
  
  for (const match of matches) {
    if (match.isCorrect && match.groundTruth) {
      const actualIdx = classNames.indexOf(match.groundTruth.class);
      const predictedIdx = classNames.indexOf(match.prediction.class);
      if (actualIdx >= 0 && predictedIdx >= 0) {
        matrix[actualIdx][predictedIdx]++;
      }
    }
  }

  // Add false negatives (missed detections)
  const matchedGTs = new Set(matches.filter(m => m.isCorrect).map(m => m.groundTruth));
  for (const gt of groundTruths) {
    if (!matchedGTs.has(gt)) {
      const actualIdx = classNames.indexOf(gt.class);
      if (actualIdx >= 0) {
        // Missed detection - increment missed count (could add as separate tracking)
      }
    }
  }

  return matrix;
}

/**
 * Calculate overall metrics across all classes
 */
export function calculateOverallMetrics(
  predictions: BoundingBox[],
  groundTruths: GroundTruthBox[],
  iouThreshold: number = 0.5
): OverallMetrics {
  // Get unique class names
  const predictionClasses = new Set(predictions.map((p) => p.class));
  const groundTruthClasses = new Set(groundTruths.map((gt) => gt.class));
  const classNames = Array.from(new Set([...predictionClasses, ...groundTruthClasses]));

  // Calculate per-class metrics
  const classMetrics: ClassMetrics[] = classNames.map((className) =>
    calculateClassMetrics(predictions, groundTruths, className, iouThreshold)
  );

  // Calculate overall metrics (macro-average)
  const totalTP = classMetrics.reduce((sum, cm) => sum + cm.truePositives, 0);
  const totalFP = classMetrics.reduce((sum, cm) => sum + cm.falsePositives, 0);
  const totalFN = classMetrics.reduce((sum, cm) => sum + cm.falseNegatives, 0);

  const precision = totalTP + totalFP > 0 ? totalTP / (totalTP + totalFP) : 0;
  const recall = totalTP + totalFN > 0 ? totalTP / (totalTP + totalFN) : 0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  // Calculate mAP (mean Average Precision)
  const mAP = classMetrics.length > 0
    ? classMetrics.reduce((sum, cm) => sum + cm.precision, 0) / classMetrics.length
    : 0;

  // Build confusion matrix
  const confusionMatrix = buildConfusionMatrix(predictions, groundTruths, classNames, iouThreshold);

  return {
    precision,
    recall,
    f1Score,
    mAP,
    totalPredictions: predictions.length,
    totalGroundTruths: groundTruths.length,
    classMetrics,
    confusionMatrix,
    classNames,
  };
}

/**
 * Calculate metrics at different confidence thresholds
 */
export function calculateMetricsAtThresholds(
  predictions: BoundingBox[],
  groundTruths: GroundTruthBox[],
  thresholds: number[] = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
  iouThreshold: number = 0.5
): Array<{ threshold: number; precision: number; recall: number; f1Score: number }> {
  return thresholds.map((threshold) => {
    const filteredPredictions = predictions.filter((p) => (p.confidence || 0) >= threshold);
    const metrics = calculateOverallMetrics(filteredPredictions, groundTruths, iouThreshold);
    
    return {
      threshold,
      precision: metrics.precision,
      recall: metrics.recall,
      f1Score: metrics.f1Score,
    };
  });
}

/**
 * Find optimal confidence threshold (highest F1 score)
 */
export function findOptimalThreshold(
  predictions: BoundingBox[],
  groundTruths: GroundTruthBox[],
  iouThreshold: number = 0.5
): { threshold: number; f1Score: number } {
  const thresholdMetrics = calculateMetricsAtThresholds(predictions, groundTruths, undefined, iouThreshold);
  
  let bestThreshold = 0.5;
  let bestF1 = 0;

  for (const { threshold, f1Score } of thresholdMetrics) {
    if (f1Score > bestF1) {
      bestF1 = f1Score;
      bestThreshold = threshold;
    }
  }

  return { threshold: bestThreshold, f1Score: bestF1 };
}
