"use client";

import {
  isWebsiteJourneyStep,
  websiteJourneyStep,
  type WebsiteJourneyStep,
} from "./domain/WebsiteUserJourneys";

const storageKey = "smefund:analytics:journey";
const idleTimeout = 30 * 60 * 1000;
type JourneyState = { steps: WebsiteJourneyStep[]; updatedAt: number };
let state: JourneyState | null = null;

function readState(): JourneyState | null {
  if (state) return state;
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw || raw.length > 1000) return null;
    const saved = JSON.parse(raw);
    if (
      Array.isArray(saved.steps) &&
      saved.steps.length <= 3 &&
      saved.steps.every(isWebsiteJourneyStep) &&
      Number.isFinite(saved.updatedAt)
    ) {
      return { steps: saved.steps, updatedAt: saved.updatedAt };
    }
  } catch {
    // Optional analytics still works when session storage is unavailable.
  }
  return null;
}

function reset() {
  state = null;
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    // No storage is required to continue browsing.
  }
}

function observe(pathname: string): string[] {
  const step = websiteJourneyStep(pathname);
  if (!step) {
    reset();
    return [];
  }
  const now = Date.now();
  const saved = readState();
  const active =
    saved && now >= saved.updatedAt && now - saved.updatedAt < idleTimeout;
  const previous = active ? saved.steps : [];
  const repeated = previous.at(-1) === step;
  const steps = repeated ? previous : [...previous, step].slice(-3);
  state = { steps, updatedAt: now };
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Keep only the bounded in-memory sequence when storage is unavailable.
  }
  if (repeated || steps.length < 2) return [];
  const paths = [steps.slice(-2).join(">")];
  if (steps.length === 3) paths.push(steps.join(">"));
  return paths;
}

export const clientWebsiteJourneyService = { observe, reset };
