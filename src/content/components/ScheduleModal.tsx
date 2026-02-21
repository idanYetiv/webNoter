import { useState } from "react";
import type { AlertSchedule } from "../../lib/types";

type ScheduleType = "daily" | "weekly" | "custom";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface ScheduleModalProps {
  onSave: (message: string, schedule: AlertSchedule) => void;
  onCancel: () => void;
}

export default function ScheduleModal({ onSave, onCancel }: ScheduleModalProps) {
  const [message, setMessage] = useState("");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("daily");
  const [dayOfWeek, setDayOfWeek] = useState(0); // Sunday
  const [timeOfDay, setTimeOfDay] = useState("09:00");
  const [intervalMinutes, setIntervalMinutes] = useState(60);

  const handleSave = () => {
    if (!message.trim()) return;

    const alarmName = `notara_scheduled_${Date.now()}`;
    const schedule: AlertSchedule = {
      type: scheduleType,
      timeOfDay,
      alarmName,
      ...(scheduleType === "weekly" ? { dayOfWeek } : {}),
      ...(scheduleType === "custom" ? { intervalMinutes } : {}),
    };

    onSave(message.trim(), schedule);
  };

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2147483647,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "360px",
          backgroundColor: "#12121f",
          borderRadius: "16px",
          border: "1px solid #2a2a40",
          boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 16px",
            backgroundColor: "#1a1a2e",
            borderBottom: "1px solid #2a2a40",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "16px" }}>{"\u23F0"}</span>
          <span style={{ fontSize: "15px", fontWeight: "bold", color: "#00d4ff" }}>
            Schedule Alert
          </span>
        </div>

        <div style={{ padding: "16px" }}>
          {/* Message */}
          <label style={labelStyle}>Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Check account balance"
            style={{
              width: "100%",
              minHeight: "60px",
              backgroundColor: "#0a0a14",
              border: "1px solid #2a2a40",
              borderRadius: "8px",
              color: "#e2e8f0",
              fontSize: "13px",
              padding: "8px 10px",
              fontFamily: "inherit",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: "12px",
            }}
          />

          {/* Schedule type */}
          <label style={labelStyle}>Schedule</label>
          <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
            {(["daily", "weekly", "custom"] as ScheduleType[]).map((t) => (
              <button
                key={t}
                onClick={() => setScheduleType(t)}
                style={{
                  flex: 1,
                  padding: "7px 0",
                  backgroundColor: scheduleType === t ? "rgba(0,212,255,0.15)" : "#0a0a14",
                  border: `1px solid ${scheduleType === t ? "#00d4ff" : "#2a2a40"}`,
                  borderRadius: "8px",
                  color: scheduleType === t ? "#00d4ff" : "#64748b",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  textTransform: "capitalize" as const,
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Day of week picker (weekly only) */}
          {scheduleType === "weekly" && (
            <>
              <label style={labelStyle}>Day</label>
              <div style={{ display: "flex", gap: "4px", marginBottom: "12px" }}>
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => setDayOfWeek(i)}
                    style={{
                      flex: 1,
                      padding: "6px 0",
                      backgroundColor: dayOfWeek === i ? "rgba(0,212,255,0.15)" : "#0a0a14",
                      border: `1px solid ${dayOfWeek === i ? "#00d4ff" : "#2a2a40"}`,
                      borderRadius: "6px",
                      color: dayOfWeek === i ? "#00d4ff" : "#64748b",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Time picker (daily/weekly) */}
          {scheduleType !== "custom" && (
            <>
              <label style={labelStyle}>Time</label>
              <input
                type="time"
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  backgroundColor: "#0a0a14",
                  border: "1px solid #2a2a40",
                  borderRadius: "8px",
                  color: "#e2e8f0",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                  marginBottom: "12px",
                }}
              />
            </>
          )}

          {/* Interval input (custom only) */}
          {scheduleType === "custom" && (
            <>
              <label style={labelStyle}>Interval (minutes)</label>
              <input
                type="number"
                min={1}
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  backgroundColor: "#0a0a14",
                  border: "1px solid #2a2a40",
                  borderRadius: "8px",
                  color: "#e2e8f0",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                  marginBottom: "12px",
                }}
              />
            </>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
            <button
              onClick={onCancel}
              style={{
                flex: 1,
                padding: "10px",
                backgroundColor: "#1a1a2e",
                border: "1px solid #2a2a40",
                borderRadius: "8px",
                color: "#64748b",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!message.trim()}
              style={{
                flex: 1,
                padding: "10px",
                backgroundColor: message.trim() ? "#00d4ff" : "#2a2a40",
                border: "none",
                borderRadius: "8px",
                color: message.trim() ? "#0a0a14" : "#64748b",
                fontSize: "13px",
                fontWeight: 700,
                cursor: message.trim() ? "pointer" : "not-allowed",
              }}
            >
              Create Alert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 600,
  color: "#64748b",
  marginBottom: "4px",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};
