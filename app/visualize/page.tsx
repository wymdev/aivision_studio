"use client";

import { useState, useRef, useEffect } from "react";
import { roboflowService } from "@/services/roboflow.service";
import {
  RoboflowResponse,
  RoboflowPrediction,
  LabelVisibility,
} from "@/types/roboflow.types";

const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E2",
  "#F8B739",
  "#52BE80",
];

export default function VisualizePage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<RoboflowResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [labelVisibility, setLabelVisibility] = useState<LabelVisibility>({});
  const [searchTerm, setSearchTerm] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setResults(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Analyze image with Roboflow
  const analyzeImage = async () => {
    if (!imageFile) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await roboflowService.detectObjects(imageFile);
      setResults(response);

      // Initialize label visibility - all visible by default
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

  // Draw annotations on canvas
  useEffect(() => {
    if (!results || !selectedImage || !canvasRef.current || !imageRef.current)
      return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = imageRef.current;

    if (!ctx) return;

    // Wait for image to load
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw image
      ctx.drawImage(img, 0, 0);

      // Draw predictions
      results.predictions.forEach((prediction, index) => {
        // Skip if label is hidden
        if (!labelVisibility[prediction.class]) return;

        const color = COLORS[index % COLORS.length];

        // Calculate box coordinates
        const x = prediction.x - prediction.width / 2;
        const y = prediction.y - prediction.height / 2;

        // Draw bounding box
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, prediction.width, prediction.height);

        // Draw label background
        const label = `${prediction.class} ${(prediction.confidence * 100).toFixed(1)}%`;
        ctx.font = "16px Arial";
        const textWidth = ctx.measureText(label).width;
        const textHeight = 20;

        ctx.fillStyle = color;
        ctx.fillRect(x, y - textHeight - 4, textWidth + 10, textHeight + 4);

        // Draw label text
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(label, x + 5, y - 8);
      });
    };

    // Trigger load if image is already cached
    if (img.complete) {
      img.onload(null as any);
    }
  }, [results, selectedImage, labelVisibility]);

  // Toggle label visibility
  const toggleLabel = (className: string) => {
    setLabelVisibility((prev) => ({
      ...prev,
      [className]: !prev[className],
    }));
  };

  // Filter JSON by search term
  const filteredResults = results
    ? {
        ...results,
        predictions: results.predictions.filter(
          (pred) =>
            pred.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
            pred.detection_id.toLowerCase().includes(searchTerm.toLowerCase())
        ),
      }
    : null;

  // Get unique classes with counts
  const classStats = results
    ? results.predictions.reduce((acc, pred) => {
        acc[pred.class] = (acc[pred.class] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    : {};

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <h1 className="text-2xl font-bold">Roboflow Object Detection</h1>
        <p className="text-sm text-muted-foreground">
          Upload an image to detect objects using Roboflow AI
        </p>
      </header>

      {/* Main Content - 3 Columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column - Image Upload */}
        <div className="w-1/4 border-r bg-card p-6 overflow-y-auto">
          <h2 className="mb-4 text-lg font-semibold">Upload Image</h2>

          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="image-upload"
                className="cursor-pointer rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary hover:bg-accent"
              >
                <div className="space-y-2">
                  <svg
                    className="mx-auto h-12 w-12 text-muted-foreground"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-semibold text-primary">
                      Click to upload
                    </span>{" "}
                    or drag and drop
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG up to 10MB
                  </p>
                </div>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>

              {selectedImage && (
                <div className="space-y-2">
                  <img
                    src={selectedImage}
                    alt="Preview"
                    className="w-full rounded-lg border"
                  />
                  <button
                    onClick={analyzeImage}
                    disabled={isLoading}
                    className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isLoading ? "Analyzing..." : "Analyze Image"}
                  </button>
                </div>
              )}

              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>

            {/* Label Toggles */}
            {Object.keys(classStats).length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Detected Labels</h3>
                <div className="space-y-1">
                  {Object.entries(classStats).map(([className, count], index) => (
                    <button
                      key={className}
                      onClick={() => toggleLabel(className)}
                      className="flex w-full items-center justify-between rounded-md border p-2 text-sm transition-colors hover:bg-accent"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded"
                          style={{
                            backgroundColor: COLORS[index % COLORS.length],
                            opacity: labelVisibility[className] ? 1 : 0.3,
                          }}
                        />
                        <span className={!labelVisibility[className] ? "line-through opacity-50" : ""}>
                          {className}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        ({count})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Middle Column - Annotated Image */}
        <div className="flex-1 bg-muted/10 p-6 overflow-auto">
          <h2 className="mb-4 text-lg font-semibold">Detection Results</h2>
          <div className="flex items-center justify-center">
            {selectedImage ? (
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="max-w-full rounded-lg border shadow-lg"
                />
                <img
                  ref={imageRef}
                  src={selectedImage}
                  alt="Source"
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex h-96 items-center justify-center rounded-lg border-2 border-dashed border-border bg-card">
                <p className="text-muted-foreground">
                  Upload an image to see detection results
                </p>
              </div>
            )}
          </div>

          {results && (
            <div className="mt-4 rounded-lg border bg-card p-4">
              <h3 className="font-semibold mb-2">Statistics</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Detections</p>
                  <p className="text-2xl font-bold">{results.predictions.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Unique Classes</p>
                  <p className="text-2xl font-bold">
                    {Object.keys(classStats).length}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Processing Time</p>
                  <p className="text-2xl font-bold">{results.time.toFixed(2)}s</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - JSON Results */}
        <div className="w-1/3 border-l bg-card p-6 overflow-hidden flex flex-col">
          <h2 className="mb-4 text-lg font-semibold">JSON Results</h2>

          {results && (
            <>
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search results..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* JSON Display */}
              <div className="flex-1 overflow-auto">
                <pre className="rounded-md bg-muted p-4 text-xs overflow-auto">
                  {JSON.stringify(filteredResults, null, 2)}
                </pre>
              </div>
            </>
          )}

          {!results && (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No results yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
