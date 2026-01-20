import { create } from "zustand";
import {
  AiCountingData,
  BackendPrediction,
  DetectionFilter,
} from "@/types/backend.types";

interface DetectionState {
  uploadedImage: string | null;
  imageFile: File | null;
  detectionResult: AiCountingData | AiCountingData[] | null;
  // filteredPredictions kept for compatibility but will be empty
  filteredPredictions: BackendPrediction[];
  labelFilters: DetectionFilter;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;

  setUploadedImage: (image: string, file: File) => void;
  setDetectionResult: (result: AiCountingData | AiCountingData[]) => void;
  setLabelFilter: (label: string, visible: boolean) => void;
  toggleAllLabels: (visible: boolean) => void;
  setSearchQuery: (query: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  getFilteredPredictions: () => BackendPrediction[];
  getSearchedResults: () => BackendPrediction[];
}

export const useDetectionStore = create<DetectionState>((set, get) => ({
  uploadedImage: null,
  imageFile: null,
  detectionResult: null,
  filteredPredictions: [],
  labelFilters: {},
  isLoading: false,
  error: null,
  searchQuery: "",

  setUploadedImage: (image, file) => {
    set({
      uploadedImage: image,
      imageFile: file,
      detectionResult: null,
      filteredPredictions: [],
      labelFilters: {},
      error: null,
    });
  },

  setDetectionResult: (result) => {
    // New API doesn't return predictions list, so we can't filter bounding boxes.
    // We just store the result.
    set({
      detectionResult: result,
      filteredPredictions: [], // No individual predictions to filter
      labelFilters: {},
      isLoading: false,
      error: null,
    });
  },

  setLabelFilter: (label, visible) => {
    const state = get();
    // No-op for new API
    const newFilters = { ...state.labelFilters, [label]: visible };
    set({
      labelFilters: newFilters,
      filteredPredictions: [],
    });
  },

  toggleAllLabels: (visible) => {
    // No-op
    set({
      labelFilters: {},
      filteredPredictions: [],
    });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error, isLoading: false }),

  reset: () =>
    set({
      uploadedImage: null,
      imageFile: null,
      detectionResult: null,
      filteredPredictions: [],
      labelFilters: {},
      isLoading: false,
      error: null,
      searchQuery: "",
    }),

  getFilteredPredictions: () => {
    return [];
  },

  getSearchedResults: () => {
    return [];
  },
}));
