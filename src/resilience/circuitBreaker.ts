/**
 * Minimal circuit breaker: after `failureThreshold` consecutive failures,
 * opens for `cooldownMs` so callers can fail fast instead of paying a full
 * timeout+retry on every request during an outage. After the cooldown, one
 * trial call is allowed through; success closes the circuit, failure
 * re-opens it for another cooldown window.
 */
export class CircuitBreaker {
  private consecutiveFailures = 0;
  private openUntil: number | null = null;

  constructor(
    private readonly name: string,
    private readonly failureThreshold: number,
    private readonly cooldownMs: number
  ) {}

  isOpen(): boolean {
    if (this.openUntil === null) return false;

    if (Date.now() < this.openUntil) {
      return true;
    }

    // Cooldown elapsed: allow one trial call through.
    console.log(`[circuit-breaker] ${this.name}: cooldown elapsed, allowing a trial request`);
    this.openUntil = null;
    this.consecutiveFailures = 0;
    return false;
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.openUntil = null;
  }

  recordFailure(): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.failureThreshold && this.openUntil === null) {
      this.openUntil = Date.now() + this.cooldownMs;
      console.warn(
        `[circuit-breaker] ${this.name}: opening circuit after ${this.consecutiveFailures} consecutive failures, cooling down for ${this.cooldownMs}ms`
      );
    }
  }
}
