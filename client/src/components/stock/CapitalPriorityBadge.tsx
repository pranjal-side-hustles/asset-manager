import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface Props {
  priority: "BUY" | "ACCUMULATE" | "PILOT" | "WATCH" | "BLOCKED";
}

const priorityStyles: Record<Props["priority"], string> = {
  BUY: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  ACCUMULATE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  PILOT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  WATCH: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400",
  BLOCKED: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

const priorityLabels: Record<Props["priority"], string> = {
  BUY: "Good to Act Now",
  ACCUMULATE: "Add Gradually",
  PILOT: "Worth a Small Look",
  WATCH: "Keep an Eye On",
  BLOCKED: "Pause – Risk Limit Reached",
};

export function CapitalPriorityBadge({ priority }: Props) {
  const isBlocked = priority === "BLOCKED";
  
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded text-xs font-semibold inline-flex items-center gap-1",
        priorityStyles[priority]
      )}
      data-testid={`badge-priority-${priority.toLowerCase()}`}
    >
      {isBlocked && <AlertTriangle className="w-3 h-3" />}
      {priorityLabels[priority]}
    </span>
  );
}
