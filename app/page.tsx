"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Upload, Sparkles, Image as ImageIcon, X, Eye, EyeOff, Zap, Target, ChevronLeft, ChevronRight, Code, ChevronDown, ChevronUp } from "lucide-react";
import { backendService } from "@/services/backend.service";
import {
  AiCountingData,
} from "@/types/backend.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function HomePage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AiCountingData[] | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [boxVisibility, setBoxVisibility] = useState<Record<string, boolean>>({});
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [controlsExpanded, setControlsExpanded] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (files.length > 0) {
      processImages(files);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      processImages(files);
    }
  };

  const processImages = (files: File[]) => {
    setImageFiles(files);
    setSelectedIndex(0);
    setSelectedIndex(0);
    setResults(null);
    setExecutionTime(null);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(files[0]);
  };

  const copyFullJSON = () => {
    if (results && results[selectedIndex]) {
      navigator.clipboard.writeText(JSON.stringify(results[selectedIndex], null, 2));
    }
  };

  const copyPredictionsJSON = () => {
    if (results && results[selectedIndex]) {
      const preds = results[selectedIndex].roboflow_predictions || [];
      navigator.clipboard.writeText(JSON.stringify(preds, null, 2));
    }
  };

  useEffect(() => {
    if (imageFiles.length > 0 && imageFiles[selectedIndex]) {
      const file = imageFiles[selectedIndex];
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [selectedIndex, imageFiles]);

  const analyzeImage = async () => {
    if (imageFiles.length === 0) return;

    setIsLoading(true);
    setError(null);
    setExecutionTime(null);

    const startTime = performance.now();

    try {
      const response = await backendService.detectObjects(imageFiles);
      const endTime = performance.now();
      setExecutionTime(endTime - startTime);

      const newResults = Array.isArray(response) ? response : [response];

      const newVisibility: Record<string, boolean> = {};
      newResults.forEach((res, resIdx) => {
        if (res.roboflow_predictions) {
          res.roboflow_predictions.forEach((_, idx) => {
            newVisibility[`${resIdx}-${idx}`] = true;
          });
        }
      });
      setBoxVisibility(newVisibility);

      setResults(newResults);
      setSelectedIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze images");
    } finally {
      setIsLoading(false);
    }
  };

  const onImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    setImageDimensions({ width: naturalWidth, height: naturalHeight });
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImageFiles([]);
    setResults(null);
    setError(null);
    setExecutionTime(null);
    setZoom(100);
    setSelectedIndex(0);
  };

  const toggleBox = (resIdx: number, boxIdx: number) => {
    const key = `${resIdx}-${boxIdx}`;
    setBoxVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleGroup = (resIdx: number, items: number[], visible: boolean) => {
    setBoxVisibility(prev => {
      const next = { ...prev };
      items.forEach(idx => {
        next[`${resIdx}-${idx}`] = visible;
      });
      return next;
    });
  };

  const toggleAllBoxes = (visible: boolean) => {
    setBoxVisibility(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => next[k] = visible);
      return next;
    });
  };

  const currentResult = results ? results[selectedIndex] : null;

  const countKeys = [
    "packaging_count",
    "boxes_in_packaging",
    "pallet_count",
    "boxes_in_pallet",
    "layer_count",
    "boxes_in_layers",
    "separated_boxes",
    "total_boxes"
  ];

  const getColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-75"></div>
                <div className="relative p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AI Vision Studio
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Professional Object Detection</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {imageFiles.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearImage}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 3-Column Layout */}
      <main className="h-[calc(100vh-73px)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 h-full">
          {/* LEFT COLUMN - Upload & Actions */}
          <div className="lg:col-span-3 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {/* Upload Section */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-600" />
                    Upload Images
                  </h3>
                  <div
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                      Drop images here
                    </p>
                    <p className="text-[10px] text-slate-500">or click to browse</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* File List */}
                {imageFiles.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Files ({imageFiles.length})</h3>
                    <div className="space-y-1">
                      {imageFiles.map((f, i) => (
                        <button
                          key={i}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs truncate transition-colors ${i === selectedIndex
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                            : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          onClick={() => setSelectedIndex(i)}
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {/* Execution Time Display (Left of Button) */}
                    {executionTime !== null && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {(executionTime / 1000).toFixed(2)}s
                        </span>
                      </div>
                    )}

                    <Button
                      onClick={analyzeImage}
                      disabled={isLoading || imageFiles.length === 0}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Detect Objects
                        </>
                      )}
                    </Button>
                  </div>
                </div>



                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                {/* Aggregate Totals for Multiple Images */}
                {results && results.length > 1 && (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      Total Summary ({results.length} images)
                    </h3>

                    {/* Aggregate by Class - Commented out for now */}
                    {/* <div className="space-y-2 mb-3">
                      {(() => {
                        const classTotals: Record<string, number> = {};
                        results.forEach(res => {
                          if (res.roboflow_predictions) {
                            res.roboflow_predictions.forEach((p: any) => {
                              const label = p.class || p.class_name || p.label || "unknown";
                              classTotals[label] = (classTotals[label] || 0) + 1;
                            });
                          }
                        });

                        return Object.entries(classTotals).map(([label, count]) => (
                          <div key={label} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getColor(label) }}></div>
                              <span className="text-xs font-medium truncate">{label}</span>
                            </div>
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 font-mono text-xs">
                              {count}
                            </Badge>
                          </div>
                        ));
                      })()}
                    </div> */}

                    {/* Total Boxes Only */}
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg">
                      <span className="text-sm font-medium">Total Boxes</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {results.reduce((sum, res) => sum + (res.total_boxes || 0), 0)}
                      </span>
                    </div>

                    {/* Aggregate Count Stats - Commented out for now */}
                    {/* <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
                      {countKeys.map((key) => {
                        const total = results.reduce((sum, res) => sum + ((res as any)[key] || 0), 0);
                        if (total === 0) return null;
                        return (
                          <div key={key} className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 dark:text-slate-400 capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="font-bold text-blue-600">{total}</span>
                          </div>
                        );
                      })}
                    </div> */}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* MIDDLE COLUMN - Image Display + Controls */}
          <div className="lg:col-span-6 bg-slate-100 dark:bg-slate-950 flex flex-col">
            {/* Image Toolbar */}
            <div className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-sm">
                    {imageFiles.length > 1 ? `${selectedIndex + 1} / ${imageFiles.length}` : 'Image Viewer'}
                  </span>
                  {imageFiles.length > 1 && (
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        disabled={selectedIndex === 0}
                        onClick={() => setSelectedIndex(selectedIndex - 1)}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        disabled={selectedIndex === imageFiles.length - 1}
                        onClick={() => setSelectedIndex(selectedIndex + 1)}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg px-2 py-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setZoom(Math.max(50, zoom - 10))}
                  >
                    −
                  </Button>
                  <span className="text-xs font-medium w-12 text-center">{zoom}%</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setZoom(Math.min(200, zoom + 10))}
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1">
              {/* Image Canvas */}
              <div className="p-4">
                <div className="flex items-start justify-center mb-4">
                  {selectedImage ? (
                    <div className="relative" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center top' }}>
                      <img
                        src={currentResult?.roboflow_predictions ? selectedImage : (currentResult ? currentResult.annotated_image : selectedImage)}
                        alt="Analysis"
                        className="rounded-lg shadow-2xl"
                        onLoad={onImageLoad}
                      />
                      {currentResult?.roboflow_predictions && imageDimensions && (
                        <svg
                          className="absolute top-0 left-0 w-full h-full pointer-events-none"
                          viewBox={`0 0 ${imageDimensions.width} ${imageDimensions.height}`}
                        >
                          {currentResult.roboflow_predictions.map((point: any, idx: number) => {
                            const className = point.class || point.class_name || point.label || "unknown";

                            if (boxVisibility[`${selectedIndex}-${idx}`] === false) return null;

                            const boxColor = point.color || getColor(className);

                            if (point.points && Array.isArray(point.points) && point.points.length > 0) {
                              const pointsStr = point.points.map((p: any) => `${p.x},${p.y}`).join(' ');
                              return (
                                <polygon
                                  key={idx}
                                  points={pointsStr}
                                  fill={`${boxColor}30`}
                                  stroke={boxColor}
                                  strokeWidth="3"
                                />
                              );
                            }

                            if (point.x !== undefined && point.width !== undefined) {
                              return (
                                <rect
                                  key={idx}
                                  x={point.x - point.width / 2}
                                  y={point.y - point.height / 2}
                                  width={point.width}
                                  height={point.height}
                                  fill={`${boxColor}20`}
                                  stroke={boxColor}
                                  strokeWidth="3"
                                  rx="4"
                                />
                              );
                            }

                            if (point.box_2d) {
                              const [x1, y1, x2, y2] = point.box_2d;
                              return (
                                <rect
                                  key={idx}
                                  x={x1}
                                  y={y1}
                                  width={x2 - x1}
                                  height={y2 - y1}
                                  fill={`${boxColor}20`}
                                  stroke={boxColor}
                                  strokeWidth="3"
                                  rx="4"
                                />
                              );
                            }

                            return null;
                          })}
                        </svg>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-96">
                      <div className="text-center text-slate-400">
                        <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="text-sm">No image selected</p>
                        <p className="text-xs mt-1">Upload an image to get started</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Detection Controls Below Image */}
                {currentResult && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-lg">
                    <div
                      className="flex items-center justify-between cursor-pointer mb-3"
                      onClick={() => setControlsExpanded(!controlsExpanded)}
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-600" />
                        <h3 className="text-sm font-semibold">Detection Controls</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {controlsExpanded && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); toggleAllBoxes(true); }}
                              className="h-7 text-xs"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              All
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); toggleAllBoxes(false); }}
                              className="h-7 text-xs"
                            >
                              <EyeOff className="w-3 h-3 mr-1" />
                              None
                            </Button>
                          </>
                        )}
                        {controlsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>

                    {controlsExpanded && (
                      <div className="space-y-2">
                        {(() => {
                          const groups: Record<string, number[]> = {};
                          if (currentResult?.roboflow_predictions) {
                            currentResult.roboflow_predictions.forEach((p: any, idx: number) => {
                              const label = p.class || p.class_name || p.label || "unknown";
                              if (!groups[label]) groups[label] = [];
                              groups[label].push(idx);
                            });
                          }

                          return Object.entries(groups).map(([label, indices]) => {
                            const color = getColor(label);
                            const isExpanded = expandedGroups[label] !== false;

                            return (
                              <div key={label} className="border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                <div
                                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors rounded-t-lg"
                                  onClick={() => setExpandedGroups(prev => ({ ...prev, [label]: !isExpanded }))}
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></div>
                                    <span className="font-semibold text-sm" title={label}>{label}</span>
                                    <Badge variant="secondary" className="ml-2 text-xs">{indices.length}</Badge>
                                  </div>
                                  <div className="flex items-center gap-2 ml-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-[10px]"
                                      onClick={(e) => { e.stopPropagation(); toggleGroup(selectedIndex, indices, true); }}
                                    >
                                      <Eye className="w-3 h-3 mr-1" />
                                      All
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-[10px]"
                                      onClick={(e) => { e.stopPropagation(); toggleGroup(selectedIndex, indices, false); }}
                                    >
                                      <EyeOff className="w-3 h-3 mr-1" />
                                      None
                                    </Button>
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="p-3 pt-0 border-t border-slate-200 dark:border-slate-700">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 mt-2">
                                      {indices.map(idx => {
                                        const isVis = boxVisibility[`${selectedIndex}-${idx}`] !== false;
                                        const prediction = currentResult?.roboflow_predictions?.[idx];
                                        const detectionId = prediction?.detection_id;
                                        const displayLabel = detectionId ? detectionId.split('-')[0] : `#${idx + 1}`;

                                        return (
                                          <button
                                            key={idx}
                                            onClick={() => toggleBox(selectedIndex, idx)}
                                            className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] transition-all ${isVis
                                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                              : 'bg-slate-100 dark:bg-slate-900 text-slate-400'
                                              }`}
                                            title={detectionId || `Detection #${idx + 1}`}
                                          >
                                            <span>{displayLabel}</span>
                                            {isVis ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* RIGHT COLUMN - Stats + Debug (Always Visible) */}
          <div className="lg:col-span-3 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {/* Stats */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    Detection Stats
                  </h3>

                  {currentResult ? (
                    <div className="space-y-2">
                      {/* Prominent Total Boxes Display */}
                      {typeof (currentResult as any).total_boxes === 'number' && (
                        <div className="mb-4 p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg text-white">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-blue-100">Total Boxes</span>
                            <Target className="w-5 h-5 text-blue-100 opacity-75" />
                          </div>
                          <div className="mt-1 text-4xl font-bold tracking-tight">
                            {(currentResult as any).total_boxes}
                          </div>
                        </div>
                      )}

                      {/* Execution Time Card REMOVED */}

                      {countKeys.filter(key => key !== 'total_boxes').map((key) => {
                        const value = (currentResult as any)[key];
                        if (typeof value !== 'number') return null;

                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            <span className="text-xs text-slate-600 dark:text-slate-400 capitalize">
                              {key.replace(/_/g, ' ')}
                            </span>
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 font-mono text-xs">
                              {value}
                            </Badge>
                          </div>
                        );
                      })}

                      <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                        <p className="text-[10px] text-slate-500 truncate">
                          {currentResult.image_filename}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <Target className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p className="text-xs">No results yet</p>
                    </div>
                  )}
                </div>

                {/* Debug Data - Always Visible */}
                {currentResult && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Code className="w-4 h-4 text-amber-600" />
                      Debug Data
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">Full Response</span>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={copyFullJSON}>
                            Copy
                          </Button>
                        </div>
                        <pre className="bg-slate-100 dark:bg-slate-950 p-2 rounded-lg text-[9px] h-32 overflow-auto font-mono border border-slate-200 dark:border-slate-800">
                          {JSON.stringify(currentResult, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">Predictions</span>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={copyPredictionsJSON}>
                            Copy
                          </Button>
                        </div>
                        <pre className="bg-slate-100 dark:bg-slate-950 p-2 rounded-lg text-[9px] h-32 overflow-auto font-mono border border-slate-200 dark:border-slate-800">
                          {JSON.stringify(currentResult.roboflow_predictions || [], null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div >
      </main >
    </div >
  );
}
