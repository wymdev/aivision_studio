"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Upload, Sparkles, Image as ImageIcon, X, Eye, EyeOff, Zap, Target } from "lucide-react";
import { roboflowService } from "@/services/roboflow.service";
import {
  RoboflowResponse,
  RoboflowPrediction,
  LabelVisibility,
} from "@/types/roboflow.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

const COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
  "#F7DC6F", "#BB8FCE", "#85C1E2", "#F8B739", "#52BE80",
  "#FF8A80", "#82B1FF", "#B9F6CA", "#FFD180", "#EA80FC"
];

export default function HomePage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<RoboflowResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detectionVisibility, setDetectionVisibility] = useState<Record<number, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      processImage(file);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const processImage = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
      setResults(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    if (!imageFile) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await roboflowService.detectObjects(imageFile);
      setResults(response);

      // Initialize all detections as visible
      const visibility: Record<number, boolean> = {};
      response.predictions.forEach((_, idx) => {
        visibility[idx] = true;
      });
      setDetectionVisibility(visibility);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze image");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDetection = (index: number) => {
    setDetectionVisibility((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const toggleAllDetections = (visible: boolean) => {
    if (!results) return;
    const newVisibility = results.predictions.reduce((acc, _, idx) => {
      acc[idx] = visible;
      return acc;
    }, {} as Record<number, boolean>);
    setDetectionVisibility(newVisibility);
  };

  const toggleClassDetections = (className: string, visible: boolean) => {
    if (!results) return;
    const newVisibility = { ...detectionVisibility };
    results.predictions.forEach((pred, idx) => {
      if (pred.class === className) {
        newVisibility[idx] = visible;
      }
    });
    setDetectionVisibility(newVisibility);
  };

  const filteredResults = results
    ? results.predictions.filter(
        (pred) =>
          pred.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pred.detection_id?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const classStats = results
    ? results.predictions.reduce((acc, pred) => {
        acc[pred.class] = (acc[pred.class] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    : {};

  // Assign consistent colors to each class
  const classColors = results
    ? Object.keys(classStats).reduce((acc, className, idx) => {
        acc[className] = COLORS[idx % COLORS.length];
        return acc;
      }, {} as Record<string, string>)
    : {};

  useEffect(() => {
    if (!results || !selectedImage || !canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = imageRef.current;

    if (!ctx) return;

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Enable smooth rendering for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      ctx.drawImage(img, 0, 0);

      results.predictions.forEach((prediction, idx) => {
        // Check if this detection is visible (default to true if not set)
        if (detectionVisibility[idx] === false) return;

        const color = classColors[prediction.class];
        const x = prediction.x - prediction.width / 2;
        const y = prediction.y - prediction.height / 2;

        // Draw filled polygon if points are available, otherwise use rectangle
        if (prediction.points && prediction.points.length > 0) {
          // Filter out invalid points
          const validPoints = prediction.points.filter(p => 
            p && typeof p.x === 'number' && typeof p.y === 'number' && 
            !isNaN(p.x) && !isNaN(p.y)
          );
          
          if (validPoints.length < 3) {
            // Not enough points for a polygon, fallback to rectangle
            return;
          }
          
          // Draw shadow for depth
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          
          // Draw the exact polygon shape with straight lines
          ctx.beginPath();
          ctx.moveTo(validPoints[0].x, validPoints[0].y);
          
          for (let i = 1; i < validPoints.length; i++) {
            ctx.lineTo(validPoints[i].x, validPoints[i].y);
          }
          
          ctx.closePath();
          
          // Fill with semi-transparent color
          ctx.fillStyle = color + "35"; // 35 = ~20% opacity for subtle fill
          ctx.fill();
          
          ctx.restore();
          
          // Draw crisp border (no shadow)
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.5;
          ctx.lineJoin = 'round'; // Smooth corners
          ctx.lineCap = 'round'; // Smooth ends
          ctx.stroke();
          
          // Find top-left corner for label placement
          const minX = Math.min(...validPoints.map(p => p.x));
          const minY = Math.min(...validPoints.map(p => p.y));
          
          const label = `${prediction.class} ${(prediction.confidence * 100).toFixed(1)}%`;
          ctx.font = "600 14px 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
          const textWidth = ctx.measureText(label).width;
          const textHeight = 22;
          const padding = 8;

          // Label background with gradient and shadow
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 2;
          
          const gradient = ctx.createLinearGradient(
            minX, 
            minY - textHeight - padding, 
            minX, 
            minY
          );
          gradient.addColorStop(0, color);
          gradient.addColorStop(1, color + "E6"); // Slight transparency at bottom

          ctx.fillStyle = gradient;
          ctx.roundRect(
            minX - 2, 
            minY - textHeight - padding, 
            textWidth + padding * 2, 
            textHeight + padding,
            4 // Rounded corners
          );
          ctx.fill();
          
          ctx.restore();

          // Label text with slight shadow for readability
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
          ctx.shadowBlur = 2;
          ctx.fillStyle = "#FFFFFF";
          ctx.fillText(label, minX + padding - 2, minY - 8);
          ctx.restore();
        } else {
          // Fallback to rectangle with fill
          const rectX = Math.round(x);
          const rectY = Math.round(y);
          const rectW = Math.round(prediction.width);
          const rectH = Math.round(prediction.height);
          
          // Shadow for rectangle
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          
          ctx.fillStyle = color + "35"; // Semi-transparent fill
          ctx.fillRect(rectX, rectY, rectW, rectH);
          
          ctx.restore();
          
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.5;
          ctx.strokeRect(rectX, rectY, rectW, rectH);

          const label = `${prediction.class} ${(prediction.confidence * 100).toFixed(1)}%`;
          ctx.font = "600 14px 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
          const textWidth = ctx.measureText(label).width;
          const textHeight = 22;
          const padding = 8;

          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 2;
          
          const gradient = ctx.createLinearGradient(
            rectX, 
            rectY - textHeight - padding, 
            rectX, 
            rectY
          );
          gradient.addColorStop(0, color);
          gradient.addColorStop(1, color + "E6");

          ctx.fillStyle = gradient;
          ctx.roundRect(
            rectX - 2, 
            rectY - textHeight - padding, 
            textWidth + padding * 2, 
            textHeight + padding,
            4
          );
          ctx.fill();
          
          ctx.restore();

          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
          ctx.shadowBlur = 2;
          ctx.fillStyle = "#FFFFFF";
          ctx.fillText(label, rectX + padding - 2, rectY - 8);
          ctx.restore();
        }
      });
    };

    if (img.complete) {
      img.onload(null as any);
    }
  }, [results, selectedImage, detectionVisibility, classColors]);

  const clearImage = () => {
    setSelectedImage(null);
    setImageFile(null);
    setResults(null);
    setError(null);
    setDetectionVisibility({});
    setSearchTerm("");
    setZoom(100);
  };
  // Calculate position label based on bounding box coordinates
  const getPositionLabel = (pred: RoboflowPrediction, imageWidth: number, imageHeight: number): string => {
    const centerX = pred.x;
    const centerY = pred.y;
    
    // Determine horizontal position
    let horizontal = "center";
    if (centerX < imageWidth / 3) horizontal = "left";
    else if (centerX > (imageWidth * 2) / 3) horizontal = "right";
    
    // Determine vertical position
    let vertical = "center";
    if (centerY < imageHeight / 3) vertical = "top";
    else if (centerY > (imageHeight * 2) / 3) vertical = "bottom";
    
    if (horizontal === "center" && vertical === "center") return "center";
    if (horizontal === "center") return vertical;
    if (vertical === "center") return horizontal;
    return `${vertical}-${horizontal}`;
  };
  const copyJSON = () => {
    if (results) {
      navigator.clipboard.writeText(JSON.stringify(results, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="border-b bg-white dark:bg-slate-800 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                  AI Vision Studio
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400">Object Detection Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/evaluation-new">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white"
                >
                  <Target className="w-3.5 h-3.5" />
                  Model Evaluation
                </Button>
              </Link>
              {selectedImage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearImage}
                  className="gap-1.5 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                  New Analysis
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - 3 Columns Always Visible */}
      <main className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT COLUMN - Upload Area */}
          <div className="lg:col-span-3">
            <div className="space-y-3">
              {/* Upload Card */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow border">
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-600" />
                  Image Upload
                </h2>
                
                <div
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    isDragging ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-slate-300 dark:border-slate-600 hover:border-blue-400"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Drop image or click
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                {imageFile && (
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-slate-500">File:</span>
                      <span className="font-medium truncate ml-2">{imageFile.name}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-slate-500">Size:</span>
                      <span className="font-medium">{(imageFile.size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={analyzeImage}
                  disabled={isLoading || !imageFile}
                  className="w-full mt-3 text-sm bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  {isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 mr-2" />
                      Detect Objects
                    </>
                  )}
                </Button>

                {error && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}
              </div>

              {/* Stats Card */}
              {results && (
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow border">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    Detection Stats
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                      <span className="text-slate-600 dark:text-slate-400">Total Objects</span>
                      <span className="text-lg font-bold">{results.predictions.length}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                      <span className="text-slate-600 dark:text-slate-400">Classes</span>
                      <span className="text-lg font-bold">{Object.keys(classStats).length}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
                      <span className="text-slate-600 dark:text-slate-400">Time</span>
                      <span className="text-lg font-bold">{results.time.toFixed(2)}s</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* MIDDLE COLUMN - Image + Toggle Buttons */}
          <div className="lg:col-span-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow border">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  Detection Visualization
                </h2>
                <div className="flex gap-1.5 items-center">
                  {selectedImage && (
                    <div className="flex items-center gap-1 mr-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setZoom(Math.max(50, zoom - 10))}
                        className="h-7 w-7 p-0 text-xs"
                      >
                        -
                      </Button>
                      <span className="text-xs text-slate-600 dark:text-slate-400 w-12 text-center">{zoom}%</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setZoom(Math.min(200, zoom + 10))}
                        className="h-7 w-7 p-0 text-xs"
                      >
                        +
                      </Button>
                    </div>
                  )}
                  {results && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleAllDetections(true)}
                        className="gap-1 h-7 text-xs px-2"
                      >
                        <Eye className="w-3 h-3" />
                        All
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleAllDetections(false)}
                        className="gap-1 h-7 text-xs px-2"
                      >
                        <EyeOff className="w-3 h-3" />
                        None
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Image Display */}
              <div className="bg-slate-100 dark:bg-slate-900 rounded overflow-auto mb-3 max-h-[500px]">
                {selectedImage ? (
                  results ? (
                    <canvas
                      ref={canvasRef}
                      className="w-full h-auto object-contain"
                      style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
                    />
                  ) : (
                    <img
                      src={selectedImage}
                      alt="Uploaded"
                      className="w-full h-auto object-contain"
                      style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
                    />
                  )
                ) : (
                  <div className="flex items-center justify-center h-64 text-slate-400">
                    <div className="text-center">
                      <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">No image uploaded</p>
                    </div>
                  </div>
                )}
                {selectedImage && (
                  <img
                    ref={imageRef}
                    src={selectedImage}
                    alt="Reference"
                    className="hidden"
                  />
                )}
              </div>

              {/* Individual Detection Toggle Buttons */}
              {results && results.predictions.length > 0 && imageRef.current && (
                <div>
                  <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <Eye className="w-3.5 h-3.5" />
                    Toggle Detections ({results.predictions.length})
                  </h3>
                  <ScrollArea className="max-h-48">
                    <div className="space-y-2 pr-2">
                      {Object.entries(classStats).map(([className]) => {
                        // Get all detections for this class
                        const classDetections = results.predictions
                          .map((pred, idx) => ({ pred, idx }))
                          .filter(({ pred }) => pred.class === className);
                        
                        return (
                          <div key={className} className="space-y-1">
                            {/* Class header with toggle all button */}
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                {className} ({classDetections.length})
                              </span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => toggleClassDetections(className, true)}
                                  className="px-1.5 py-0.5 text-xs bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded"
                                >
                                  Show All
                                </button>
                                <button
                                  onClick={() => toggleClassDetections(className, false)}
                                  className="px-1.5 py-0.5 text-xs bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded"
                                >
                                  Hide All
                                </button>
                              </div>
                            </div>
                            
                            {/* Individual detection toggles */}
                            <div className="flex flex-wrap gap-1">
                              {classDetections.map(({ pred, idx }, classIdx) => {
                                const color = classColors[className];
                                const isVisible = detectionVisibility[idx] !== false;
                                
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => toggleDetection(idx)}
                                    className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                                      isVisible
                                        ? "text-white shadow-sm"
                                        : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                                    }`}
                                    style={{
                                      backgroundColor: isVisible ? color : undefined,
                                    }}
                                    title={`${className} #${classIdx + 1} (${(pred.confidence * 100).toFixed(1)}%)`}
                                  >
                                    {className} {classIdx + 1}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN - JSON Results */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow border max-h-[calc(100vh-120px)] flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  Detection Data
                </h2>
                {results && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyJSON}
                    className="h-7 text-xs px-2"
                  >
                    {copied ? "Copied!" : "Copy JSON"}
                  </Button>
                )}
              </div>
              
              {results ? (
                <>
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mb-3 h-8 text-xs"
                  />

                  <ScrollArea className="flex-1 pr-2">
                    <div className="space-y-2">
                      {filteredResults.map((pred, idx) => {
                        const color = classColors[pred.class];
                        return (
                          <div
                            key={idx}
                            className="p-2.5 rounded border transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
                            style={{
                              borderColor: color + "40",
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Badge
                                className="text-xs px-2 py-0.5 font-medium"
                                style={{
                                  backgroundColor: color,
                                  color: "#fff",
                                }}
                              >
                                {pred.class}
                              </Badge>
                              <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                            </div>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500">Confidence:</span>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full"
                                      style={{
                                        width: `${pred.confidence * 100}%`,
                                        backgroundColor: color,
                                      }}
                                    />
                                  </div>
                                  <span className="font-semibold text-[11px]">{(pred.confidence * 100).toFixed(1)}%</span>
                                </div>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Position:</span>
                                <span className="font-mono text-[11px]">x:{pred.x.toFixed(0)}, y:{pred.y.toFixed(0)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Size:</span>
                                <span className="font-mono text-[11px]">{pred.width.toFixed(0)} × {pred.height.toFixed(0)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>

                  {filteredResults.length === 0 && (
                    <div className="text-center py-6 text-slate-400">
                      <Target className="w-8 h-8 mx-auto mb-1.5 opacity-30" />
                      <p className="text-xs">No results</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center text-slate-400">
                  <div>
                    <Target className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-medium">No detections yet</p>
                    <p className="text-[10px] mt-0.5">Upload and analyze</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
