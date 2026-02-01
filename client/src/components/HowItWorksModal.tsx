import { useState } from "react";
import { HelpCircle, Target, Clock, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function HowItWorksModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          data-testid="button-how-it-works"
        >
          <HelpCircle className="w-4 h-4" />
          <span className="hidden sm:inline">How this works</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <HelpCircle className="w-5 h-5 text-primary" />
            How This System Thinks
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Long-Term Strength</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  We look at whether a company has solid fundamentals and is built to grow over months. 
                  This answers: "Is this a quality business worth investing in?"
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-chart-4/15 shrink-0">
                <Clock className="w-4 h-4 text-chart-4" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Right-Now Timing</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  We check if current market conditions and price patterns suggest this is a good moment to act. 
                  This answers: "Is this the right time to buy?"
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-stock-watch/20 shrink-0">
                <Shield className="w-4 h-4 text-stock-watch" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Risk Protection</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  We also check for potential risks - like having too much in one sector, 
                  or a sector that's currently struggling. When we see risk, we suggest pausing.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-foreground text-sm">Why pausing is sometimes best</h3>
            <p className="text-sm text-muted-foreground">
              When we say "Pause" or "Keep Watching," we're not saying a stock is bad. 
              We're saying conditions aren't ideal right now. Good investing means being patient 
              and waiting for the right moment. Protecting your money is just as important as growing it.
            </p>
          </div>

          <div className="text-xs text-muted-foreground text-center pt-2">
            This system provides guidance, not financial advice. Always do your own research.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
