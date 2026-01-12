import { create } from "zustand";
import {
  RoboflowResponse,
  RoboflowPrediction,
  DetectionFilter,
} from "@/types/roboflow.types";

interface DetectionState {
  uploadedImage: string | null;
  imageFile: File | null;
  detectionResult: RoboflowResponse | null;
  filteredPredictions: RoboflowPrediction[];
  labelFilters: DetectionFilter;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;

  setUploadedImage: (image: string, file: File) => void;
  setDetectionResult: (result: RoboflowResponse) => void;
  setLabelFilter: (label: string, visible: boolean) => void;
  toggleAllLabels: (visible: boolean) => void;
  setSearchQuery: (query: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  getFilteredPredictions: () => RoboflowPrediction[];
  getSearchedResults: () => RoboflowPrediction[];
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
    const uniqueLabels = Array.from(
      new Set(result.predictions.map((p) => p.class))
    );
    const initialFilters = uniqueLabels.reduce((acc, label) => {
      acc[label] = true;
      return acc;
    }, {} as DetectionFilter);

    set({
      detectionResult: result,
      filteredPredictions: result.predictions,
      labelFilters: initialFilters,
      isLoading: false,
      error: null,
    });
  },

  setLabelFilter: (label, visible) => {
    const state = get();
    const newFilters = { ...state.labelFilters, [label]: visible };

    set({
      labelFilters: newFilters,
      filteredPredictions: state.detectionResult
        ? state.detectionResult.predictions.filter(
            (p) => newFilters[p.class] !== false
          )
        : [],
    });
  },

  toggleAllLabels: (visible) => {
    const state = get();
    const newFilters = Object.keys(state.labelFilters).reduce((acc, key) => {
      acc[key] = visible;
      return acc;
    }, {} as DetectionFilter);

    set({
      labelFilters: newFilters,
      filteredPredictions: visible
        ? state.detectionResult?.predictions || []
        : [],
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
    const state = get();
    if (!state.detectionResult) return [];
    return state.detectionResult.predictions.filter(
      (p) => state.labelFilters[p.class] !== false
    );
  },

  getSearchedResults: () => {
    const state = get();
    const filtered = state.getFilteredPredictions();
    if (!state.searchQuery) return filtered;

    const query = state.searchQuery.toLowerCase();
    return filtered.filter(
      (p) =>
        p.class.toLowerCase().includes(query) ||
        p.confidence.toString().includes(query) ||
        p.detection_id.toLowerCase().includes(query)
    );
  },
}));
