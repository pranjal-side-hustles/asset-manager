import { Link } from "wouter";
import { Activity, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useLocation } from "wouter";

export function Header() {
  const [searchValue, setSearchValue] = useState("");
  const [, setLocation] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      setLocation(`/stocks/${searchValue.trim().toUpperCase()}`);
      setSearchValue("");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/">
            <div
              className="flex items-center gap-2 cursor-pointer"
              data-testid="link-home"
            >
              <div className="p-1.5 rounded-lg bg-primary">
                <Activity className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-lg">TradeMatrix</span>
                <span className="text-muted-foreground text-lg ml-1">
                  {" "}
                  — Market Intelligence
                </span>
              </div>
            </div>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search symbol (e.g., AAPL, MSFT)"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-10 pr-4 h-10"
                data-testid="input-search"
              />
            </div>
          </form>

          <nav className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              data-testid="button-dashboard"
            >
              <Link href="/">Dashboard</Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
