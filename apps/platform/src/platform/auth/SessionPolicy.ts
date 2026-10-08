export const sessionIdleMilliseconds = 30 * 60 * 1000;
export const sessionActivityIntervalMilliseconds = 60 * 1000;

export type SessionActivityView = {
  expiresAt: number;
};
