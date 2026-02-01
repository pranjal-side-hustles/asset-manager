import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScoreCircle } from "./ScoreCircle";
import { StatusBadge } from "./StatusBadge";
import { EvaluationSection, DetailedEvaluation } from "./EvaluationSection";
import { WhyExplainer } from "./WhyExplainer";
import { useState } from "react";
import { ChevronDown, Target, Shield } from "lucide-react";
import type {
  StrategicGrowthEvaluation,
  TacticalSentinelEvaluation,
  EvaluationDetail,
} from "@shared/types";
import type { MarketRegime } from "@shared/types/marketContext";

interface StrategicGrowthPanelProps {
  evaluation: StrategicGrowthEvaluation;
  marketRegime?: MarketRegime;
}

export function StrategicGrowthPanel({ evaluation, marketRegime }: StrategicGrowthPanelProps) {
  const [showDetails, setShowDetails] = useState(false);

  const detailsArray: EvaluationDetail[] = Object.values(evaluation.details);

  return (
    <Card className="overflow-hidden" data-testid="panel-strategic-growth">
      <CardHeader className="pb-4 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Strategic Growth Anchor</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                4-9 month investment horizon
              </p>
            </div>
          </div>
          <StatusBadge 
            status={evaluation.status} 
            size="lg" 
            marketRegime={marketRegime}
            showRegimeContext={true}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        <div className="flex items-center justify-center py-4">
          <ScoreCircle score={evaluation.score} size="xl" />
        </div>

        <WhyExplainer
          status={evaluation.status}
          positives={evaluation.positives}
          risks={evaluation.risks}
          failureMode={evaluation.failureMode}
          marketRegime={marketRegime}
          horizonType="strategic"
        />

        <div className="space-y-3">
          <EvaluationSection
            title="Strengths"
            items={evaluation.positives}
            type="positive"
            defaultOpen={true}
          />
          <EvaluationSection
            title="Risk Factors"
            items={evaluation.risks}
            type="risk"
          />
          {evaluation.failureMode && (
            <EvaluationSection
              title="Failure Mode"
              items={[evaluation.failureMode]}
              type="failure"
            />
          )}
        </div>

        <div className="pt-2">
          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={() => setShowDetails(!showDetails)}
            data-testid="button-explore-strategic"
          >
            <span className="font-medium">Explore Detailed Analysis</span>
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform duration-200",
                showDetails && "rotate-180"
              )}
            />
          </Button>

          {showDetails && (
            <div className="mt-4 space-y-2">
              {detailsArray.map((detail, index) => (
                <DetailedEvaluation key={index} detail={detail} />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface TacticalSentinelPanelProps {
  evaluation: TacticalSentinelEvaluation;
  marketRegime?: MarketRegime;
}

export function TacticalSentinelPanel({ evaluation, marketRegime }: TacticalSentinelPanelProps) {
  const [showDetails, setShowDetails] = useState(false);

  const detailsArray: EvaluationDetail[] = Object.values(evaluation.details);

  return (
    <Card className="overflow-hidden" data-testid="panel-tactical-sentinel">
      <CardHeader className="pb-4 bg-gradient-to-br from-chart-4/10 to-transparent">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-chart-4/15">
              <Shield className="w-5 h-5 text-chart-4" />
            </div>
            <div>
              <CardTitle className="text-lg">Tactical Sentinel</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                0-4 month trading horizon
              </p>
            </div>
          </div>
          <StatusBadge 
            status={evaluation.status} 
            size="lg"
            marketRegime={marketRegime}
            showRegimeContext={true}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        <div className="flex items-center justify-center py-4">
          <ScoreCircle score={evaluation.score} size="xl" />
        </div>

        <WhyExplainer
          status={evaluation.status}
          positives={evaluation.entryQuality}
          risks={evaluation.risks}
          failureMode={evaluation.failureTrigger}
          marketRegime={marketRegime}
          horizonType="tactical"
        />

        <div className="space-y-3">
          <EvaluationSection
            title="Entry Quality Signals"
            items={evaluation.entryQuality}
            type="positive"
            defaultOpen={true}
          />
          <EvaluationSection
            title="Risk Factors"
            items={evaluation.risks}
            type="risk"
          />
          {evaluation.failureTrigger && (
            <EvaluationSection
              title="Failure Trigger"
              items={[evaluation.failureTrigger]}
              type="failure"
            />
          )}
        </div>

        <div className="pt-2">
          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={() => setShowDetails(!showDetails)}
            data-testid="button-explore-tactical"
          >
            <span className="font-medium">Explore Detailed Analysis</span>
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform duration-200",
                showDetails && "rotate-180"
              )}
            />
          </Button>

          {showDetails && (
            <div className="mt-4 space-y-2">
              {detailsArray.map((detail, index) => (
                <DetailedEvaluation key={index} detail={detail} />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
