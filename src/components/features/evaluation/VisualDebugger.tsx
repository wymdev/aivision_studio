/**
 * Visual Debugger Component
 * Shows side-by-side comparison of Ground Truth vs Predictions
 * Critical for understanding WHY the model failed
 * 
 * Features:
 * - Manual image sliding with keyboard navigation
 * - Per-class and per-detection toggle controls
 * - Zoom functionality with mouse wheel support
 * - Polygon drawing for detections
 * - Fullscreen modal view
 */

"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Grid3X3,
  Maximize2,
  X,
  RotateCcw,
  Image as ImageIcon,
  Search,
} from "lucide-react";
import { BoundingBox, GroundTruthBox, calculateIoU } from "@/lib/metrics";
import { getDrawingCoords, CenterBox } from "@/lib/coordinate-utils";

interface VisualDebuggerProps {
  imageUrls: string[];
  imageNames?: string[];
  predictions: BoundingBox[][];
  groundTruths: GroundTruthBox[][];
  iouThreshold: number;
  confidenceThreshold: number;
}

interface MatchResult {
  prediction: BoundingBox;
  predIndex: number;
  groundTruth: GroundTruthBox | null;
  gtIndex: number | null;
  iou: number;
  isTP: boolean;
  isFP: boolean;
}

// Roboflow-style high-saturation bright color palette for classes
const CLASS_COLORS = [
  "#FF3838", "#FF9D97", "#FF701F", "#FFB21D", "#CFD231", 
  "#48F90A", "#92CC17", "#3DDB86", "#1A9334", "#00D4BB",
  "#2C99A8", "#00C2FF", "#344593", "#6473FF", "#0018EC",
  "#8438FF", "#520085", "#CB38FF", "#FF95C8", "#FF37C7"
];

// Colors for visualization
const GT_COLOR = "#22c55e"; // Green for ground truth
const PRED_TP_COLOR = "#3b82f6"; // Blue for true positive predictions
const PRED_FP_COLOR = "#ef4444"; // Red for false positive predictions
const FN_COLOR = "#f97316"; // Orange for false negatives

