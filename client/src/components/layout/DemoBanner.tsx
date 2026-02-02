import { Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { DashboardResponse } from "@shared/types";

export function DemoBanner() {
    const { data } = useQuery<DashboardResponse>({
        queryKey: ["/api/dashboard"],
        staleTime: 60000,
    });

    if (!data?.isDemoMode) return null;

    return (
        <div className="bg-primary/5 border-b border-primary/10 py-1.5 px-4 animate-in fade-in slide-in-from-top duration-500">
            <div className="container mx-auto flex items-center justify-center gap-2">
                <Info className="w-3.5 h-3.5 text-primary/60" />
                <p className="text-[11px] font-medium text-primary/70 uppercase tracking-widest">
                    Synchronizing market data. Showing current representative evaluations.
                </p>
            </div>
        </div>
    );
}
