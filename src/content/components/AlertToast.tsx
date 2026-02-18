import { useState, useEffect } from "react";
import type { Alert } from "../../lib/types";

interface AlertToastProps {
  alerts: Alert[];
}

export default function AlertToast({ alerts }: AlertToastProps) {
  const [visible, setVisible] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const enabled = alerts.filter((a) => a.enabled && a.message.trim());
    if (enabled.length === 0) return;

    const timer = setTimeout(() => {
      setVisible(enabled.map((a) => a.id));
    }, 500);

    return () => clearTimeout(timer);
  }, [alerts]);

  useEffect(() => {
    if (visible.length === 0) return;

    const timer = setTimeout(() => {
      setVisible([]);
    }, 6000);

    return () => clearTimeout(timer);
  }, [visible]);

  const dismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  const toShow = alerts.filter(
    (a) => visible.includes(a.id) && !dismissed.has(a.id)
  );

  if (toShow.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "16px",
        right: "16px",
        zIndex: 2147483647,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        pointerEvents: "auto",
      }}
    >
      {toShow.map((alert) => (
        <div
          key={alert.id}
          style={{
            backgroundColor: "#fffbeb",
            border: "1px solid #f59e0b",
            borderRadius: "10px",
            padding: "12px 16px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            maxWidth: "320px",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            animation: "webnoter-slide-in 0.3s ease-out",
          }}
        >
          <span style={{ fontSize: "18px", flexShrink: 0, lineHeight: 1 }}>
            {"\uD83D\uDD14"}
          </span>
          <span
            style={{
              flex: 1,
              fontSize: "13px",
              lineHeight: "1.4",
              color: "#78350f",
              whiteSpace: "pre-wrap" as const,
              wordBreak: "break-word" as const,
            }}
          >
            {alert.message}
          </span>
          <button
            onClick={() => dismiss(alert.id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              color: "#9ca3af",
              padding: "0 2px",
              lineHeight: 1,
              flexShrink: 0,
            }}
            title="Dismiss"
          >
            {"\u2715"}
          </button>
        </div>
      ))}
      <style>{`
        @keyframes webnoter-slide-in {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
