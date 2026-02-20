import { useState, useEffect } from "react";
import { FREE_NOTE_LIMIT, getTotalNoteCount } from "../../lib/freemium";

interface UpgradeModalProps {
  onDismiss: () => void;
}

export default function UpgradeModal({ onDismiss }: UpgradeModalProps) {
  const [noteCount, setNoteCount] = useState<number | null>(null);

  useEffect(() => {
    getTotalNoteCount().then(setNoteCount);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
      onClick={onDismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "360px",
          borderRadius: "16px",
          backgroundColor: "#12121f",
          border: "1px solid #2a2a40",
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(0,212,255,0.15)",
          padding: "28px 24px",
          textAlign: "center",
          color: "#e2e8f0",
        }}
      >
        <div style={{ fontSize: "36px", marginBottom: "12px" }}>
          {"\u{1F4DD}"}
        </div>

        <h2
          style={{
            fontSize: "18px",
            fontWeight: "bold",
            color: "#00d4ff",
            margin: "0 0 8px",
          }}
        >
          Note Limit Reached
        </h2>

        <p
          style={{
            fontSize: "14px",
            color: "#94a3b8",
            margin: "0 0 20px",
            lineHeight: "1.5",
          }}
        >
          You've reached{" "}
          <span style={{ color: "#00d4ff", fontWeight: "bold" }}>
            {noteCount !== null ? noteCount : FREE_NOTE_LIMIT} / {FREE_NOTE_LIMIT}
          </span>{" "}
          notes on the free plan. Upgrade to Pro for unlimited notes.
        </p>

        <button
          onClick={() => {
            // Placeholder for future payment integration
            window.open("https://notara.dev/pro", "_blank");
          }}
          style={{
            width: "100%",
            padding: "10px 16px",
            borderRadius: "10px",
            border: "none",
            backgroundColor: "#00d4ff",
            color: "#0a0a14",
            fontSize: "14px",
            fontWeight: "bold",
            cursor: "pointer",
            marginBottom: "10px",
          }}
        >
          Upgrade to Pro
        </button>

        <button
          onClick={onDismiss}
          style={{
            width: "100%",
            padding: "10px 16px",
            borderRadius: "10px",
            border: "1px solid #2a2a40",
            backgroundColor: "transparent",
            color: "#64748b",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
