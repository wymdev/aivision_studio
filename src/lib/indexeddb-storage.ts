/**
 * Evaluation Data Storage using IndexedDB
 * Handles large datasets without localStorage quota limits
 * 
 * Benefits over localStorage:
 * - No 5MB limit (can store hundreds of MBs)
 * - Async operations don't block UI
 * - Better structured data handling
 */

import { OverallMetrics } from "./metrics";

// Database configuration
const DB_NAME = "stock_vision_evaluations";
const DB_VERSION = 1;
const STORE_SUMMARIES = "evaluation_summaries";
const STORE_FULL_DATA = "evaluation_full_data";

export interface EvaluationSummary {
  id: string;
  timestamp: number;
  modelVersion: string;
  totalImages: number;
  confidenceThreshold: number;
  iouThreshold: number;
  metrics: OverallMetrics;
}

export interface EvaluationFullData {
  id: string;
  predictions: any[];
  groundTruths: any[];
  imageNames: string[];
}

export interface EvaluationRun extends EvaluationSummary {
  predictions: any[];
  groundTruths: any[];
  imageNames?: string[];
}

/**
 * Initialize IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("Failed to open IndexedDB:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store for lightweight summaries (quick loading)
      if (!db.objectStoreNames.contains(STORE_SUMMARIES)) {
        const summaryStore = db.createObjectStore(STORE_SUMMARIES, { keyPath: "id" });
        summaryStore.createIndex("timestamp", "timestamp", { unique: false });
      }

      // Store for full prediction/GT data (only loaded when needed)
      if (!db.objectStoreNames.contains(STORE_FULL_DATA)) {
        db.createObjectStore(STORE_FULL_DATA, { keyPath: "id" });
      }
    };
  });
}

/**
 * Save evaluation - splits data into summary (fast) and full data (large)
 */
export async function saveEvaluationToDB(evaluation: EvaluationRun): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SUMMARIES, STORE_FULL_DATA], "readwrite");

    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();

    // Save lightweight summary
    const summary: EvaluationSummary = {
      id: evaluation.id,
      timestamp: evaluation.timestamp,
      modelVersion: evaluation.modelVersion,
      totalImages: evaluation.totalImages,
      confidenceThreshold: evaluation.confidenceThreshold,
      iouThreshold: evaluation.iouThreshold,
      metrics: evaluation.metrics,
    };
    transaction.objectStore(STORE_SUMMARIES).put(summary);

    // Save full data separately
    const fullData: EvaluationFullData = {
      id: evaluation.id,
      predictions: evaluation.predictions,
      groundTruths: evaluation.groundTruths,
      imageNames: evaluation.imageNames || [],
    };
    transaction.objectStore(STORE_FULL_DATA).put(fullData);
  });
}

/**
 * Get all evaluation summaries (lightweight, fast)
 */
export async function getAllEvaluationSummaries(): Promise<EvaluationSummary[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SUMMARIES, "readonly");
    const store = transaction.objectStore(STORE_SUMMARIES);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      // Sort by timestamp descending
      const results = request.result.sort((a, b) => b.timestamp - a.timestamp);
      resolve(results);
    };
  });
}

/**
 * Get full evaluation data by ID (for visualization/export)
 */
export async function getFullEvaluationById(id: string): Promise<EvaluationRun | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SUMMARIES, STORE_FULL_DATA], "readonly");

    const summaryRequest = transaction.objectStore(STORE_SUMMARIES).get(id);
    const fullDataRequest = transaction.objectStore(STORE_FULL_DATA).get(id);

    transaction.oncomplete = () => {
      if (!summaryRequest.result) {
        resolve(null);
        return;
      }

      const evaluation: EvaluationRun = {
        ...summaryRequest.result,
        predictions: fullDataRequest.result?.predictions || [],
        groundTruths: fullDataRequest.result?.groundTruths || [],
        imageNames: fullDataRequest.result?.imageNames || [],
      };
      resolve(evaluation);
    };

    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Delete evaluation by ID
 */
export async function deleteEvaluationFromDB(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SUMMARIES, STORE_FULL_DATA], "readwrite");

    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();

    transaction.objectStore(STORE_SUMMARIES).delete(id);
    transaction.objectStore(STORE_FULL_DATA).delete(id);
  });
}

/**
 * Clear all evaluations
 */
export async function clearAllEvaluationsFromDB(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SUMMARIES, STORE_FULL_DATA], "readwrite");

    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();

    transaction.objectStore(STORE_SUMMARIES).clear();
    transaction.objectStore(STORE_FULL_DATA).clear();
  });
}

/**
 * Export evaluation to JSON file
 */
export async function exportEvaluationFromDB(id: string): Promise<void> {
  const evaluation = await getFullEvaluationById(id);
  if (!evaluation) {
    throw new Error("Evaluation not found");
  }

  const blob = new Blob([JSON.stringify(evaluation, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `evaluation_${new Date(evaluation.timestamp).toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get storage usage estimate
 */
export async function getStorageUsage(): Promise<{ used: number; quota: number }> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }
  return { used: 0, quota: 0 };
}

/**
 * Migrate from localStorage to IndexedDB (one-time)
 */
export async function migrateFromLocalStorage(): Promise<number> {
  const STORAGE_KEY = "roboflow_evaluations";
  
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return 0;

    const evaluations: EvaluationRun[] = JSON.parse(data);
    let migrated = 0;

    for (const evaluation of evaluations) {
      await saveEvaluationToDB(evaluation);
      migrated++;
    }

    // Clear localStorage after successful migration
    localStorage.removeItem(STORAGE_KEY);
    console.log(`Migrated ${migrated} evaluations from localStorage to IndexedDB`);
    
    return migrated;
  } catch (error) {
    console.error("Migration failed:", error);
    return 0;
  }
}
