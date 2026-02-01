import type {
  StrategicGrowthEvaluation,
  StrategicGrowthStatus,
} from "@shared/types/horizon";
import { STRATEGIC_THRESHOLDS } from "@shared/constants/thresholds";
import type { EvaluationDetail } from "@shared/types/horizon";

export function calculateStrategicScore(
  details: Record<string, EvaluationDetail | undefined>,
): number {
  const totalScore = Object.values(details)
    .filter((detail): detail is EvaluationDetail => Boolean(detail))
    .reduce((sum, detail) => sum + detail.score, 0);

  return Math.min(100, Math.max(0, totalScore));
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

  return {
    score,
    status: "WATCH", // placeholder only, evaluator overrides
    positives,
    risks,
    failureMode,
    details,
  };

}
