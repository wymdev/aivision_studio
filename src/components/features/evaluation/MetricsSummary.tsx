/**
 * Metrics Summary Component
 * Displays key performance metrics with visual indicators
 */

"use client";

import { Card } from "@/components/ui/card";
import { Target, TrendingUp, Activity, BarChart3, Upload } from "lucide-react";
import { OverallMetrics } from "@/lib/metrics";

interface MetricsSummaryProps {
  metrics: OverallMetrics;
  totalImages: number;
}

export function MetricsSummary({ metrics, totalImages }: MetricsSummaryProps) {
  const getColorClass = (value: number): string => {
    if (value >= 0.8) return "text-green-600";
    if (value >= 0.5) return "text-yellow-600";
    return "text-red-600";
  };

  const MetricCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    iconColor,
    showPercentage = true,
  }: {
    title: string;
    value: number;
    subtitle: string;
    icon: React.ElementType;
    iconColor: string;
    showPercentage?: boolean;
  }) => (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500">{title}</p>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <p className={`text-2xl font-bold ${showPercentage ? getColorClass(value) : ""}`}>
        {showPercentage ? `${(value * 100).toFixed(1)}%` : value}
      </p>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </Card>
  );

  const totalTP = metrics.classMetrics.reduce((sum, cm) => sum + cm.truePositives, 0);
  const totalFP = metrics.classMetrics.reduce((sum, cm) => sum + cm.falsePositives, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <MetricCard
        title="Precision"
        value={metrics.precision}
        subtitle={`${metrics.totalPredictions - totalFP} / ${metrics.totalPredictions} correct`}
        icon={Target}
        iconColor="text-blue-600"
      />
      
      <MetricCard
        title="Recall"
        value={metrics.recall}
        subtitle={`${totalTP} / ${metrics.totalGroundTruths} detected`}
        icon={TrendingUp}
        iconColor="text-green-600"
      />
      
      <MetricCard
        title="F1 Score"
        value={metrics.f1Score}
        subtitle="Harmonic mean"
        icon={Activity}
        iconColor="text-purple-600"
      />
      
      <MetricCard
        title="mAP"
        value={metrics.mAP}
        subtitle="Mean Avg Precision"
        icon={BarChart3}
        iconColor="text-yellow-600"
      />
      
      <MetricCard
        title="Images"
        value={totalImages}
        subtitle={`${metrics.totalGroundTruths} objects`}
        icon={Upload}
        iconColor="text-gray-600"
        showPercentage={false}
      />
    </div>
  );
}
