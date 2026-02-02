import { logger } from "../../../infra/logging/logger";
import { providerGuard } from "../../../infra/network/providerGuard";

const MIN_DELAY_MS = 100; // 100ms between calls = max 600 calls/min
let queue: Promise<void> = Promise.resolve();

export async function rateLimitedFetch(url: string): Promise<Response> {
  const myTurn = queue.then(() => new Promise<void>(resolve => {
    setTimeout(resolve, MIN_DELAY_MS);
  }));

  queue = myTurn.catch(() => { });
  await myTurn;

  const response = await fetch(url);

  // Check for rate limit headers (Finnhub specific)
  const remaining = response.headers.get("x-ratelimit-remaining");
  if (remaining && parseInt(remaining) < 5) {
    logger.warn("RETRY", `Finnhub rate limit approaching: ${remaining} calls left`);
  }

  if (response.status === 429) {
    logger.error("RETRY", "Finnhub rate limit exceeded (429)");
    providerGuard.recordFailure("Finnhub", new Error("Rate limit exceeded"));
    throw new Error("Rate limit exceeded");
  }

  return response;
}
