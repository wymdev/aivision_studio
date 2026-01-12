"use client";

import { useEffect, useState, useRef } from "react";
import { roboflowService } from "@/services/roboflow.service";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  TrendingUp, Target, Zap, Activity, Upload, 
  Download, Trash2, RefreshCw, BarChart3, AlertCircle 
} from "lucide-react";
import { 
  calculateOverallMetrics, 
  calculateMetricsAtThresholds,
  findOptimalThreshold,
  BoundingBox,
  GroundTruthBox,
  OverallMetrics as Metrics
} from "@/lib/metrics";
import { 
  saveEvaluation, 
  getAllEvaluations, 
  deleteEvaluation,
  exportEvaluation,
  EvaluationRun 
} from "@/lib/storage";

interface ModelMetrics {
  model?: {
    id: string;
    name: string;
    version: string;
  };
  metrics?: {
    precision?: number;
    recall?: number;
    mAP?: number;
    mAP50?: number;
    mAP75?: number;
  };
  classes?: Array<{
    name: string;
    precision: number;
    recall: number;
    count: number;
  }>;
}

export default function EvaluationPage() {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvaluationData();
  }, []);

  const fetchEvaluationData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await roboflowService.getModelEvaluation();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch evaluation data");
      console.error("Evaluation fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Activity className="w-12 h-12 mx-auto mb-4 animate-pulse text-blue-600" />
            <p className="text-sm text-gray-600">Loading model evaluation data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <div className="text-center text-red-600">
            <p className="font-medium">Error Loading Evaluation Data</p>
            <p className="text-sm mt-2">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Model Evaluation Dashboard</h1>
        <p className="text-sm text-gray-600">
          Performance metrics and analytics for your object detection model
        </p>
      </div>

      {/* Model Info */}
      {metrics?.model && (
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Model Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">Model ID</p>
              <p className="text-sm font-medium">{metrics.model.id}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Name</p>
              <p className="text-sm font-medium">{metrics.model.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Version</p>
              <Badge variant="outline">{metrics.model.version}</Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Overall Metrics */}
      {metrics?.metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">Precision</p>
              <Target className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {metrics.metrics.precision 
                ? `${(metrics.metrics.precision * 100).toFixed(1)}%` 
                : "N/A"}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">Recall</p>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {metrics.metrics.recall 
                ? `${(metrics.metrics.recall * 100).toFixed(1)}%` 
                : "N/A"}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">mAP@50</p>
              <Zap className="w-4 h-4 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {metrics.metrics.mAP50 
                ? `${(metrics.metrics.mAP50 * 100).toFixed(1)}%` 
                : "N/A"}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">mAP@75</p>
              <Activity className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {metrics.metrics.mAP75 
                ? `${(metrics.metrics.mAP75 * 100).toFixed(1)}%` 
                : "N/A"}
            </p>
          </Card>
        </div>
      )}

      {/* Per-Class Metrics */}
      {metrics?.classes && metrics.classes.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Per-Class Performance</h2>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {metrics.classes.map((classMetric, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{classMetric.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {classMetric.count} instances
                    </p>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Precision</p>
                      <p className="text-sm font-semibold text-blue-600">
                        {(classMetric.precision * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Recall</p>
                      <p className="text-sm font-semibold text-green-600">
                        {(classMetric.recall * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* No Data Message */}
      {!metrics?.model && !metrics?.metrics && !metrics?.classes && (
        <Card className="p-12">
          <div className="text-center text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No evaluation data available</p>
          </div>
        </Card>
      )}
    </div>
  );
}
