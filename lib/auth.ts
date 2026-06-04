export type AuthUser = {
  user_id: string;
  email: string;
};

export const AUTH_STORAGE_KEY = "mi-writing-auth-user-v1";

export function readStoredAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (typeof parsed.user_id === "string" && parsed.user_id && typeof parsed.email === "string") {
      return { user_id: parsed.user_id, email: parsed.email };
    }
  } catch {
    return null;
  }
  return null;
}

export function writeStoredAuthUser(user: AuthUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredAuthUser() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
