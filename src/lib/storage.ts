/**
 * Evaluation Data Storage using localStorage
 * Manages evaluation history and results
 */

import { OverallMetrics } from "./metrics";

export interface EvaluationRun {
  id: string;
  timestamp: number;
  modelVersion: string;
  totalImages: number;
  confidenceThreshold: number;
  iouThreshold: number;
  metrics: OverallMetrics;
  predictions: any[];
  groundTruths: any[];
}

export interface EvaluationSummary {
  id: string;
  timestamp: number;
  modelVersion: string;
  totalImages: number;
  precision: number;
  recall: number;
  f1Score: number;
}

const STORAGE_KEY = "roboflow_evaluations";
const MAX_EVALUATIONS = 10; // Keep last 10 evaluations

/**
 * Save evaluation run to localStorage
 */
export function saveEvaluation(evaluation: EvaluationRun): void {
  try {
    const existing = getAllEvaluations();
    existing.unshift(evaluation);
    
    // Keep only last MAX_EVALUATIONS
    const limited = existing.slice(0, MAX_EVALUATIONS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
  } catch (error) {
    console.error("Failed to save evaluation:", error);
    throw new Error("Storage quota exceeded. Please delete old evaluations.");
  }
}

/**
 * Get all evaluation runs
 */
export function getAllEvaluations(): EvaluationRun[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load evaluations:", error);
    return [];
  }
}

/**
 * Get evaluation summaries (lightweight)
 */
export function getEvaluationSummaries(): EvaluationSummary[] {
  const evaluations = getAllEvaluations();
  return evaluations.map((ev) => ({
    id: ev.id,
    timestamp: ev.timestamp,
    modelVersion: ev.modelVersion,
    totalImages: ev.totalImages,
    precision: ev.metrics.precision,
    recall: ev.metrics.recall,
    f1Score: ev.metrics.f1Score,
  }));
}

/**
 * Get specific evaluation by ID
 */
export function getEvaluationById(id: string): EvaluationRun | null {
  const evaluations = getAllEvaluations();
  return evaluations.find((ev) => ev.id === id) || null;
}

/**
 * Delete evaluation by ID
 */
export function deleteEvaluation(id: string): void {
  const evaluations = getAllEvaluations();
  const filtered = evaluations.filter((ev) => ev.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Clear all evaluations
 */
export function clearAllEvaluations(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get storage usage info
 */
export function getStorageInfo(): { used: number; available: number; percentage: number } {
  let used = 0;
  let available = 5 * 1024 * 1024; // 5MB typical localStorage limit

  try {
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }
  } catch (error) {
    console.error("Failed to calculate storage:", error);
  }

  return {
    used,
    available,
    percentage: (used / available) * 100,
  };
}

/**
 * Export evaluation as JSON file
 */
export function exportEvaluation(evaluation: EvaluationRun): void {
  const dataStr = JSON.stringify(evaluation, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `evaluation_${evaluation.modelVersion}_${new Date(evaluation.timestamp).toISOString().split('T')[0]}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
}

/**
 * Compare two evaluations
 */
export function compareEvaluations(
  id1: string,
  id2: string
): {
  evaluation1: EvaluationRun;
  evaluation2: EvaluationRun;
  precisionDiff: number;
  recallDiff: number;
  f1Diff: number;
} | null {
  const ev1 = getEvaluationById(id1);
  const ev2 = getEvaluationById(id2);

  if (!ev1 || !ev2) return null;

  return {
    evaluation1: ev1,
    evaluation2: ev2,
    precisionDiff: ev2.metrics.precision - ev1.metrics.precision,
    recallDiff: ev2.metrics.recall - ev1.metrics.recall,
    f1Diff: ev2.metrics.f1Score - ev1.metrics.f1Score,
  };
}
