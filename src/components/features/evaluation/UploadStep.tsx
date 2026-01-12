/**
 * Upload Step Component
 * Handles image and ground truth file uploads
 */

"use client";

import { useRef, ChangeEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Upload, BarChart3, FileJson } from "lucide-react";
import { GroundTruthBox } from "@/lib/metrics";

interface UploadStepProps {
  images: File[];
  groundTruths: GroundTruthBox[][];
  confidenceThreshold: number;
  iouThreshold: number;
  error: string | null;
  onImageUpload: (files: File[]) => void;
  onGroundTruthUpload: (file: File) => Promise<boolean>;
  onConfidenceChange: (value: number) => void;
  onIouChange: (value: number) => void;
  onRunEvaluation: () => void;
}

export function UploadStep({
  images,
  groundTruths,
  confidenceThreshold,
  iouThreshold,
  error,
  onImageUpload,
  onGroundTruthUpload,
  onConfidenceChange,
  onIouChange,
  onRunEvaluation,
}: UploadStepProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const gtInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onImageUpload(files);
  };

  const handleGTChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onGroundTruthUpload(file);
    }
  };

  return (
    <Card className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Start New Evaluation</h2>
        <p className="text-sm text-gray-600">
          Upload test images and ground truth annotations to evaluate your model.
          Now with <span className="font-medium text-blue-600">4x faster parallel processing</span>!
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Image upload */}
        <div>
          <Label htmlFor="images" className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Upload className="w-4 h-4" />
            1. Upload Test Images
          </Label>
          <Input
            ref={imageInputRef}
            id="images"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="cursor-pointer"
          />
          {images.length > 0 && (
            <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
              ✓ {images.length} images selected
              <span className="text-gray-500">
                ({(images.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(1)} MB)
              </span>
            </p>
          )}
        </div>

        {/* Ground truth upload */}
        <div>
          <Label htmlFor="groundtruth" className="text-sm font-semibold mb-2 flex items-center gap-2">
            <FileJson className="w-4 h-4" />
            2. Upload Ground Truth Annotations (JSON)
          </Label>
          <p className="text-xs text-gray-500 mb-2">
            Supports: COCO format (_annotations.coco.json), VOC, or simple format
          </p>
          <Input
            ref={gtInputRef}
            id="groundtruth"
            type="file"
            accept=".json"
            onChange={handleGTChange}
            className="cursor-pointer"
          />
          {groundTruths.length > 0 && (
            <p className="text-sm text-green-600 mt-2">
              ✓ {groundTruths.length} annotation sets loaded ({groundTruths.flat().length} total boxes)
            </p>
          )}
        </div>

        {/* Thresholds */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="confThreshold" className="text-sm font-semibold mb-2 block">
              Confidence Threshold
            </Label>
            <Input
              id="confThreshold"
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={confidenceThreshold}
              onChange={(e) => onConfidenceChange(parseFloat(e.target.value))}
            />
            <p className="text-xs text-gray-500 mt-1">
              Predictions below this confidence will be ignored
            </p>
          </div>
          <div>
            <Label htmlFor="iouThreshold" className="text-sm font-semibold mb-2 block">
              IoU Threshold
            </Label>
            <Input
              id="iouThreshold"
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={iouThreshold}
              onChange={(e) => onIouChange(parseFloat(e.target.value))}
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum overlap required for a match
            </p>
          </div>
        </div>

        {/* Run button */}
        <Button
          onClick={onRunEvaluation}
          disabled={images.length === 0 || groundTruths.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          <BarChart3 className="w-5 h-5 mr-2" />
          Run Evaluation
          {images.length > 0 && (
            <span className="ml-2 text-xs opacity-80">
              (~{Math.ceil(images.length / 4 * 1.5)}s estimated)
            </span>
          )}
        </Button>
      </div>
    </Card>
  );
}
