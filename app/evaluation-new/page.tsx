"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Download, Trash2, AlertCircle, BarChart3, Home, 
  CheckCircle2, XCircle, Eye, Grid3X3
} from "lucide-react";

// Hook and components
import { useEvaluationRunner } from "@/hooks/useEvaluationRunner";
import {
  UploadStep,
  ProcessingStep,
  MetricsSummary,
  VisualDebugger,
} from "@/components/features/evaluation";

export default function EvaluationDashboard() {
  const {
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
  } = useEvaluationRunner();

  const [activeTab, setActiveTab] = useState<"metrics" | "visualizer">("metrics");
  const [isSaving, setIsSaving] = useState(false);

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
          <UploadStep
            images={images}
            groundTruths={groundTruths}
            confidenceThreshold={confidenceThreshold}
            iouThreshold={iouThreshold}
            error={error}
            onImageUpload={handleImageUpload}
            onGroundTruthUpload={handleGroundTruthUpload}
            onConfidenceChange={(val) => updateThresholds(val, iouThreshold)}
            onIouChange={(val) => updateThresholds(confidenceThreshold, val)}
            onRunEvaluation={runEvaluation}
          />

          {/* Evaluation History */}
          {evaluationHistory.length > 0 && (
            <Card className="p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">Evaluation History</h3>
              <p className="text-xs text-gray-500 mb-4">
                Stored in IndexedDB - no size limits
              </p>
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
                          onClick={() => loadEvaluation(ev.id)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportEvaluation(ev.id)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            if (confirm("Delete this evaluation?")) {
                              await deleteEvaluation(ev.id);
                            }
                          }}
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
    return <ProcessingStep status={processingStatus} onCancel={cancelEvaluation} />;
  }

  // Render results step
  if (step === "results" && currentMetrics) {
    const prCurveData = getPRCurveData();
    const optimalThreshold = getOptimalThreshold();

    const handleSave = async () => {
      setIsSaving(true);
      try {
        await saveCurrentEvaluation();
        alert("Evaluation saved successfully!");
      } catch (err) {
        alert("Failed to save: " + (err instanceof Error ? err.message : "Unknown error"));
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <div className="min-h-screen bg-slate-50">
        <header className="border-b bg-white shadow-sm">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-lg font-bold">Evaluation Results</h1>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSave}
                disabled={isSaving}
              >
                <Download className="w-4 h-4 mr-2" />
                {isSaving ? "Saving..." : "Save Results"}
              </Button>
              <Button variant="outline" size="sm" onClick={reset}>
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
                    </div>
                    <div>
                      <p className="font-medium">Predictions classes:</p>
                      <p className="text-xs mt-1">
                        {Array.from(new Set(predictions.flat().map(p => p.class))).join(', ') || "None"}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Ground Truth classes:</p>
                      <p className="text-xs mt-1">
                        {Array.from(new Set(groundTruths.flat().map(gt => gt.class))).join(', ') || "None"}
                      </p>
                    </div>
                    <div className="pt-2">
                      <p className="font-medium">Quick Fixes:</p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateThresholds(0.1, 0.3)}
                        >
                          Lower Thresholds (0.1, 0.3)
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateThresholds(0.01, 0.1)}
                        >
                          Very Low (0.01, 0.1)
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Summary Cards */}
          <MetricsSummary metrics={currentMetrics} totalImages={images.length} />

          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "metrics" | "visualizer")} className="mt-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="metrics" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Metrics & Charts
              </TabsTrigger>
              <TabsTrigger value="visualizer" className="gap-2">
                <Eye className="w-4 h-4" />
                Visual Debugger
              </TabsTrigger>
            </TabsList>

            {/* Metrics Tab */}
            <TabsContent value="metrics" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Threshold Controls */}
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
                        onChange={(e) => updateThresholds(parseFloat(e.target.value), iouThreshold)}
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
                        onChange={(e) => updateThresholds(confidenceThreshold, parseFloat(e.target.value))}
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

                {/* PR Curve */}
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
                </Card>
              </div>

              {/* Per-Class Performance */}
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
                              const intensity = maxCount > 0 ? count / maxCount : 0;
                              
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
            </TabsContent>

            {/* Visual Debugger Tab */}
            <TabsContent value="visualizer" className="mt-6">
              {imageUrls.length > 0 ? (
                <VisualDebugger
                  imageUrls={imageUrls}
                  imageNames={images.map((f) => f.name)}
                  predictions={predictions}
                  groundTruths={groundTruths}
                  iouThreshold={iouThreshold}
                  confidenceThreshold={confidenceThreshold}
                />
              ) : (
                <Card className="p-12 text-center">
                  <Grid3X3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-600">No Images Available</h3>
                  <p className="text-sm text-gray-500 mt-2">
                    Visual debugger requires uploaded images. Load a saved evaluation with images or run a new evaluation.
                  </p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    );
  }

  return null;
}
