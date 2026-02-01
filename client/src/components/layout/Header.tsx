import { Link } from "wouter";
import { Activity, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { HowItWorksModal } from "@/components/HowItWorksModal";

interface SearchResult {
  symbol: string;
  description: string;
  type: string;
}

interface SearchResponse {
  results: SearchResult[];
}

export function Header() {
  const [searchValue, setSearchValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [, setLocation] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(searchValue, 300);

  const { data, isLoading } = useQuery<SearchResponse>({
    queryKey: ["/api/stocks/search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 1) {
        return { results: [] };
      }
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: debouncedQuery.length >= 1,
    staleTime: 30000,
  });

  const results = data?.results || [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setSelectedIndex(-1);
    if (searchValue.length >= 1) {
      setIsOpen(true);
    }
  }, [searchValue]);

  const handleSelect = (symbol: string) => {
    setLocation(`/stocks/${symbol}`);
    setSearchValue("");
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) {
      if (e.key === "Enter" && searchValue.trim()) {
        e.preventDefault();
        handleSelect(searchValue.trim().toUpperCase());
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex].symbol);
        } else if (searchValue.trim()) {
          handleSelect(searchValue.trim().toUpperCase());
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
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

          <div className="flex-1 max-w-md relative" ref={containerRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="search"
                placeholder="Search symbol or company name..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onFocus={() => searchValue.length >= 1 && setIsOpen(true)}
                onKeyDown={handleKeyDown}
                className="pl-10 pr-10 h-10"
                data-testid="input-search"
                autoComplete="off"
              />
              {isLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
              )}
            </div>

            {isOpen && (results.length > 0 || isLoading) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-80 overflow-auto">
                {isLoading && results.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    Searching...
                  </div>
                ) : results.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    No results found
                  </div>
                ) : (
                  <ul className="py-1">
                    {results.map((result, index) => (
                      <li
                        key={result.symbol}
                        className={`px-3 py-2 cursor-pointer flex items-center justify-between gap-2 ${
                          index === selectedIndex
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/50"
                        }`}
                        onClick={() => handleSelect(result.symbol)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        data-testid={`search-result-${result.symbol}`}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-sm">{result.symbol}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {result.description}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          Stock
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <nav className="flex items-center gap-2">
            <HowItWorksModal />
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

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
