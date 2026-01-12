"use client";

import { useState, useRef, ChangeEvent } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, Target, TrendingUp, Activity, Download, 
  Trash2, AlertCircle, BarChart3, Home, CheckCircle2, XCircle
} from "lucide-react";
import { roboflowService } from "@/services/roboflow.service";
import {
  calculateOverallMetrics,
  calculateMetricsAtThresholds,
  findOptimalThreshold,
  BoundingBox,
  GroundTruthBox,
  OverallMetrics,
} from "@/lib/metrics";
import {
  saveEvaluation,
  getAllEvaluations,
  deleteEvaluation,
  exportEvaluation,
  EvaluationRun,
} from "@/lib/storage";
import { convertCocoToSimpleFormat } from "@/lib/coco-converter";

export default function EvaluationDashboard() {
  // State management
  const [step, setStep] = useState<"upload" | "processing" | "results">("upload");
  const [images, setImages] = useState<File[]>([]);
  const [groundTruths, setGroundTruths] = useState<GroundTruthBox[][]>([]);
  const [predictions, setPredictions] = useState<BoundingBox[][]>([]);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMetrics, setCurrentMetrics] = useState<OverallMetrics | null>(null);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
  const [iouThreshold, setIouThreshold] = useState(0.5);
  const [evaluationHistory, setEvaluationHistory] = useState<EvaluationRun[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const gtInputRef = useRef<HTMLInputElement>(null);

  // Load evaluation history on mount
  useState(() => {
    setEvaluationHistory(getAllEvaluations());
  });

  // Handle image upload
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages(files);
    setError(null);
  };

  // Handle ground truth JSON upload
  const handleGroundTruthUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Check if it's COCO format (has images, annotations, categories)
      if (data.images && data.annotations && data.categories) {
        console.log("Detected COCO format, converting...");
        const converted = convertCocoToSimpleFormat(data);
        setGroundTruths(converted);
        setError(null);
        alert(`✓ Converted COCO format: ${converted.length} images, ${converted.flat().length} annotations`);
      }
      // Check if it's already in simple format (array of arrays)
      else if (Array.isArray(data)) {
        setGroundTruths(data);
        setError(null);
      } else {
        setError("Invalid ground truth format. Expected COCO format or array of annotations.");
      }
    } catch (err) {
      setError("Failed to parse ground truth JSON file: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  // Run batch predictions
  const runEvaluation = async () => {
    if (images.length === 0) {
      setError("Please upload images first");
      return;
    }
    if (groundTruths.length === 0) {
      setError("Please upload ground truth annotations");
      return;
    }
    
    // Handle mismatch between images and annotations
    let actualGroundTruths = groundTruths;
    if (images.length !== groundTruths.length) {
      if (images.length < groundTruths.length) {
        // User uploaded fewer images than annotations - use subset
        const proceed = confirm(
          `📊 Evaluation Options:\n\n` +
          `You uploaded ${images.length} image(s) but have ${groundTruths.length} annotation sets.\n\n` +
          `✓ Click OK to evaluate ${images.length} image(s) using the first ${images.length} annotation set(s)\n` +
          `✗ Click Cancel to upload more images`
        );
        
        if (proceed) {
          actualGroundTruths = groundTruths.slice(0, images.length);
          setGroundTruths(actualGroundTruths);
        } else {
          return;
        }
      } else {
        // User uploaded more images than annotations
        setError(
          `You uploaded ${images.length} images but only have ${groundTruths.length} annotation sets.\n` +
          `Please upload ground truth annotations for all images.`
        );
        return;
      }
    }

    setIsProcessing(true);
    setStep("processing");
    setProgress(0);
    setError(null);

    const allPredictions: BoundingBox[][] = [];

    try {
      for (let i = 0; i < images.length; i++) {
        const response = await roboflowService.detectObjects(images[i]);
        
        const imagePredictions: BoundingBox[] = response.predictions.map((pred) => ({
          x: pred.x,
          y: pred.y,
          width: pred.width,
          height: pred.height,
          class: pred.class,
          confidence: pred.confidence,
        }));

        allPredictions.push(imagePredictions);
        setProgress(((i + 1) / images.length) * 100);
        
        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      setPredictions(allPredictions);
      calculateMetrics(allPredictions, actualGroundTruths, confidenceThreshold, iouThreshold);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run predictions");
      setStep("upload");
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate metrics
  const calculateMetrics = (
    preds: BoundingBox[][],
    gts: GroundTruthBox[][],
    confThreshold: number,
    iouThresh: number
  ) => {
    // Flatten arrays
    const allPreds = preds.flat();
    const allGts = gts.flat();

    // Filter by confidence threshold
    const filteredPreds = allPreds.filter((p) => (p.confidence || 0) >= confThreshold);

    // Calculate metrics
    const metrics = calculateOverallMetrics(filteredPreds, allGts, iouThresh);
    setCurrentMetrics(metrics);
  };

  // Update metrics when thresholds change
  const handleThresholdChange = (confThreshold: number, iouThresh: number) => {
    setConfidenceThreshold(confThreshold);
    setIouThreshold(iouThresh);
    if (predictions.length > 0 && groundTruths.length > 0) {
      calculateMetrics(predictions, groundTruths, confThreshold, iouThresh);
    }
  };

  // Save evaluation
  const saveCurrentEvaluation = () => {
    if (!currentMetrics) return;

    const evaluation: EvaluationRun = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      modelVersion: "v3",
      totalImages: images.length,
      confidenceThreshold,
      iouThreshold,
      metrics: currentMetrics,
      predictions: predictions.flat(),
      groundTruths: groundTruths.flat(),
    };

    saveEvaluation(evaluation);
    setEvaluationHistory(getAllEvaluations());
    alert("Evaluation saved successfully!");
  };

  // Delete evaluation
  const handleDeleteEvaluation = (id: string) => {
    if (confirm("Are you sure you want to delete this evaluation?")) {
      deleteEvaluation(id);
      setEvaluationHistory(getAllEvaluations());
      if (selectedEvaluation === id) {
        setSelectedEvaluation(null);
      }
    }
  };

  // Load saved evaluation
  const loadEvaluation = (evaluation: EvaluationRun) => {
    setCurrentMetrics(evaluation.metrics);
    setConfidenceThreshold(evaluation.confidenceThreshold);
    setIouThreshold(evaluation.iouThreshold);
    setSelectedEvaluation(evaluation.id);
    setStep("results");
  };

  // Precision-Recall curve data
  const getPRCurveData = () => {
    if (!predictions.length || !groundTruths.length) return [];
    
    const allPreds = predictions.flat();
    const allGts = groundTruths.flat();
    
    return calculateMetricsAtThresholds(allPreds, allGts, undefined, iouThreshold);
  };

  // Render upload step
  if (step === "upload") {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="border-b bg-white shadow-sm">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-lg font-bold">Model Evaluation Dashboard</h1>
            <Link href="/">
              <Button variant="outline" size="sm">
                <Home className="w-4 h-4 mr-2" />
                Back to Detection
              </Button>
            </Link>
          </div>
        </header>

        <main className="container mx-auto p-6 max-w-4xl">
          <Card className="p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Start New Evaluation</h2>
              <p className="text-sm text-gray-600">
                Upload test images and ground truth annotations to evaluate your model
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {/* Image upload */}
              <div>
                <Label htmlFor="images" className="text-sm font-semibold mb-2 block">
                  1. Upload Test Images
                </Label>
                <Input
                  ref={imageInputRef}
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="cursor-pointer"
                />
                {images.length > 0 && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ {images.length} images selected
                  </p>
                )}
              </div>

              {/* Ground truth upload */}
              <div>
                <Label htmlFor="groundtruth" className="text-sm font-semibold mb-2 block">
                  2. Upload Ground Truth Annotations (JSON)
                </Label>
                <p className="text-xs text-gray-500 mb-2">
                  Supports: COCO format (_annotations.coco.json) or simple format
                </p>
                <Input
                  ref={gtInputRef}
                  id="groundtruth"
                  type="file"
                  accept=".json"
                  onChange={handleGroundTruthUpload}
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
                    onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                  />
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
                    onChange={(e) => setIouThreshold(parseFloat(e.target.value))}
                  />
                </div>
              </div>

              {/* Run button */}
              <Button
                onClick={runEvaluation}
                disabled={images.length === 0 || groundTruths.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <BarChart3 className="w-5 h-5 mr-2" />
                Run Evaluation
              </Button>
            </div>
          </Card>

          {/* Evaluation History */}
          {evaluationHistory.length > 0 && (
            <Card className="p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">Evaluation History</h3>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {evaluationHistory.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {new Date(ev.timestamp).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {ev.totalImages} images • F1: {(ev.metrics.f1Score * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadEvaluation(ev)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportEvaluation(ev)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteEvaluation(ev.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          )}
        </main>
      </div>
    );
  }

  // Render processing step
  if (step === "processing") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center">
            <Activity className="w-16 h-16 mx-auto mb-4 animate-pulse text-blue-600" />
            <h2 className="text-xl font-bold mb-2">Running Predictions</h2>
            <p className="text-sm text-gray-600 mb-6">
              Processing {images.length} images...
            </p>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm font-medium">{progress.toFixed(0)}%</p>
          </div>
        </Card>
      </div>
    );
  }

  // Render results step
  if (step === "results" && currentMetrics) {
    const prCurveData = getPRCurveData();
    const optimalThreshold = predictions.length > 0 && groundTruths.length > 0
      ? findOptimalThreshold(predictions.flat(), groundTruths.flat(), iouThreshold)
      : null;

    return (
      <div className="min-h-screen bg-slate-50">
        <header className="border-b bg-white shadow-sm">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-lg font-bold">Evaluation Results</h1>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={saveCurrentEvaluation}>
                <Download className="w-4 h-4 mr-2" />
                Save Results
              </Button>
              <Button variant="outline" size="sm" onClick={() => setStep("upload")}>
                New Evaluation
              </Button>
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <main className="container mx-auto p-6">
          {/* Debug Panel - Show if results are all zeros */}
          {currentMetrics.precision === 0 && currentMetrics.recall === 0 && (
            <Card className="p-6 mb-6 bg-yellow-50 border-yellow-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-yellow-900 mb-2">
                    ⚠️ No Matches Found - Debug Information
                  </h3>
                  <div className="text-xs text-yellow-800 space-y-2">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="font-medium text-blue-900">🔍 Open Browser Console (F12) for Detailed Logs</p>
                      <p className="text-blue-700 mt-1">
                        Check console for: COCO conversion details, IoU calculations, class name matching
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Predictions (first image):</p>
                      <pre className="bg-white p-2 rounded mt-1 overflow-x-auto text-xs">
                        {JSON.stringify(predictions[0]?.slice(0, 3) || [], null, 2)}
                      </pre>
                      <p className="text-xs mt-1">
                        Class names: {Array.from(new Set(predictions.flat().map(p => p.class))).join(', ')}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Ground Truth (first image):</p>
                      <pre className="bg-white p-2 rounded mt-1 overflow-x-auto text-xs">
                        {JSON.stringify(groundTruths[0]?.slice(0, 3) || [], null, 2)}
                      </pre>
                      <p className="text-xs mt-1">
                        Class names: {Array.from(new Set(groundTruths.flat().map(gt => gt.class))).join(', ')}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-yellow-200">
                      <p className="font-medium">Possible Issues:</p>
                      <ul className="list-disc list-inside space-y-1 mt-1">
                        <li><strong>Class name mismatch:</strong> Prediction vs GT classes must match exactly (case-sensitive)</li>
                        <li><strong>IoU too low:</strong> Bounding boxes may not overlap enough (threshold: {iouThreshold})</li>
                        <li><strong>Coordinates:</strong> Check if x,y are in same coordinate system</li>
                        <li><strong>Confidence filter:</strong> Predictions below {confidenceThreshold} are excluded</li>
                      </ul>
                    </div>
                    <div className="pt-2">
                      <p className="font-medium">Quick Fixes:</p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleThresholdChange(0.1, 0.3)}
                        >
                          Lower Thresholds (Conf: 0.1, IoU: 0.3)
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleThresholdChange(0.01, 0.1)}
                        >
                          Very Low (Conf: 0.01, IoU: 0.1)
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">Precision</p>
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold">
                {(currentMetrics.precision * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {currentMetrics.totalPredictions - currentMetrics.classMetrics.reduce((sum, cm) => sum + cm.falsePositives, 0)} / {currentMetrics.totalPredictions} correct
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">Recall</p>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold">
                {(currentMetrics.recall * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {currentMetrics.classMetrics.reduce((sum, cm) => sum + cm.truePositives, 0)} / {currentMetrics.totalGroundTruths} detected
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">F1 Score</p>
                <Activity className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl font-bold">
                {(currentMetrics.f1Score * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Harmonic mean
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">mAP</p>
                <BarChart3 className="w-4 h-4 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold">
                {(currentMetrics.mAP * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Mean Avg Precision
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">Images</p>
                <Upload className="w-4 h-4 text-gray-600" />
              </div>
              <p className="text-2xl font-bold">
                {images.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {currentMetrics.totalGroundTruths} objects
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Confidence Threshold Controls */}
            <Card className="p-6 lg:col-span-1">
              <h3 className="text-sm font-semibold mb-4">Threshold Controls</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Confidence Threshold</Label>
                  <Input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.1"
                    value={confidenceThreshold}
                    onChange={(e) => handleThresholdChange(parseFloat(e.target.value), iouThreshold)}
                    className="w-full"
                  />
                  <p className="text-sm font-medium text-center mt-1">{confidenceThreshold.toFixed(1)}</p>
                </div>

                <div>
                  <Label className="text-xs">IoU Threshold</Label>
                  <Input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.1"
                    value={iouThreshold}
                    onChange={(e) => handleThresholdChange(confidenceThreshold, parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-sm font-medium text-center mt-1">{iouThreshold.toFixed(1)}</p>
                </div>

                {optimalThreshold && (
                  <div className="pt-4 border-t">
                    <p className="text-xs text-gray-500 mb-2">Recommended Threshold</p>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {optimalThreshold.threshold.toFixed(1)} (F1: {(optimalThreshold.f1Score * 100).toFixed(1)}%)
                    </Badge>
                  </div>
                )}
              </div>

              {/* Error Breakdown */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-xs font-semibold mb-3">Error Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      True Positives
                    </span>
                    <span className="font-medium">
                      {currentMetrics.classMetrics.reduce((sum, cm) => sum + cm.truePositives, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      False Positives
                    </span>
                    <span className="font-medium">
                      {currentMetrics.classMetrics.reduce((sum, cm) => sum + cm.falsePositives, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-orange-600" />
                      False Negatives
                    </span>
                    <span className="font-medium">
                      {currentMetrics.classMetrics.reduce((sum, cm) => sum + cm.falseNegatives, 0)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Precision-Recall Curve */}
            <Card className="p-6 lg:col-span-2">
              <h3 className="text-sm font-semibold mb-4">Precision-Recall Curve</h3>
              <div className="h-64 flex items-end justify-between gap-2">
                {prCurveData.map((point, idx) => {
                  const height = Math.max(point.f1Score * 100, 5);
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all hover:from-blue-700 hover:to-blue-500 cursor-pointer relative group"
                        style={{ height: `${height}%` }}
                        title={`Threshold: ${point.threshold.toFixed(1)}\nPrecision: ${(point.precision * 100).toFixed(1)}%\nRecall: ${(point.recall * 100).toFixed(1)}%\nF1: ${(point.f1Score * 100).toFixed(1)}%`}
                      >
                        {point.threshold === confidenceThreshold && (
                          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                            <div className="w-2 h-2 bg-red-500 rounded-full border-2 border-white"></div>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{point.threshold.toFixed(1)}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-4 text-center">Confidence Threshold</p>
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-600 rounded"></div>
                  <span className="text-xs">F1 Score</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-xs">Current</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Per-Class Performance Table */}
          <Card className="p-6 mt-6">
            <h3 className="text-sm font-semibold mb-4">Per-Class Performance</h3>
            <ScrollArea className="h-80">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="text-left text-xs text-gray-500">
                    <th className="p-3 font-semibold">Class</th>
                    <th className="p-3 font-semibold">Precision</th>
                    <th className="p-3 font-semibold">Recall</th>
                    <th className="p-3 font-semibold">F1 Score</th>
                    <th className="p-3 font-semibold">TP</th>
                    <th className="p-3 font-semibold">FP</th>
                    <th className="p-3 font-semibold">FN</th>
                    <th className="p-3 font-semibold">Samples</th>
                  </tr>
                </thead>
                <tbody>
                  {currentMetrics.classMetrics.map((cm, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-sm font-medium">{cm.className}</td>
                      <td className="p-3">
                        <span className={`text-sm font-medium ${cm.precision > 0.8 ? 'text-green-600' : cm.precision > 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {(cm.precision * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`text-sm font-medium ${cm.recall > 0.8 ? 'text-green-600' : cm.recall > 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {(cm.recall * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`text-sm font-medium ${cm.f1Score > 0.8 ? 'text-green-600' : cm.f1Score > 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {(cm.f1Score * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-3 text-sm text-green-600">{cm.truePositives}</td>
                      <td className="p-3 text-sm text-red-600">{cm.falsePositives}</td>
                      <td className="p-3 text-sm text-orange-600">{cm.falseNegatives}</td>
                      <td className="p-3 text-sm text-gray-600">{cm.sampleCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </Card>

          {/* Confusion Matrix */}
          {currentMetrics.confusionMatrix.length > 0 && (
            <Card className="p-6 mt-6">
              <h3 className="text-sm font-semibold mb-4">Confusion Matrix</h3>
              <ScrollArea className="h-96">
                <table className="border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-xs font-semibold text-gray-500"></th>
                      {currentMetrics.classNames.map((name, idx) => (
                        <th key={idx} className="p-2 text-xs font-semibold text-gray-500">
                          {name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentMetrics.confusionMatrix.map((row, i) => (
                      <tr key={i}>
                        <td className="p-2 text-xs font-semibold text-gray-500">
                          {currentMetrics.classNames[i]}
                        </td>
                        {row.map((count, j) => {
                          const isCorrect = i === j;
                          const maxCount = Math.max(...currentMetrics.confusionMatrix.flat());
                          const intensity = count / maxCount;
                          
                          return (
                            <td
                              key={j}
                              className="p-2 border text-center text-sm font-medium"
                              style={{
                                backgroundColor: isCorrect
                                  ? `rgba(34, 197, 94, ${intensity * 0.7})`
                                  : count > 0
                                  ? `rgba(239, 68, 68, ${intensity * 0.7})`
                                  : 'transparent',
                                color: count > maxCount * 0.5 ? 'white' : 'inherit',
                              }}
                              title={`Actual: ${currentMetrics.classNames[i]}\nPredicted: ${currentMetrics.classNames[j]}\nCount: ${count}`}
                            >
                              {count}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-gray-500 mt-4">
                  Rows = Actual Class, Columns = Predicted Class
                </p>
              </ScrollArea>
            </Card>
          )}
        </main>
      </div>
    );
  }

  return null;
}
