/**
 * useEvaluationRunner Hook
 * Handles all evaluation logic: batch processing, metrics calculation, storage
 * 
 * Features:
 * - Parallel batch processing (3-5x faster than sequential)
 * - Progress tracking with detailed status
 * - Automatic retry on failure
 * - IndexedDB storage integration
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { detectObjectsAction } from "@/actions/backend.actions";
import {
  calculateOverallMetrics,
  calculateMetricsAtThresholds,
  findOptimalThreshold,
  BoundingBox,
  GroundTruthBox,
  OverallMetrics,
} from "@/lib/metrics";
import {
  saveEvaluationToDB,
  getAllEvaluationSummaries,
  getFullEvaluationById,
  deleteEvaluationFromDB,
  exportEvaluationFromDB,
  migrateFromLocalStorage,
  EvaluationSummary,
  EvaluationRun,
} from "@/lib/indexeddb-storage";
import { normalizeToCenter, CenterBox } from "@/lib/coordinate-utils";
import { convertCocoToSimpleFormat } from "@/lib/coco-converter";

// Configuration
const BATCH_SIZE = 4; // Process 4 images at a time
const RETRY_ATTEMPTS = 2;
const RETRY_DELAY = 1000; // 1 second

export type EvaluationStep = "upload" | "processing" | "results";

export interface ProcessingStatus {
  current: number;
  total: number;
  percentage: number;
  currentBatch: number;
  totalBatches: number;
  estimatedTimeRemaining: number; // in seconds
  status: "idle" | "processing" | "error" | "complete";
  message: string;
}

export interface EvaluationState {
  step: EvaluationStep;
  images: File[];
  imageUrls: string[]; // For visual debugger
  groundTruths: GroundTruthBox[][];
  predictions: BoundingBox[][];
  currentMetrics: OverallMetrics | null;
  confidenceThreshold: number;
  iouThreshold: number;
  processingStatus: ProcessingStatus;
  error: string | null;
  evaluationHistory: EvaluationSummary[];
}

const initialProcessingStatus: ProcessingStatus = {
  current: 0,
  total: 0,
  percentage: 0,
  currentBatch: 0,
  totalBatches: 0,
  estimatedTimeRemaining: 0,
  status: "idle",
  message: "",
};

export function useEvaluationRunner() {
  // State
  const [step, setStep] = useState<EvaluationStep>("upload");
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [groundTruths, setGroundTruths] = useState<GroundTruthBox[][]>([]);
  const [predictions, setPredictions] = useState<BoundingBox[][]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<OverallMetrics | null>(null);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
  const [iouThreshold, setIouThreshold] = useState(0.5);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>(initialProcessingStatus);
  const [error, setError] = useState<string | null>(null);
  const [evaluationHistory, setEvaluationHistory] = useState<EvaluationSummary[]>([]);

  // Refs for timing
  const processingStartTime = useRef<number>(0);
  const abortController = useRef<AbortController | null>(null);

  // Load history on mount and migrate from localStorage
  useEffect(() => {
    const initStorage = async () => {
      // First migrate any old localStorage data
      await migrateFromLocalStorage();
      // Then load from IndexedDB
      const history = await getAllEvaluationSummaries();
      setEvaluationHistory(history);
    };
    initStorage();
  }, []);

  /**
   * Handle image upload
   */
  const handleImageUpload = useCallback((files: File[]) => {
    setImages(files);
    setError(null);

    // Create URLs for visual debugger
    const urls = files.map((file) => URL.createObjectURL(file));
    setImageUrls(urls);

    // Cleanup old URLs
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  /**
   * Handle ground truth JSON upload
   */
  const handleGroundTruthUpload = useCallback(async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Check if it's COCO format
      if (data.images && data.annotations && data.categories) {
        // console.log("Detected COCO format, converting...");
        const converted = convertCocoToSimpleFormat(data);
        setGroundTruths(converted);
        setError(null);
        return true;
      }

      // Check if it's already in simple format
      if (Array.isArray(data)) {
        setGroundTruths(data);
        setError(null);
        return true;
      }

      setError("Invalid ground truth format. Expected COCO format or array of annotations.");
      return false;
    } catch (err) {
      setError("Failed to parse ground truth JSON: " + (err instanceof Error ? err.message : "Unknown error"));
      return false;
    }
  }, []);

  /**
   * Process single image with retry
   */
  const processImageWithRetry = async (
    image: File,
    attempt: number = 1
  ): Promise<BoundingBox[]> => {
    try {
      // The new backend service returns AiCountingData which does NOT contain bounding box coordinates.
      // Therefore, we cannot perform client-side evaluation against ground truth boxes.
      // This is a limitation of the current API switching.

      // We call the service but ignore the return value for evaluation purposes since it has no boxes.
      const formData = new FormData();
      formData.append("image", image);

      // Call Server Action
      const result = await detectObjectsAction(formData);

      if (!result.success) {
        throw new Error(result.error || "Failed to analyze image");
      }

      console.warn("Backend API does not return bounding box coordinates. Evaluation metrics will be empty.");

      // Return empty array as there are no raw predictions to evaluate
      return [];
    } catch (err) {
      if (attempt < RETRY_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return processImageWithRetry(image, attempt + 1);
      }
      throw err;
    }
  };

  /**
   * Run batch evaluation - processes images in parallel batches
   */
  const runEvaluation = useCallback(async () => {
    if (images.length === 0) {
      setError("Please upload images first");
      return;
    }
    if (groundTruths.length === 0) {
      setError("Please upload ground truth annotations");
      return;
    }

    // Handle mismatch
    let actualGroundTruths = groundTruths;
    if (images.length !== groundTruths.length) {
      if (images.length < groundTruths.length) {
        actualGroundTruths = groundTruths.slice(0, images.length);
        setGroundTruths(actualGroundTruths);
      } else {
        setError(
          `You uploaded ${images.length} images but only have ${groundTruths.length} annotation sets.`
        );
        return;
      }
    }

    // Initialize
    setStep("processing");
    setError(null);
    processingStartTime.current = Date.now();
    abortController.current = new AbortController();

    const totalBatches = Math.ceil(images.length / BATCH_SIZE);
    const allPredictions: BoundingBox[][] = [];
    let processedCount = 0;

    setProcessingStatus({
      current: 0,
      total: images.length,
      percentage: 0,
      currentBatch: 0,
      totalBatches,
      estimatedTimeRemaining: 0,
      status: "processing",
      message: "Starting evaluation...",
    });

    try {
      // Process in batches
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        // Check for abort
        if (abortController.current?.signal.aborted) {
          throw new Error("Evaluation cancelled");
        }

        const start = batchIndex * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, images.length);
        const batch = images.slice(start, end);

        // Update status - starting batch
        setProcessingStatus((prev) => ({
          ...prev,
          currentBatch: batchIndex + 1,
          message: `Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} images)...`,
        }));

        // Process batch in parallel
        const batchPromises = batch.map((img) => processImageWithRetry(img));
        const batchResults = await Promise.all(batchPromises);

        // Add results
        allPredictions.push(...batchResults);
        processedCount += batch.length;

        // Calculate timing
        const elapsed = (Date.now() - processingStartTime.current) / 1000;
        const avgTimePerImage = elapsed / processedCount;
        const remaining = (images.length - processedCount) * avgTimePerImage;

        // Update progress
        setProcessingStatus({
          current: processedCount,
          total: images.length,
          percentage: (processedCount / images.length) * 100,
          currentBatch: batchIndex + 1,
          totalBatches,
          estimatedTimeRemaining: Math.round(remaining),
          status: "processing",
          message: `Processed ${processedCount}/${images.length} images`,
        });

        // Small delay between batches to prevent rate limiting
        if (batchIndex < totalBatches - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // Success - calculate metrics
      setPredictions(allPredictions);
      const metrics = calculateMetricsInternal(allPredictions, actualGroundTruths, confidenceThreshold, iouThreshold);
      setCurrentMetrics(metrics);

      setProcessingStatus({
        current: images.length,
        total: images.length,
        percentage: 100,
        currentBatch: totalBatches,
        totalBatches,
        estimatedTimeRemaining: 0,
        status: "complete",
        message: "Evaluation complete!",
      });

      setStep("results");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to run evaluation";
      setError(message);
      setProcessingStatus((prev) => ({
        ...prev,
        status: "error",
        message,
      }));
      setStep("upload");
    }
  }, [images, groundTruths, confidenceThreshold, iouThreshold]);

  /**
   * Cancel running evaluation
   */
  const cancelEvaluation = useCallback(() => {
    abortController.current?.abort();
    setStep("upload");
    setProcessingStatus(initialProcessingStatus);
  }, []);

  /**
   * Internal metrics calculation
   */
  const calculateMetricsInternal = (
    preds: BoundingBox[][],
    gts: GroundTruthBox[][],
    confThreshold: number,
    iouThresh: number
  ): OverallMetrics => {
    const allPreds = preds.flat();
    const allGts = gts.flat();
    const filteredPreds = allPreds.filter((p) => (p.confidence || 0) >= confThreshold);
    return calculateOverallMetrics(filteredPreds, allGts, iouThresh);
  };

  /**
   * Update thresholds and recalculate metrics
   */
  const updateThresholds = useCallback(
    (confThreshold: number, iouThresh: number) => {
      setConfidenceThreshold(confThreshold);
      setIouThreshold(iouThresh);

      if (predictions.length > 0 && groundTruths.length > 0) {
        const metrics = calculateMetricsInternal(predictions, groundTruths, confThreshold, iouThresh);
        setCurrentMetrics(metrics);
      }
    },
    [predictions, groundTruths]
  );

  /**
   * Get PR curve data
   */
  const getPRCurveData = useCallback(() => {
    if (!predictions.length || !groundTruths.length) return [];
    return calculateMetricsAtThresholds(predictions.flat(), groundTruths.flat(), undefined, iouThreshold);
  }, [predictions, groundTruths, iouThreshold]);

  /**
   * Get optimal threshold
   */
  const getOptimalThreshold = useCallback(() => {
    if (!predictions.length || !groundTruths.length) return null;
    return findOptimalThreshold(predictions.flat(), groundTruths.flat(), iouThreshold);
  }, [predictions, groundTruths, iouThreshold]);

  /**
   * Save current evaluation to IndexedDB
   */
  const saveCurrentEvaluation = useCallback(async () => {
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
      imageNames: images.map((f) => f.name),
    };

    await saveEvaluationToDB(evaluation);
    const history = await getAllEvaluationSummaries();
    setEvaluationHistory(history);

    return evaluation.id;
  }, [currentMetrics, images, confidenceThreshold, iouThreshold, predictions, groundTruths]);

  /**
   * Load saved evaluation
   */
  const loadEvaluation = useCallback(async (id: string) => {
    const evaluation = await getFullEvaluationById(id);
    if (!evaluation) {
      setError("Evaluation not found");
      return;
    }

    setCurrentMetrics(evaluation.metrics);
    setConfidenceThreshold(evaluation.confidenceThreshold);
    setIouThreshold(evaluation.iouThreshold);
    setStep("results");
  }, []);

  /**
   * Delete evaluation
   */
  const deleteEvaluation = useCallback(async (id: string) => {
    await deleteEvaluationFromDB(id);
    const history = await getAllEvaluationSummaries();
    setEvaluationHistory(history);
  }, []);

  /**
   * Export evaluation
   */
  const exportEvaluation = useCallback(async (id: string) => {
    await exportEvaluationFromDB(id);
  }, []);

  /**
   * Reset to upload step
   */
  const reset = useCallback(() => {
    setStep("upload");
    setImages([]);
    setImageUrls([]);
    setGroundTruths([]);
    setPredictions([]);
    setCurrentMetrics(null);
    setProcessingStatus(initialProcessingStatus);
    setError(null);
  }, []);

  return {
    // State
    step,
    images,
    imageUrls,
    groundTruths,
    predictions,
    currentMetrics,
    confidenceThreshold,
    iouThreshold,
    processingStatus,
    error,
    evaluationHistory,

    // Actions
    setStep,
    handleImageUpload,
    handleGroundTruthUpload,
    runEvaluation,
    cancelEvaluation,
    updateThresholds,
    getPRCurveData,
    getOptimalThreshold,
    saveCurrentEvaluation,
    loadEvaluation,
    deleteEvaluation,
    exportEvaluation,
    reset,
  };
}
