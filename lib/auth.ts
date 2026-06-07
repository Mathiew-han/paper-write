export type AuthUser = {
  user_id: string;
  email: string;
  auth_token: string;
};

export const AUTH_STORAGE_KEY = "mi-writing-auth-user-v1";

export function readStoredAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (
      typeof parsed.user_id === "string" &&
      parsed.user_id &&
      typeof parsed.email === "string" &&
      typeof parsed.auth_token === "string" &&
      parsed.auth_token
    ) {
      return { user_id: parsed.user_id, email: parsed.email, auth_token: parsed.auth_token };
    }
  } catch {
    return null;
  }
  return null;
}

export function writeStoredAuthUser(user: AuthUser) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // Ignore storage failures so authentication UI does not crash the page.
  }
}

export function clearStoredAuthUser() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore storage failures so logout remains best-effort.
  }
}
