/**
 * Processing Step Component
 * Shows detailed progress during batch evaluation
 */

"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, XCircle, Clock, Layers } from "lucide-react";
import { ProcessingStatus } from "@/hooks/useEvaluationRunner";

interface ProcessingStepProps {
  status: ProcessingStatus;
  onCancel: () => void;
}

export function ProcessingStep({ status, onCancel }: ProcessingStepProps) {
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full">
        <div className="text-center">
          {status.status === "error" ? (
            <XCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
          ) : (
            <Activity className="w-16 h-16 mx-auto mb-4 animate-pulse text-blue-600" />
          )}
          
          <h2 className="text-xl font-bold mb-2">
            {status.status === "error" ? "Evaluation Failed" : "Running Evaluation"}
          </h2>
          
          <p className="text-sm text-gray-600 mb-4">
            {status.message}
          </p>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                status.status === "error" ? "bg-red-600" : "bg-blue-600"
              }`}
              style={{ width: `${status.percentage}%` }}
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 text-center">
            <div className="p-3 bg-gray-50 rounded-lg">
              <Layers className="w-4 h-4 mx-auto mb-1 text-gray-500" />
              <p className="text-lg font-bold">{status.current}/{status.total}</p>
              <p className="text-xs text-gray-500">Images</p>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <Activity className="w-4 h-4 mx-auto mb-1 text-gray-500" />
              <p className="text-lg font-bold">{status.currentBatch}/{status.totalBatches}</p>
              <p className="text-xs text-gray-500">Batches</p>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <Clock className="w-4 h-4 mx-auto mb-1 text-gray-500" />
              <p className="text-lg font-bold">{formatTime(status.estimatedTimeRemaining)}</p>
              <p className="text-xs text-gray-500">Remaining</p>
            </div>
          </div>

          {/* Batch Info */}
          <p className="text-xs text-gray-500 mt-4">
            Processing in parallel batches of 4 images for faster results
          </p>

          {/* Cancel Button */}
          {status.status === "processing" && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="mt-6"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
