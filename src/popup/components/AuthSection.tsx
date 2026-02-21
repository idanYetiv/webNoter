import type { AuthState } from "../../lib/auth";

interface AuthSectionProps extends AuthState {
  signIn: () => void;
  signOut: () => void;
}

export default function AuthSection({ isAuthenticated, user, loading, signIn, signOut }: AuthSectionProps) {
  if (loading) {
    return (
      <div className="p-3" style={{ borderBottom: "1px solid #2a2a40" }}>
        <div className="flex items-center justify-center py-2">
          <span className="text-xs" style={{ color: "#64748b" }}>Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="p-3" style={{ borderBottom: "1px solid #2a2a40" }}>
        <button
          onClick={signIn}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-colors cursor-pointer"
          style={{
            backgroundColor: "#1a1a2e",
            color: "#e2e8f0",
            border: "1px solid #2a2a40",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="p-3" style={{ borderBottom: "1px solid #2a2a40" }}>
      <div className="flex items-center gap-3">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="w-8 h-8 rounded-full flex-shrink-0"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: "#2a2a40", color: "#00d4ff" }}
          >
            {user.name?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "#e2e8f0" }}>{user.name}</p>
          <p className="text-xs truncate" style={{ color: "#64748b" }}>{user.email}</p>
        </div>
        <button
          onClick={signOut}
          className="text-xs px-2 py-1 rounded cursor-pointer flex-shrink-0"
          style={{ color: "#94a3b8", backgroundColor: "#12121f", border: "1px solid #2a2a40" }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
