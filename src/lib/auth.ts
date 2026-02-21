export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  loading: boolean;
}

export const AUTH_STORAGE_KEY = "notara_auth_profile";
export const AUTH_SESSION_KEY = "notara_auth_session";
