import { cn } from "@/lib/utils";

interface Props {
  priority: "BUY" | "ACCUMULATE" | "PILOT" | "WATCH" | "BLOCKED";
}

const priorityStyles: Record<Props["priority"], string> = {
  BUY: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  ACCUMULATE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  PILOT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  WATCH: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  BLOCKED: "bg-gray-200 text-gray-600 dark:bg-gray-700/30 dark:text-gray-400",
};

export function CapitalPriorityBadge({ priority }: Props) {
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded text-xs font-semibold",
        priorityStyles[priority]
      )}
      data-testid={`badge-priority-${priority.toLowerCase()}`}
    >
      {priority}
    </span>
  );
}
