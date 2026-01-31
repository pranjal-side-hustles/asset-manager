import { cn } from "@/lib/utils";

interface ScoreCircleProps {
  score: number;
  size?: "sm" | "md" | "lg" | "xl";
  showLabel?: boolean;
  label?: string;
}

function getScoreColor(score: number): string {
  if (score >= 70) return "text-stock-eligible";
  if (score >= 40) return "text-stock-watch";
  return "text-stock-reject";
}

function getScoreRingColor(score: number): string {
  if (score >= 70) return "stroke-stock-eligible";
  if (score >= 40) return "stroke-stock-watch";
  return "stroke-stock-reject";
}

function getScoreBackgroundColor(score: number): string {
  if (score >= 70) return "bg-stock-eligible-muted";
  if (score >= 40) return "bg-stock-watch-muted";
  return "bg-stock-reject-muted";
}

export function ScoreCircle({ score, size = "md", showLabel = false, label }: ScoreCircleProps) {
  const sizeConfig = {
    sm: { container: "w-12 h-12", text: "text-sm", stroke: 3, radius: 18 },
    md: { container: "w-20 h-20", text: "text-xl", stroke: 4, radius: 30 },
    lg: { container: "w-28 h-28", text: "text-3xl", stroke: 5, radius: 44 },
    xl: { container: "w-36 h-36", text: "text-4xl", stroke: 6, radius: 56 },
  };

  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2" data-testid="score-circle">
      <div className={cn("relative", config.container)}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={config.radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.stroke}
            className="text-muted/30"
          />
          <circle
            cx="50"
            cy="50"
            r={config.radius}
            fill="none"
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn("transition-all duration-700 ease-out", getScoreRingColor(score))}
          />
        </svg>
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center font-bold",
            config.text,
            getScoreColor(score)
          )}
        >
          {score}
        </div>
      </div>
      {showLabel && label && (
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
      )}
    </div>
  );
}

export function ScoreBar({ score, label }: { score: number; label: string }) {
  return (
    <div className="space-y-1.5" data-testid={`score-bar-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-semibold", getScoreColor(score))}>{score}</span>
      </div>
      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            getScoreBackgroundColor(score).replace("-muted", "")
          )}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
