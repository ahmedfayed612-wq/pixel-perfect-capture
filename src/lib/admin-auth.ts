// Admin authentication utilities for the founder dashboard

const ADMIN_SESSION_KEY = 'waqti_admin_session';
const ADMIN_SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour in milliseconds

export interface AdminSession {
  authenticated: boolean;
  timestamp: number;
}

export function verifyAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD environment variable not set');
    return false;
  }
  return password === adminPassword;
}

export function createAdminSession(): void {
  const session: AdminSession = {
    authenticated: true,
    timestamp: Date.now(),
  };
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
}

export function getAdminSession(): AdminSession | null {
  try {
    const sessionStr = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!sessionStr) return null;
    
    const session: AdminSession = JSON.parse(sessionStr);
    
    // Check if session is expired
    if (Date.now() - session.timestamp > ADMIN_SESSION_TIMEOUT) {
      clearAdminSession();
      return null;
    }
    
    return session;
  } catch {
    return null;
  }
}

export function clearAdminSession(): void {
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

export function isAdminAuthenticated(): boolean {
  return getAdminSession() !== null;
}

export function refreshAdminSession(): void {
  const session = getAdminSession();
  if (session) {
    session.timestamp = Date.now();
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  }
}
