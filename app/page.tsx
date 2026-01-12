"use client";

import { useState, useRef, useEffect } from "react";
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
  const [labelVisibility, setLabelVisibility] = useState<LabelVisibility>({});
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

      const visibility: LabelVisibility = {};
      response.predictions.forEach((pred) => {
        if (!(pred.class in visibility)) {
          visibility[pred.class] = true;
        }
      });
      setLabelVisibility(visibility);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze image");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLabel = (className: string) => {
    setLabelVisibility((prev) => ({
      ...prev,
      [className]: !prev[className],
    }));
  };

  const toggleAllLabels = (visible: boolean) => {
    const newVisibility = Object.keys(labelVisibility).reduce((acc, key) => {
      acc[key] = visible;
      return acc;
    }, {} as LabelVisibility);
    setLabelVisibility(newVisibility);
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
      ctx.drawImage(img, 0, 0);

      results.predictions.forEach((prediction) => {
        if (!labelVisibility[prediction.class]) return;

        const color = classColors[prediction.class];
        const x = prediction.x - prediction.width / 2;
        const y = prediction.y - prediction.height / 2;

        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, prediction.width, prediction.height);
        ctx.shadowBlur = 0;

        const label = `${prediction.class} ${(prediction.confidence * 100).toFixed(1)}%`;
        ctx.font = "bold 16px Inter, system-ui, sans-serif";
        const textWidth = ctx.measureText(label).width;
        const textHeight = 26;

        const gradient = ctx.createLinearGradient(x, y - textHeight, x, y);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, color + "DD");

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y - textHeight - 5, textWidth + 14, textHeight + 5);

        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(label, x + 7, y - 8);
      });
    };

    if (img.complete) {
      img.onload(null as any);
    }
  }, [results, selectedImage, labelVisibility, classColors]);

  const clearImage = () => {
    setSelectedImage(null);
    setImageFile(null);
    setResults(null);
    setError(null);
    setLabelVisibility({});
    setSearchTerm("");
    setZoom(100);
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
                        onClick={() => toggleAllLabels(true)}
                        className="gap-1 h-7 text-xs px-2"
                      >
                        <Eye className="w-3 h-3" />
                        All
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleAllLabels(false)}
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

              {/* Label Toggle Buttons */}
              {results && Object.keys(classStats).length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <Eye className="w-3.5 h-3.5" />
                    Toggle Labels ({Object.keys(classStats).length})
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(classStats).map(([className, count], idx) => (
                      <button
                        key={className}
                        onClick={() => toggleLabel(className)}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          labelVisibility[className] !== false
                            ? "text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                        }`}
                        style={{
                          backgroundColor: labelVisibility[className] !== false
                            ? COLORS[idx % COLORS.length]
                            : undefined,
                        }}
                      >
                        <span>{className}</span>
                        <span className="ml-1.5 opacity-75">({count})</span>
                      </button>
                    ))}
                  </div>
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
