import type {
  StrategicGrowthEvaluation,
  StrategicGrowthStatus,
  StrategicLabels,
} from "@shared/types/horizon";
import { STRATEGIC_THRESHOLDS } from "@shared/constants/thresholds";
import type { EvaluationDetail } from "@shared/types/horizon";
import { 
  STRATEGIC_CALIBRATION,
  deriveFundamentalConviction,
  deriveTechnicalAlignment,
} from "../../calibration";

export function calculateStrategicScore(
  details: Record<string, EvaluationDetail | undefined>,
): number {
  let totalScore = 0;
  
  for (const [key, detail] of Object.entries(details)) {
    if (!detail) continue;
    
    let score = detail.score;
    
    if (key === 'fundamentalAcceleration') {
      score = Math.min(detail.maxScore, score * STRATEGIC_CALIBRATION.FUNDAMENTAL_MULTIPLIER);
    }
    
    if (key === 'weeklyTechnicalStructure') {
      const floor = detail.maxScore * STRATEGIC_CALIBRATION.TECHNICAL_DOWNSIDE_FLOOR_RATIO;
      score = Math.max(floor, score);
    }
    
    totalScore += score;
  }

  return Math.min(100, Math.max(0, totalScore));
}

export function deriveStrategicLabels(
  details: StrategicGrowthEvaluation["details"]
): StrategicLabels {
  const fundamental = details.fundamentalAcceleration;
  const technical = details.weeklyTechnicalStructure;
  
  return {
    fundamentalConviction: deriveFundamentalConviction(fundamental.score, fundamental.maxScore),
    technicalAlignment: deriveTechnicalAlignment(technical.score, technical.maxScore),
  };
}

export function extractPositives(
  details: Record<string, EvaluationDetail>,
): string[] {
  const positives: string[] = [];

  for (const detail of Object.values(details)) {
    if (detail.status === "pass") {
      positives.push(`${detail.name}: ${detail.summary}`);
    }
  }

  return positives;
}

export function extractRisks(
  details: Record<string, EvaluationDetail>,
): string[] {
  const risks: string[] = [];

  for (const detail of Object.values(details)) {
    if (detail.status === "caution") {
      risks.push(`${detail.name}: ${detail.summary}`);
    }
  }

  return risks;
}

export function determineFailureMode(
  details: Record<string, EvaluationDetail>,
): string {
  const failures = Object.values(details).filter((d) => d.status === "fail");

  if (failures.length === 0) {
    return "";
  }

  const criticalFailure = failures.reduce((worst, current) => {
    const worstRatio = worst.score / worst.maxScore;
    const currentRatio = current.score / current.maxScore;
    return currentRatio < worstRatio ? current : worst;
  });

  return `${criticalFailure.name} failing: ${criticalFailure.breakdown[0] || criticalFailure.summary}`;
}

export function buildStrategicEvaluation(
  details: StrategicGrowthEvaluation["details"],
): StrategicGrowthEvaluation {
  const score = calculateStrategicScore(details);
  const positives = extractPositives(details);
  const risks = extractRisks(details);
  const failureMode = determineFailureMode(details);
  const labels = deriveStrategicLabels(details);

  return {
    score,
    status: "WATCH", // placeholder only, evaluator overrides
    positives,
    risks,
    failureMode,
    labels,
    details,
  };
}
