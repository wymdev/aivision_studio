"use client";

import { useCallback } from "react";
import { useDetectionStore } from "@/store/useDetectionStore";
import { roboflowService } from "@/services/roboflow.service";

export function useRoboflowDetection() {
  const {
    uploadedImage,
    imageFile,
    detectionResult,
    filteredPredictions,
    labelFilters,
    isLoading,
    error,
    searchQuery,
    setUploadedImage,
    setDetectionResult,
    setLabelFilter,
    toggleAllLabels,
    setSearchQuery,
    setLoading,
    setError,
    reset,
    getSearchedResults,
  } = useDetectionStore();

  const uploadImage = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setUploadedImage(imageData, file);
      };
      reader.readAsDataURL(file);
    },
    [setUploadedImage]
  );

  const analyzeImage = useCallback(async () => {
    if (!imageFile) {
      setError("No image file selected");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await roboflowService.detectObjects(imageFile);
      setDetectionResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze image");
    }
  }, [imageFile, setLoading, setError, setDetectionResult]);

  const getClassCounts = useCallback(() => {
    if (!detectionResult) return {};

    return detectionResult.predictions.reduce((acc, pred) => {
      acc[pred.class] = (acc[pred.class] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [detectionResult]);

  const getUniqueClasses = useCallback(() => {
    if (!detectionResult) return [];
    return Array.from(new Set(detectionResult.predictions.map((p) => p.class)));
  }, [detectionResult]);

  return {
    uploadedImage,
    imageFile,
    detectionResult,
    filteredPredictions,
    labelFilters,
    isLoading,
    error,
    searchQuery,
    uploadImage,
    analyzeImage,
    setLabelFilter,
    toggleAllLabels,
    setSearchQuery,
    reset,
    getClassCounts,
    getUniqueClasses,
    getSearchedResults,
  };
}
