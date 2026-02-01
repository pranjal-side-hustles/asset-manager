import type {
  TacticalSentinelEvaluation,
  TacticalSentinelStatus,
  TacticalLabels,
} from "@shared/types/horizon";
import { TACTICAL_THRESHOLDS } from "@shared/constants/thresholds";
import type { EvaluationDetail } from "@shared/types/horizon";
import {
  TACTICAL_CALIBRATION,
  deriveTechnicalSetup,
  deriveEventRisk,
} from "../../calibration";

export function calculateTacticalScore(
  details: Record<string, EvaluationDetail>,
): number {
  let totalScore = 0;
  
  for (const [key, detail] of Object.entries(details)) {
    let score = detail.score;
    
    if (key === 'technicalAlignment') {
      score = Math.min(detail.maxScore, score * TACTICAL_CALIBRATION.TECHNICAL_ALIGNMENT_MULTIPLIER);
    }
    
    if (key === 'momentumRegime') {
      score = Math.min(detail.maxScore, score * TACTICAL_CALIBRATION.MOMENTUM_MULTIPLIER);
    }
    
    if (key === 'eventProximity') {
      score = Math.min(detail.maxScore, score * TACTICAL_CALIBRATION.EVENT_PROXIMITY_MULTIPLIER);
    }
    
    totalScore += score;
  }
  
  return Math.min(100, Math.max(0, totalScore));
}

export function deriveTacticalLabels(
  details: TacticalSentinelEvaluation["details"],
  daysToEarnings?: number,
  hasUpcomingNews?: boolean
): TacticalLabels {
  const technical = details.technicalAlignment;
  const momentum = details.momentumRegime;
  
  return {
    technicalSetup: deriveTechnicalSetup(technical.score, technical.maxScore, momentum.score, momentum.maxScore),
    eventRisk: deriveEventRisk(daysToEarnings, hasUpcomingNews),
  };
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
  daysToEarnings?: number,
  hasUpcomingNews?: boolean
): TacticalSentinelEvaluation {
  const score = calculateTacticalScore(details);
  const entryQuality = extractEntryQuality(details);
  const risks = extractTacticalRisks(details);
  const failureTrigger = determineFailureTrigger(details);
  const labels = deriveTacticalLabels(details, daysToEarnings, hasUpcomingNews);

  return {
    score,
    status: "WATCH", // placeholder only
    entryQuality,
    risks,
    failureTrigger,
    labels,
    details,
  };
}
