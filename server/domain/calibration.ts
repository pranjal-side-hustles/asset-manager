/**
 * Engine Calibration Constants
 * 
 * These multipliers and caps are used to subtly adjust factor influence
 * without changing the raw point caps or breaking existing factor math.
 * 
 * DESIGN PRINCIPLE:
 * - Strategic horizon answers: "WHY should I own this?"
 * - Tactical horizon answers: "WHEN should I act?"
 */

export const STRATEGIC_CALIBRATION = {
  /**
   * Fundamental Acceleration multiplier
   * Increases effective influence by ~10-15% without changing raw point caps
   */
  FUNDAMENTAL_MULTIPLIER: 1.12,
  
  /**
   * Weekly Technical downside cap
   * Technical should confirm, not drive. Strong fundamentals should not be fully negated.
   * This caps the minimum score (floor) for technical at this % of max score.
   */
  TECHNICAL_DOWNSIDE_FLOOR_RATIO: 0.2,
};

export const TACTICAL_CALIBRATION = {
  /**
   * Technical Alignment multiplier
   * Slightly increases influence to make timing signals more prominent
   */
  TECHNICAL_ALIGNMENT_MULTIPLIER: 1.08,
  
  /**
   * Momentum Regime multiplier
   * Slight boost to make momentum more visible in tactical decisions
   */
  MOMENTUM_MULTIPLIER: 1.05,
  
  /**
   * Event Proximity multiplier
   * Increases sensitivity to near-term events
   */
  EVENT_PROXIMITY_MULTIPLIER: 1.10,
};

/**
 * Conviction Labels - derived from factor percentages, no new scores
 */
export function deriveFundamentalConviction(
  fundamentalScore: number,
  fundamentalMaxScore: number
): 'High' | 'Medium' | 'Low' {
  const ratio = fundamentalScore / fundamentalMaxScore;
  if (ratio >= 0.7) return 'High';
  if (ratio >= 0.4) return 'Medium';
  return 'Low';
}

export function deriveTechnicalAlignment(
  technicalScore: number,
  technicalMaxScore: number
): 'Confirming' | 'Neutral' | 'Weak' {
  const ratio = technicalScore / technicalMaxScore;
  if (ratio >= 0.6) return 'Confirming';
  if (ratio >= 0.3) return 'Neutral';
  return 'Weak';
}

export function deriveTechnicalSetup(
  technicalScore: number,
  technicalMaxScore: number,
  momentumScore: number,
  momentumMaxScore: number
): 'Strong' | 'Developing' | 'Weak' {
  const techRatio = technicalScore / technicalMaxScore;
  const momRatio = momentumScore / momentumMaxScore;
  const combined = (techRatio + momRatio) / 2;
  
  if (combined >= 0.65) return 'Strong';
  if (combined >= 0.35) return 'Developing';
  return 'Weak';
}

export function deriveEventRisk(
  daysToEarnings?: number,
  hasUpcomingNews?: boolean
): 'Near' | 'Clear' {
  if ((daysToEarnings !== undefined && daysToEarnings < 7) || hasUpcomingNews) {
    return 'Near';
  }
  return 'Clear';
}

/**
 * Combined Horizon Labels
 * Shows relationship between Strategic (WHY) and Tactical (WHEN)
 */
export function deriveHorizonLabel(
  strategicStatus: 'ELIGIBLE' | 'WATCH' | 'REJECT',
  tacticalStatus: 'TRADE' | 'WATCH' | 'AVOID'
): string {
  if (strategicStatus === 'ELIGIBLE' && tacticalStatus === 'TRADE') {
    return 'High Conviction + Actionable';
  }
  if (strategicStatus === 'ELIGIBLE' && tacticalStatus !== 'TRADE') {
    return 'Strong Business – Wait for Setup';
  }
  if (strategicStatus !== 'ELIGIBLE' && tacticalStatus === 'TRADE') {
    return 'Short-Term Opportunity Only';
  }
  if (strategicStatus === 'WATCH' && tacticalStatus === 'WATCH') {
    return 'Developing – Monitor Both';
  }
  return 'Not Actionable';
}
