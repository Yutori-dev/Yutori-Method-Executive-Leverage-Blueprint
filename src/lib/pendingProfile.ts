/**
 * Best-effort, same-device convenience only. When a participant registers
 * and opens the magic link in the same browser, /complete-profile can skip
 * re-asking for their name. If the link is opened on a different device or
 * this storage is unavailable, /complete-profile just asks again -- nothing
 * depends on this surviving.
 */
const KEY = "yutori:pending-profile";

export interface PendingProfile {
  email: string;
  firstName: string;
  lastName: string;
  joinCode: string;
}

export function savePendingProfile(profile: PendingProfile) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // Storage unavailable (private browsing, etc). Not required to proceed.
  }
}

export function readPendingProfile(): PendingProfile | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingProfile) : null;
  } catch {
    return null;
  }
}

export function clearPendingProfile() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Ignore.
  }
}
