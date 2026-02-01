import type {
  TacticalSentinelEvaluation,
  TacticalSentinelStatus,
} from "@shared/types/horizon";
import { TACTICAL_THRESHOLDS } from "@shared/constants/thresholds";
import type { EvaluationDetail } from "@shared/types/horizon";

export function calculateTacticalScore(
  details: Record<string, EvaluationDetail>,
): number {
  const totalScore = Object.values(details).reduce(
    (sum, detail) => sum + detail.score,
    0,
  );
  return Math.min(100, Math.max(0, totalScore));
}

export function extractEntryQuality(
  details: Record<string, EvaluationDetail>,
): string[] {
  const entryQuality: string[] = [];

  for (const detail of Object.values(details)) {
    if (detail.status === "pass") {
      entryQuality.push(`${detail.name}: ${detail.summary}`);
    }
  }

  return entryQuality;
}

export function extractTacticalRisks(
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

export function determineFailureTrigger(
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

export function buildTacticalEvaluation(
  details: TacticalSentinelEvaluation["details"],
): TacticalSentinelEvaluation {
  const score = calculateTacticalScore(details);
  const entryQuality = extractEntryQuality(details);
  const risks = extractTacticalRisks(details);
  const failureTrigger = determineFailureTrigger(details);

  return {
    score,
    status: "WATCH", // placeholder only
    entryQuality,
    risks,
    failureTrigger,
    details,
  };
}
