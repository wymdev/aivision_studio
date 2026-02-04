"use client";

import { useCallback } from "react";
import { useDetectionStore } from "@/store/useDetectionStore";
import { detectObjectsAction } from "@/actions/backend.actions";

export function useBackendDetection() {
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
      // Service now handles FormData and returns AiCountingData
      const formData = new FormData();
      formData.append("image", imageFile);

      const result = await detectObjectsAction(formData);

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to analyze image");
      }

      const data = result.data;
      // Handle array vs single object
      if (Array.isArray(data)) {
        setDetectionResult(data[0]);
      } else {
        setDetectionResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze image");
    }
  }, [imageFile, setLoading, setError, setDetectionResult]);

  const getClassCounts = useCallback(() => {
    if (!detectionResult) return {};

    // If result is array (multiple images), we might need to aggregate or handle differently
    // For single image scenario:
    if (Array.isArray(detectionResult)) {
      // Aggregate counts from multiple results? Or just return first?
      // For now, let's sum them up or just return empty if UI expects single map
      return {};
    }

    // Map AiCountingData fields to the record expected by UI
    const counts: Record<string, number> = {
      "Packaging": detectionResult.packaging_count,
      "Boxes in Packaging": detectionResult.boxes_in_packaging,
      "Pallet": detectionResult.pallet_count,
      "Boxes in Pallet": detectionResult.boxes_in_pallet,
      "Layers": detectionResult.layer_count,
      "Boxes in Layers": detectionResult.boxes_in_layers,
      "Separated Boxes": detectionResult.separated_boxes,
      "Total Boxes": detectionResult.total_boxes,
    };
    return counts;
  }, [detectionResult]);

  const getUniqueClasses = useCallback(() => {
    if (!detectionResult) return [];
    return [
      "Packaging",
      "Boxes in Packaging",
      "Pallet",
      "Boxes in Pallet",
      "Layers",
      "Boxes in Layers",
      "Separated Boxes",
      "Total Boxes"
    ];
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
