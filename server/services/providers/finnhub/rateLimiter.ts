// Centralized rate limiter for Finnhub API (free tier: 60 calls/minute)
// Uses a queue-based approach to serialize all API calls

const MIN_DELAY_MS = 100; // 100ms between calls = max 600 calls/min
let queue: Promise<void> = Promise.resolve();

export async function rateLimitedFetch(url: string): Promise<Response> {
  // Chain this request after the previous one completes + delay
  const myTurn = queue.then(() => new Promise<void>(resolve => {
    setTimeout(resolve, MIN_DELAY_MS);
  }));
  
  // Update the queue to point to this request
  queue = myTurn.catch(() => {}); // Prevent unhandled rejection
  
  // Wait for our turn, then make the request
  await myTurn;
  return fetch(url);
}
