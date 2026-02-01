/**
 * Integrity & Event Gate
 * 
 * PURPOSE: Improve user trust by clearly signaling binary risk.
 * This is an overlay, NOT a replacement for existing event proximity scoring.
 * 
 * Behavior:
 * - If earnings < 5 days OR newsRisk = true:
 *   - Add a Binary Risk Flag
 *   - Tactical engine: Apply additional penalty (-5 to -10), NOT a hard block
 *   - Strategic engine: Flag only, no score penalty
 */

export interface IntegrityAuditInput {
  daysToEarnings?: number;
  trendStatus?: 'uptrend' | 'downtrend' | 'sideways';
  newsRisk?: boolean;
}

export interface IntegrityAuditResult {
  hasEarningsRisk: boolean;
  hasNewsRisk: boolean;
  hasBinaryRisk: boolean;
  riskFlags: string[];
  tacticalPenalty: number;
}

const EARNINGS_PROXIMITY_THRESHOLD = 5;
const TACTICAL_EARNINGS_PENALTY = -8;
const TACTICAL_NEWS_PENALTY = -5;

export function evaluateIntegrityGate(input: IntegrityAuditInput): IntegrityAuditResult {
  const { daysToEarnings, newsRisk = false } = input;
  
  const hasEarningsRisk = daysToEarnings !== undefined && daysToEarnings < EARNINGS_PROXIMITY_THRESHOLD;
  const hasNewsRisk = newsRisk === true;
  const hasBinaryRisk = hasEarningsRisk || hasNewsRisk;
  
  const riskFlags: string[] = [];
  let tacticalPenalty = 0;
  
  if (hasEarningsRisk) {
    riskFlags.push(`Earnings in ${daysToEarnings} day${daysToEarnings === 1 ? '' : 's'} - elevated volatility risk`);
    tacticalPenalty += TACTICAL_EARNINGS_PENALTY;
  }
  
  if (hasNewsRisk) {
    riskFlags.push('Active news event - price action may be unpredictable');
    tacticalPenalty += TACTICAL_NEWS_PENALTY;
  }
  
  return {
    hasEarningsRisk,
    hasNewsRisk,
    hasBinaryRisk,
    riskFlags,
    tacticalPenalty: Math.max(-10, tacticalPenalty),
  };
}
