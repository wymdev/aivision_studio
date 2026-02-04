"use client";

import { useState, useRef, useEffect } from "react";
import { detectObjectsAction } from "@/actions/backend.actions";
import {
  AiCountingData,
} from "@/types/backend.types";

export default function VisualizePage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AiCountingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Analyze image with Backend
  const analyzeImage = async () => {
    if (!imageFile) return;

    setIsLoading(true);
    setError(null);

    try {
      // The service returns AiCountingData | AiCountingData[]
      // We assume single image upload here for visualize page
      const formData = new FormData();
      formData.append("image", imageFile);

      // Call Server Action
      const result = await detectObjectsAction(formData);

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to analyze image");
      }

      const response = result.data;

      if (Array.isArray(response)) {
        setResult(response[0]);
      } else {
        setResult(response);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze image");
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <h1 className="text-2xl font-bold">Object Detection</h1>
        <p className="text-sm text-muted-foreground">
          Upload an image to detect objects using AI Backend
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
          </div>
        </div>

        {/* Middle Column - Annotated Image */}
        <div className="flex-1 bg-muted/10 p-6 overflow-auto">
          <h2 className="mb-4 text-lg font-semibold">Detection Results</h2>
          <div className="flex items-center justify-center">
            {selectedImage || result ? (
              <div className="relative w-full h-full flex justify-center items-center">
                <img
                  src={result ? result.annotated_image : selectedImage!}
                  alt="Result"
                  className="max-w-full max-h-full rounded-lg border shadow-lg object-contain"
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
        </div>

        {/* Right Column - Counts */}
        <div className="w-1/3 border-l bg-card p-6 overflow-hidden flex flex-col">
          <h2 className="mb-4 text-lg font-semibold">Counts</h2>

          {result ? (
            <div className="space-y-2 flex-1 overflow-auto">
              {countKeys.map((key) => {
                const value = (result as any)[key];
                if (typeof value !== 'number') return null;
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3 rounded-md border bg-background"
                  >
                    <span className="text-sm capitalize font-medium">{key.replace(/_/g, ' ')}</span>
                    <span className="text-sm font-bold bg-muted px-2 py-1 rounded">{value}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No results yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