export function VisualDebugger({
  imageUrls,
  imageNames = [],
  predictions,
  groundTruths,
  iouThreshold,
  confidenceThreshold,
}: VisualDebuggerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showGT, setShowGT] = useState(true);
  const [showPredictions, setShowPredictions] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showIoU, setShowIoU] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Per-detection visibility (like app/page.tsx)
  const [predictionVisibility, setPredictionVisibility] = useState<Record<number, boolean>>({});
  const [gtVisibility, setGtVisibility] = useState<Record<number, boolean>>({});

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Current image data
  const currentPreds = predictions[selectedIndex] || [];
  const currentGTs = groundTruths[selectedIndex] || [];
  
  // Filter predictions by confidence
  const filteredPreds = useMemo(() => 
    currentPreds.filter((p) => (p.confidence || 0) >= confidenceThreshold),
    [currentPreds, confidenceThreshold]
  );

  // Get unique class names and assign colors
  const classColors = useMemo(() => {
    const allClasses = new Set<string>();
    predictions.flat().forEach(p => allClasses.add(p.class));
    groundTruths.flat().forEach(gt => allClasses.add(gt.class));
    
    const colors: Record<string, string> = {};
    Array.from(allClasses).forEach((className, idx) => {
      colors[className] = CLASS_COLORS[idx % CLASS_COLORS.length];
    });
    return colors;
  }, [predictions, groundTruths]);

  // Class statistics for current image
  const classStats = useMemo(() => {
    const stats: Record<string, { predictions: number; groundTruths: number }> = {};
    
    filteredPreds.forEach(pred => {
      if (!stats[pred.class]) stats[pred.class] = { predictions: 0, groundTruths: 0 };
      stats[pred.class].predictions++;
    });
    
    currentGTs.forEach(gt => {
      if (!stats[gt.class]) stats[gt.class] = { predictions: 0, groundTruths: 0 };
      stats[gt.class].groundTruths++;
    });
    
    return stats;
  }, [filteredPreds, currentGTs]);

  // Initialize visibility when image changes
  useEffect(() => {
    const predVis: Record<number, boolean> = {};
    const gtVis: Record<number, boolean> = {};
    
    filteredPreds.forEach((_, idx) => { predVis[idx] = true; });
    currentGTs.forEach((_, idx) => { gtVis[idx] = true; });
    
    setPredictionVisibility(predVis);
    setGtVisibility(gtVis);
  }, [selectedIndex, filteredPreds.length, currentGTs.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && selectedIndex > 0) {
        setSelectedIndex(prev => prev - 1);
      } else if (e.key === "ArrowRight" && selectedIndex < imageUrls.length - 1) {
        setSelectedIndex(prev => prev + 1);
      } else if (e.key === "+" || e.key === "=") {
        setZoom(prev => Math.min(300, prev + 25));
      } else if (e.key === "-") {
        setZoom(prev => Math.max(25, prev - 25));
      } else if (e.key === "0") {
        setZoom(100);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, imageUrls.length]);

  /**
   * Calculate matches between predictions and ground truths
   */
  const calculateMatches = useCallback(
    (preds: BoundingBox[], gts: GroundTruthBox[]): MatchResult[] => {
      const results: MatchResult[] = [];
      const matchedGTs = new Set<number>();

      // Filter predictions by confidence
      const filteredPreds = preds.filter(
        (p) => (p.confidence || 0) >= confidenceThreshold
      );

      for (let predIdx = 0; predIdx < filteredPreds.length; predIdx++) {
        const pred = filteredPreds[predIdx];
        let bestMatch: { gt: GroundTruthBox; iou: number; index: number } | null = null;

        for (let i = 0; i < gts.length; i++) {
          if (matchedGTs.has(i)) continue;
          if (pred.class !== gts[i].class) continue;

          const iou = calculateIoU(pred, gts[i]);
          if (iou >= iouThreshold && (!bestMatch || iou > bestMatch.iou)) {
            bestMatch = { gt: gts[i], iou, index: i };
          }
        }

        if (bestMatch) {
          matchedGTs.add(bestMatch.index);
          results.push({
            prediction: pred,
            predIndex: predIdx,
            groundTruth: bestMatch.gt,
            gtIndex: bestMatch.index,
            iou: bestMatch.iou,
            isTP: true,
            isFP: false,
          });
        } else {
          results.push({
            prediction: pred,
            predIndex: predIdx,
            groundTruth: null,
            gtIndex: null,
            iou: 0,
            isTP: false,
            isFP: true,
          });
        }
      }

      return results;
    },
    [confidenceThreshold, iouThreshold]
  );

  /**
   * Convert hex to rgba
   */
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  /**
   * Draw boxes on canvas with polygon support
   */
  const drawVisualization = useCallback(
    (canvas: HTMLCanvasElement, img: HTMLImageElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas size
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Draw image
      ctx.drawImage(img, 0, 0);

      const matches = calculateMatches(filteredPreds, currentGTs);

      // Track matched GT indices
      const matchedGTIndices = new Set<number>();
      matches.forEach((m) => {
        if (m.gtIndex !== null) {
          matchedGTIndices.add(m.gtIndex);
        }
      });

      // Draw Ground Truths (solid lines)
      if (showGT) {
        currentGTs.forEach((gt, idx) => {
          if (gtVisibility[idx] === false) return;
          
          const isMatched = matchedGTIndices.has(idx);
          const color = isMatched ? GT_COLOR : FN_COLOR;
          const label = showLabels ? `GT: ${gt.class}` : "";
          
          drawBoxOrPolygon(ctx, gt, color, label, false);
        });
      }

      // Draw Predictions (dashed lines)
      if (showPredictions) {
        matches.forEach((match, idx) => {
          if (predictionVisibility[idx] === false) return;
          
          const color = match.isTP ? PRED_TP_COLOR : PRED_FP_COLOR;
          const label = showLabels 
            ? (showIoU && match.isTP
                ? `${match.prediction.class} (IoU: ${(match.iou * 100).toFixed(0)}%)`
                : `${match.prediction.class} ${((match.prediction.confidence || 0) * 100).toFixed(0)}%`)
            : "";
          
          drawBoxOrPolygon(ctx, match.prediction, color, label, true);
        });
      }
    },
    [filteredPreds, currentGTs, showGT, showPredictions, showLabels, showIoU, 
     calculateMatches, predictionVisibility, gtVisibility]
  );

  /**
   * Draw a bounding box or polygon with label
   */
  const drawBoxOrPolygon = (
    ctx: CanvasRenderingContext2D,
    box: BoundingBox | GroundTruthBox,
    color: string,
    label: string,
    dashed: boolean = false
  ) => {
    // Check if box has polygon points
    const boxWithPoints = box as BoundingBox & { points?: Array<{x: number, y: number}> };
    
    if (boxWithPoints.points && boxWithPoints.points.length >= 3) {
      drawPolygon(ctx, boxWithPoints.points, color, label, dashed);
    } else {
      drawRectangle(ctx, box, color, label, dashed);
    }
  };

  /**
   * Draw a polygon shape
   */
  const drawPolygon = (
    ctx: CanvasRenderingContext2D,
    points: Array<{x: number, y: number}>,
    color: string,
    label: string,
    dashed: boolean = false
  ) => {
    if (!points || points.length < 3) return;

    ctx.beginPath();
    points.forEach((pt, index) => {
      if (index === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();

    // Fill with transparency
    ctx.fillStyle = hexToRgba(color, 0.3);
    ctx.fill();

    // Outline
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (dashed) {
      ctx.setLineDash([5, 5]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw label at top-left of polygon
    if (label) {
      const minY = Math.min(...points.map(p => p.y));
      const minX = Math.min(...points.map(p => p.x));
      drawLabel(ctx, minX, minY, label, color);
    }
  };

  /**
   * Draw a rectangle bounding box
   */
  const drawRectangle = (
    ctx: CanvasRenderingContext2D,
    box: BoundingBox | GroundTruthBox,
    color: string,
    label: string,
    dashed: boolean = false
  ) => {
    const coords = getDrawingCoords(box as CenterBox);

    // Fill with transparency
    ctx.fillStyle = hexToRgba(color, 0.2);
    ctx.fillRect(coords.x, coords.y, coords.width, coords.height);

    // Outline
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (dashed) {
      ctx.setLineDash([5, 5]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.strokeRect(coords.x, coords.y, coords.width, coords.height);
    ctx.setLineDash([]);

    // Draw label
    if (label) {
      drawLabel(ctx, coords.x, coords.y, label, color);
    }
  };

  /**
   * Draw a label above a box
   */
  const drawLabel = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    color: string
  ) => {
    ctx.font = "bold 12px Arial";
    const textMetrics = ctx.measureText(text);
    const padding = 4;
    const labelHeight = 18;

    // Background
    ctx.fillStyle = color;
    ctx.fillRect(
      x,
      y - labelHeight,
      textMetrics.width + padding * 2,
      labelHeight
    );

    // Text
    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + padding, y - labelHeight / 2);
  };

  // Toggle functions
  const togglePrediction = (index: number) => {
    setPredictionVisibility(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleGT = (index: number) => {
    setGtVisibility(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleAllPredictions = (visible: boolean) => {
    const newVis: Record<number, boolean> = {};
    filteredPreds.forEach((_, idx) => { newVis[idx] = visible; });
    setPredictionVisibility(newVis);
  };

  const toggleAllGTs = (visible: boolean) => {
    const newVis: Record<number, boolean> = {};
    currentGTs.forEach((_, idx) => { newVis[idx] = visible; });
    setGtVisibility(newVis);
  };

  const toggleClassPredictions = (className: string, visible: boolean) => {
    const newVis = { ...predictionVisibility };
    filteredPreds.forEach((pred, idx) => {
      if (pred.class === className) {
        newVis[idx] = visible;
      }
    });
    setPredictionVisibility(newVis);
  };

  const toggleClassGTs = (className: string, visible: boolean) => {
    const newVis = { ...gtVisibility };
    currentGTs.forEach((gt, idx) => {
      if (gt.class === className) {
        newVis[idx] = visible;
      }
    });
    setGtVisibility(newVis);
  };

  // Redraw when dependencies change
  useEffect(() => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    
    if (!img || !canvas || !imageUrls[selectedIndex]) return;

    img.onload = () => drawVisualization(canvas, img);
    img.src = imageUrls[selectedIndex];

    if (img.complete) {
      drawVisualization(canvas, img);
    }
  }, [selectedIndex, imageUrls, drawVisualization]);

  // Draw modal canvas when open
  useEffect(() => {
    if (!isModalOpen) return;

    const img = new Image();
    img.onload = () => {
      const canvas = modalCanvasRef.current;
      if (canvas) drawVisualization(canvas, img);
    };
    img.src = imageUrls[selectedIndex];
  }, [isModalOpen, selectedIndex, imageUrls, drawVisualization]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      setZoom(prev => Math.max(25, Math.min(300, prev + delta)));
    }
  }, []);

  // Get stats for current image
  const matches = calculateMatches(filteredPreds, currentGTs);
  const tpCount = matches.filter((m) => m.isTP).length;
  const fpCount = matches.filter((m) => m.isFP).length;
  const fnCount = currentGTs.length - tpCount;

  // Filter detections by search term
  const filteredMatches = searchTerm 
    ? matches.filter(m => m.prediction.class.toLowerCase().includes(searchTerm.toLowerCase()))
    : matches;

  const filteredGTsForList = searchTerm
    ? currentGTs.filter(gt => gt.class.toLowerCase().includes(searchTerm.toLowerCase()))
    : currentGTs;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Grid3X3 className="w-4 h-4" />
          Visual Debugger
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            GT: {currentGTs.length}
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            TP: {tpCount}
          </Badge>
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            FP: {fpCount}
          </Badge>
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            FN: {fnCount}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Panel - Toggle Controls */}
        <div className="lg:col-span-3">
          <div className="space-y-4">
            {/* View Controls */}
            <div className="p-3 bg-gray-50 rounded-lg space-y-3">
              <h4 className="text-xs font-semibold text-gray-700">View Controls</h4>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="showGT"
                    checked={showGT}
                    onCheckedChange={(checked) => setShowGT(!!checked)}
                  />
                  <Label htmlFor="showGT" className="text-xs flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: GT_COLOR }} />
                    Ground Truth
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="showPreds"
                    checked={showPredictions}
                    onCheckedChange={(checked) => setShowPredictions(!!checked)}
                  />
                  <Label htmlFor="showPreds" className="text-xs flex items-center gap-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: PRED_TP_COLOR }} />
                    Predictions
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="showLabels"
                    checked={showLabels}
                    onCheckedChange={(checked) => setShowLabels(!!checked)}
                  />
                  <Label htmlFor="showLabels" className="text-xs">Labels</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="showIoU"
                    checked={showIoU}
                    onCheckedChange={(checked) => setShowIoU(!!checked)}
                  />
                  <Label htmlFor="showIoU" className="text-xs">Show IoU</Label>
                </div>
              </div>
            </div>

            {/* Quick Toggle Buttons */}
            <div className="space-y-2">
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { toggleAllPredictions(true); toggleAllGTs(true); }}
                  className="flex-1 h-7 text-xs gap-1"
                >
                  <Eye className="w-3 h-3" />
                  All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { toggleAllPredictions(false); toggleAllGTs(false); }}
                  className="flex-1 h-7 text-xs gap-1"
                >
                  <EyeOff className="w-3 h-3" />
                  None
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
              <Input
                placeholder="Search class..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-7 text-xs pl-7"
              />
            </div>

            {/* Per-Class Toggles */}
            <ScrollArea className="h-[300px]">
              <div className="space-y-3 pr-2">
                {Object.entries(classStats).map(([className, stats]) => {
                  const color = classColors[className];
                  const classPreds = filteredPreds
                    .map((pred, idx) => ({ pred, idx }))
                    .filter(({ pred }) => pred.class === className);
                  const classGTs = currentGTs
                    .map((gt, idx) => ({ gt, idx }))
                    .filter(({ gt }) => gt.class === className);

                  if (searchTerm && !className.toLowerCase().includes(searchTerm.toLowerCase())) {
                    return null;
                  }

                  return (
                    <div key={className} className="border rounded-lg p-2 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <div 
                            className="w-3 h-3 rounded" 
                            style={{ backgroundColor: color }} 
                          />
                          <span className="text-xs font-medium">{className}</span>
                        </div>
                        <span className="text-[10px] text-gray-500">
                          P:{stats.predictions} GT:{stats.groundTruths}
                        </span>
                      </div>

                      {/* Ground Truth toggles */}
                      {classGTs.length > 0 && (
                        <div className="mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-gray-500">Ground Truth</span>
                            <div className="flex gap-0.5">
                              <button
                                onClick={() => toggleClassGTs(className, true)}
                                className="px-1 py-0.5 text-[10px] bg-gray-100 hover:bg-gray-200 rounded"
                              >
                                All
                              </button>
                              <button
                                onClick={() => toggleClassGTs(className, false)}
                                className="px-1 py-0.5 text-[10px] bg-gray-100 hover:bg-gray-200 rounded"
                              >
                                None
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {classGTs.map(({ gt, idx }, i) => (
                              <button
                                key={`gt-${idx}`}
                                onClick={() => toggleGT(idx)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all ${
                                  gtVisibility[idx] !== false
                                    ? "text-white"
                                    : "bg-gray-200 text-gray-500"
                                }`}
                                style={{
                                  backgroundColor: gtVisibility[idx] !== false ? GT_COLOR : undefined,
                                }}
                                title={`GT #${i + 1}`}
                              >
                                GT{i + 1}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Prediction toggles */}
                      {classPreds.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-gray-500">Predictions</span>
                            <div className="flex gap-0.5">
                              <button
                                onClick={() => toggleClassPredictions(className, true)}
                                className="px-1 py-0.5 text-[10px] bg-gray-100 hover:bg-gray-200 rounded"
                              >
                                All
                              </button>
                              <button
                                onClick={() => toggleClassPredictions(className, false)}
                                className="px-1 py-0.5 text-[10px] bg-gray-100 hover:bg-gray-200 rounded"
                              >
                                None
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {classPreds.map(({ pred, idx }, i) => {
                              const match = matches.find(m => m.predIndex === idx);
                              const boxColor = match?.isTP ? PRED_TP_COLOR : PRED_FP_COLOR;
                              
                              return (
                                <button
                                  key={`pred-${idx}`}
                                  onClick={() => togglePrediction(idx)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all ${
                                    predictionVisibility[idx] !== false
                                      ? "text-white"
                                      : "bg-gray-200 text-gray-500"
                                  }`}
                                  style={{
                                    backgroundColor: predictionVisibility[idx] !== false ? boxColor : undefined,
                                  }}
                                  title={`${pred.class} #${i + 1} (${((pred.confidence || 0) * 100).toFixed(0)}%)`}
                                >
                                  P{i + 1} {((pred.confidence || 0) * 100).toFixed(0)}%
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Middle Panel - Image Display */}
        <div className="lg:col-span-9">
          {/* Zoom & Navigation Controls */}
          <div className="flex items-center justify-between mb-3 p-3 bg-gray-50 rounded-lg">
            {/* Image Navigation */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
                disabled={selectedIndex === 0}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-sm min-w-[100px] text-center">
                <span className="font-medium">{selectedIndex + 1}</span>
                <span className="text-gray-500"> / {imageUrls.length}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedIndex(Math.min(imageUrls.length - 1, selectedIndex + 1))}
                disabled={selectedIndex === imageUrls.length - 1}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* File Name */}
            {imageNames[selectedIndex] && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 max-w-[200px] truncate">
                <ImageIcon className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{imageNames[selectedIndex]}</span>
              </div>
            )}

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setZoom(Math.max(25, zoom - 25))}
                className="h-7 w-7 p-0"
              >
                <ZoomOut className="w-3 h-3" />
              </Button>
              <span className="text-xs w-12 text-center font-medium">{zoom}%</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setZoom(Math.min(300, zoom + 25))}
                className="h-7 w-7 p-0"
              >
                <ZoomIn className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setZoom(100)}
                className="h-7 w-7 p-0 ml-1"
                title="Reset zoom"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsModalOpen(true)}
                className="h-7 w-7 p-0 ml-1"
                title="Fullscreen"
              >
                <Maximize2 className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Canvas Display */}
          <div
            ref={containerRef}
            className="border rounded-lg overflow-auto bg-gray-100 cursor-grab active:cursor-grabbing"
            style={{ maxHeight: "500px" }}
            onWheel={handleWheel}
          >
            <canvas
              ref={canvasRef}
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top left",
              }}
            />
            <img ref={imageRef} className="hidden" alt="Reference" />
          </div>

          {/* Thumbnail Strip */}
          <ScrollArea className="mt-4">
            <div className="flex gap-2 pb-2">
              {imageUrls.map((url, idx) => {
                const imgPreds = predictions[idx] || [];
                const imgGTs = groundTruths[idx] || [];
                const imgMatches = calculateMatches(
                  imgPreds.filter(p => (p.confidence || 0) >= confidenceThreshold),
                  imgGTs
                );
                const imgTP = imgMatches.filter(m => m.isTP).length;
                const imgFP = imgMatches.filter(m => m.isFP).length;
                const imgFN = imgGTs.length - imgTP;
                const hasErrors = imgFP > 0 || imgFN > 0;
                
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedIndex(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded border-2 overflow-hidden transition-all relative group ${
                      idx === selectedIndex
                        ? "border-blue-500 ring-2 ring-blue-200"
                        : hasErrors
                        ? "border-orange-300 hover:border-orange-400"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {/* Stats overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] px-1 py-0.5 flex justify-center gap-1">
                      <span className="text-green-400">{imgTP}</span>
                      <span>/</span>
                      <span className="text-red-400">{imgFP}</span>
                      <span>/</span>
                      <span className="text-orange-400">{imgFN}</span>
                    </div>
                    {/* Index badge */}
                    <div className="absolute top-0 left-0 bg-black/60 text-white text-[9px] px-1 rounded-br">
                      {idx + 1}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Legend */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium mb-2">Legend:</p>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 border-2 rounded" style={{ borderColor: GT_COLOR, backgroundColor: hexToRgba(GT_COLOR, 0.2) }} />
                Ground Truth (Solid)
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 border-2 border-dashed rounded" style={{ borderColor: PRED_TP_COLOR, backgroundColor: hexToRgba(PRED_TP_COLOR, 0.2) }} />
                True Positive (Dashed Blue)
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 border-2 border-dashed rounded" style={{ borderColor: PRED_FP_COLOR, backgroundColor: hexToRgba(PRED_FP_COLOR, 0.2) }} />
                False Positive (Dashed Red)
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 border-2 rounded" style={{ borderColor: FN_COLOR, backgroundColor: hexToRgba(FN_COLOR, 0.2) }} />
                False Negative (Orange)
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-2">
              Tip: Use ←/→ keys to navigate, +/- to zoom, Ctrl+scroll for zoom
            </p>
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>
                Image {selectedIndex + 1} / {imageUrls.length}
                {imageNames[selectedIndex] && ` - ${imageNames[selectedIndex]}`}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
                  disabled={selectedIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedIndex(Math.min(imageUrls.length - 1, selectedIndex + 1))}
                  disabled={selectedIndex === imageUrls.length - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto">
            <canvas ref={modalCanvasRef} className="max-w-full" />
          </div>
          <div className="flex justify-center gap-4 pt-2 border-t">
            <Badge variant="outline" className="bg-green-50 text-green-700">TP: {tpCount}</Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700">FP: {fpCount}</Badge>
            <Badge variant="outline" className="bg-orange-50 text-orange-700">FN: {fnCount}</Badge>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
