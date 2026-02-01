export function roundScore(score: number): number {
  const clamped = Math.max(0, Math.min(100, score));
  return Math.round(clamped);
}
