/**
 * MARKET CALENDAR - Trading Day Awareness
 * 
 * Phase 0 Lockdown: Skip weekends, skip holidays, always select last completed trading day.
 * 
 * This avoids:
 * - "Why is price missing on Monday morning?"
 * - Off-by-one errors
 * - Weekend data confusion
 */

// ============================================================================
// US Market Holidays (NYSE/NASDAQ)
// ============================================================================

const US_MARKET_HOLIDAYS_2024 = [
    "2024-01-01", // New Year's Day
    "2024-01-15", // MLK Day
    "2024-02-19", // Presidents Day
    "2024-03-29", // Good Friday
    "2024-05-27", // Memorial Day
    "2024-06-19", // Juneteenth
    "2024-07-04", // Independence Day
    "2024-09-02", // Labor Day
    "2024-11-28", // Thanksgiving
    "2024-12-25", // Christmas
];

const US_MARKET_HOLIDAYS_2025 = [
    "2025-01-01", // New Year's Day
    "2025-01-20", // MLK Day
    "2025-02-17", // Presidents Day
    "2025-04-18", // Good Friday
    "2025-05-26", // Memorial Day
    "2025-06-19", // Juneteenth
    "2025-07-04", // Independence Day
    "2025-09-01", // Labor Day
    "2025-11-27", // Thanksgiving
    "2025-12-25", // Christmas
];

const US_MARKET_HOLIDAYS_2026 = [
    "2026-01-01", // New Year's Day
    "2026-01-19", // MLK Day
    "2026-02-16", // Presidents Day
    "2026-04-03", // Good Friday
    "2026-05-25", // Memorial Day
    "2026-06-19", // Juneteenth
    "2026-07-03", // Independence Day (observed)
    "2026-09-07", // Labor Day
    "2026-11-26", // Thanksgiving
    "2026-12-25", // Christmas
];

const ALL_HOLIDAYS = new Set([
    ...US_MARKET_HOLIDAYS_2024,
    ...US_MARKET_HOLIDAYS_2025,
    ...US_MARKET_HOLIDAYS_2026,
]);

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Check if a date is a US market holiday
 */
export function isMarketHoliday(date: Date): boolean {
    const dateString = formatDate(date);
    return ALL_HOLIDAYS.has(dateString);
}

/**
 * Check if a date is a trading day
 */
export function isTradingDay(date: Date): boolean {
    return !isWeekend(date) && !isMarketHoliday(date);
}

/**
 * Get the last completed trading day before or on the given date
 * Uses EST/EDT timezone for market hours
 */
export function getLastTradingDay(date: Date = new Date()): Date {
    const result = new Date(date);

    // If it's a weekday before 4pm ET, the last "completed" day is yesterday
    const hour = getEasternHour(result);
    if (isTradingDay(result) && hour < 16) {
        // Market not closed yet, go back one day
        result.setDate(result.getDate() - 1);
    }

    // Walk back until we find a trading day
    while (!isTradingDay(result)) {
        result.setDate(result.getDate() - 1);
    }

    return result;
}

/**
 * Get the next trading day after the given date
 */
export function getNextTradingDay(date: Date): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + 1);

    while (!isTradingDay(result)) {
        result.setDate(result.getDate() + 1);
    }

    return result;
}

/**
 * Count trading days between two dates (exclusive of start, inclusive of end)
 */
export function getTradingDaysBetween(startDate: Date, endDate: Date): number {
    if (endDate <= startDate) return 0;

    let count = 0;
    const current = new Date(startDate);
    current.setDate(current.getDate() + 1);

    while (current <= endDate) {
        if (isTradingDay(current)) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }

    return count;
}

/**
 * Get an array of the last N trading days (not including today if market open)
 */
export function getLastNTradingDays(n: number, fromDate: Date = new Date()): Date[] {
    const days: Date[] = [];
    let current = getLastTradingDay(fromDate);

    while (days.length < n) {
        days.push(new Date(current));
        current.setDate(current.getDate() - 1);
        while (!isTradingDay(current)) {
            current.setDate(current.getDate() - 1);
        }
    }

    return days;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getEasternHour(date: Date): number {
    // Simple approximation: EST = UTC-5, EDT = UTC-4
    // More accurate would use a timezone library
    const utcHour = date.getUTCHours();
    const month = date.getMonth();

    // Rough DST check (March-November)
    const isDST = month >= 2 && month <= 10;
    const offset = isDST ? 4 : 5;

    return (utcHour - offset + 24) % 24;
}

/**
 * Check if market is currently open
 */
export function isMarketOpen(date: Date = new Date()): boolean {
    if (!isTradingDay(date)) return false;

    const hour = getEasternHour(date);
    const minute = date.getMinutes();

    // Market hours: 9:30 AM - 4:00 PM ET
    if (hour < 9 || hour >= 16) return false;
    if (hour === 9 && minute < 30) return false;

    return true;
}

/**
 * Get a human-readable description of why a day is not a trading day
 */
export function getNonTradingReason(date: Date): string | null {
    if (isTradingDay(date)) return null;

    if (isWeekend(date)) {
        const day = date.getDay();
        return day === 0 ? "Sunday (market closed)" : "Saturday (market closed)";
    }

    if (isMarketHoliday(date)) {
        return "US market holiday";
    }

    return "Unknown non-trading day";
}
