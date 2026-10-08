import {
  sessionActivityIntervalMilliseconds,
  type SessionActivityView,
} from "../SessionPolicy";

type SessionActivityActions = {
  read: () => Promise<SessionActivityView>;
  renew: (lastActivityAt: number) => Promise<SessionActivityView>;
  expired: () => void;
  renewed: (session: SessionActivityView) => void;
  isUnauthorized: (error: unknown) => boolean;
};

// Only activity() schedules a renewal. Status checks, focus, and timeout timers
// never extend the session. The server remains authoritative about expiry.
export class SessionActivityController {
  private expiresAt = 0;
  // The first interaction must not wait a minute: a newly mounted page can
  // inherit a session with less than a minute remaining.
  private lastRenewedAt = Date.now() - sessionActivityIntervalMilliseconds;
  private lastActivityAt = 0;
  private renewalTimer?: ReturnType<typeof setTimeout>;
  private expiryTimer?: ReturnType<typeof setTimeout>;
  private stopped = false;
  private busy = false;
  private pendingActivity = false;

  constructor(private readonly actions: SessionActivityActions) {}

  accept(session: SessionActivityView) {
    if (this.stopped) return;
    this.expiresAt = Math.max(this.expiresAt, session.expiresAt);
    clearTimeout(this.expiryTimer);
    this.expiryTimer = setTimeout(() => {
      void this.check();
    }, Math.max(0, this.expiresAt - Date.now()));
  }

  activity() {
    if (this.stopped || !this.expiresAt) return;
    if (Date.now() >= this.expiresAt) {
      void this.check();
      return;
    }
    this.lastActivityAt = Date.now();
    this.pendingActivity = true;
    this.scheduleRenewal();
  }

  private scheduleRenewal() {
    if (this.stopped || !this.pendingActivity) return;
    if (this.busy || this.renewalTimer) return;
    const wait = Math.max(
      0,
      this.lastRenewedAt + sessionActivityIntervalMilliseconds - Date.now(),
    );
    this.renewalTimer = setTimeout(() => {
      this.renewalTimer = undefined;
      void this.renew();
    }, wait);
  }

  async check() {
    if (this.stopped || this.busy || !this.expiresAt) return;
    this.busy = true;
    try {
      this.accept(await this.actions.read());
    } catch (error) {
      if (this.actions.isUnauthorized(error) || Date.now() >= this.expiresAt) {
        this.expire();
      }
    } finally {
      this.busy = false;
      this.scheduleRenewal();
    }
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.renewalTimer);
    clearTimeout(this.expiryTimer);
  }

  private expire() {
    if (this.stopped) return;
    this.stop();
    this.actions.expired();
  }

  private async renew() {
    if (this.stopped || this.busy || !this.pendingActivity) return;
    if (Date.now() >= this.expiresAt) {
      this.pendingActivity = false;
      await this.check();
      return;
    }
    this.pendingActivity = false;
    this.busy = true;
    this.lastRenewedAt = Date.now();
    try {
      const session = await this.actions.renew(this.lastActivityAt);
      this.accept(session);
      if (!this.stopped) this.actions.renewed(session);
    } catch (error) {
      if (this.actions.isUnauthorized(error)) {
        this.expire();
      } else {
        // Retry the same interaction, including its elapsed idle time. A
        // network failure must not discard activity or create new activity.
        this.pendingActivity = true;
      }
    } finally {
      this.busy = false;
      this.scheduleRenewal();
      if (!this.stopped && Date.now() >= this.expiresAt) void this.check();
    }
  }
}
