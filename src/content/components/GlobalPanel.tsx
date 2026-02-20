import { useState, useEffect } from "react";
import type { Alert, Note } from "../../lib/types";
import { getAllNotes, getAllAlerts, deleteNote, deleteAlert, deleteGlobalAlert, updateAlert } from "../../lib/storage";
import { groupByDomainAndPath } from "../../lib/grouping";
import type { DomainHierarchy } from "../../lib/grouping";
import { NOTE_COLORS } from "../../lib/types";

type Tab = "notes" | "alerts";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatSchedule(alert: Alert): string | null {
  const s = alert.schedule;
  if (!s) return null;
  if (s.type === "daily") return `Daily ${s.timeOfDay}`;
  if (s.type === "weekly") return `Weekly, ${DAY_NAMES[s.dayOfWeek ?? 0]} ${s.timeOfDay}`;
  if (s.type === "custom") return `Every ${s.intervalMinutes}min`;
  return null;
}

export default function GlobalPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("notes");
  const [noteGroups, setNoteGroups] = useState<DomainHierarchy<Note>[]>([]);
  const [alertGroups, setAlertGroups] = useState<DomainHierarchy<Alert>[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const loadData = async () => {
    const [allNotes, allAlerts] = await Promise.all([getAllNotes(), getAllAlerts()]);
    setNoteGroups(groupByDomainAndPath(allNotes));
    setAlertGroups(groupByDomainAndPath(allAlerts));
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleExpand = (domain: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  };

  const handleDeleteNote = async (note: Note) => {
    await deleteNote(note);
    await loadData();
  };

  const handleDeleteAlert = async (alert: Alert) => {
    if (alert.scope === "global") {
      await deleteGlobalAlert(alert.id);
      if (alert.schedule) {
        chrome.runtime.sendMessage({ type: "CANCEL_ALERT", alarmName: alert.schedule.alarmName });
      }
    } else {
      await deleteAlert(alert);
    }
    await loadData();
  };

  const handleToggleAlert = async (alert: Alert) => {
    const updates = { enabled: !alert.enabled };
    await updateAlert(alert, updates);
    if (alert.schedule) {
      if (!alert.enabled) {
        chrome.runtime.sendMessage({ type: "SCHEDULE_ALERT", alert: { ...alert, ...updates } });
      } else {
        chrome.runtime.sendMessage({ type: "CANCEL_ALERT", alarmName: alert.schedule.alarmName });
      }
    }
    await loadData();
  };

  const groups = tab === "notes" ? noteGroups : [];
  const aGroups = tab === "alerts" ? alertGroups : [];

  return (
    <div
      style={{
        position: "absolute",
        right: "100%",
        top: 0,
        width: "300px",
        height: "100%",
        backgroundColor: "#12121f",
        borderRadius: "16px 0 0 16px",
        border: "1px solid #2a2a40",
        borderRight: "none",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "system-ui, -apple-system, sans-serif",
        boxShadow: "-4px 0 16px rgba(0,0,0,0.3)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          backgroundColor: "#1a1a2e",
          borderBottom: "1px solid #2a2a40",
        }}
      >
        <span style={{ fontSize: "14px", fontWeight: "bold", color: "#00d4ff" }}>
          All Items
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "16px",
            color: "#64748b",
            padding: "0 4px",
            lineHeight: 1,
          }}
          title="Close panel"
        >
          {"\u2715"}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #2a2a40" }}>
        {(["notes", "alerts"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "8px",
              background: tab === t ? "#1a1a2e" : "transparent",
              border: "none",
              borderBottom: tab === t ? "2px solid #00d4ff" : "2px solid transparent",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
              color: tab === t ? "#00d4ff" : "#64748b",
              textTransform: "uppercase" as const,
              letterSpacing: "0.05em",
            }}
          >
            {t === "notes" ? "\u{1F4DD}" : "\u{1F514}"} {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
        {/* Notes tab */}
        {tab === "notes" && (
          groups.length === 0 ? (
            <div style={{ textAlign: "center", color: "#64748b", fontSize: "12px", padding: "24px 0" }}>
              No notes found.
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.domain} style={{ marginBottom: "4px" }}>
                <button
                  onClick={() => toggleExpand(`n_${group.domain}`)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    backgroundColor: "#1a1a2e",
                    border: "1px solid #2a2a40",
                    cursor: "pointer",
                    color: "#e2e8f0",
                    fontSize: "12px",
                    fontWeight: 500,
                    textAlign: "left" as const,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, overflow: "hidden" }}>
                    <span style={{ color: "#64748b", fontSize: "10px" }}>
                      {expanded.has(`n_${group.domain}`) ? "\u25BC" : "\u25B6"}
                    </span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                      {group.domain}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "1px 6px",
                      borderRadius: "10px",
                      backgroundColor: "rgba(0,212,255,0.15)",
                      color: "#00d4ff",
                      flexShrink: 0,
                    }}
                  >
                    {group.totalCount}
                  </span>
                </button>

                {expanded.has(`n_${group.domain}`) && (
                  <div style={{ marginLeft: "12px", marginTop: "4px" }}>
                    {group.paths.map((pathGroup) => (
                      <div key={pathGroup.path} style={{ marginBottom: "2px" }}>
                        <button
                          onClick={() => toggleExpand(`n_${group.domain}_${pathGroup.path}`)}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "4px 8px",
                            borderRadius: "5px",
                            backgroundColor: "#151522",
                            border: "1px solid #232340",
                            cursor: "pointer",
                            color: "#c4cdd8",
                            fontSize: "11px",
                            fontWeight: 400,
                            textAlign: "left" as const,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "5px", minWidth: 0, overflow: "hidden" }}>
                            <span style={{ color: "#64748b", fontSize: "9px" }}>
                              {expanded.has(`n_${group.domain}_${pathGroup.path}`) ? "\u25BC" : "\u25B6"}
                            </span>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                              {pathGroup.path}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: "9px",
                              padding: "1px 5px",
                              borderRadius: "10px",
                              backgroundColor: "rgba(0,212,255,0.1)",
                              color: "#00d4ff",
                              flexShrink: 0,
                            }}
                          >
                            {pathGroup.items.length}
                          </span>
                        </button>

                        {expanded.has(`n_${group.domain}_${pathGroup.path}`) && (
                          <div style={{ marginLeft: "10px", marginTop: "2px" }}>
                            {pathGroup.items.map((note) => (
                              <div
                                key={note.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  padding: "5px 8px",
                                  marginBottom: "2px",
                                  borderRadius: "6px",
                                  backgroundColor: "#0a0a14",
                                  fontSize: "11px",
                                }}
                              >
                                <div
                                  style={{
                                    width: "8px",
                                    height: "8px",
                                    borderRadius: "50%",
                                    backgroundColor: NOTE_COLORS[note.color],
                                    flexShrink: 0,
                                  }}
                                />
                                <span
                                  style={{
                                    fontSize: "10px",
                                    flexShrink: 0,
                                  }}
                                  title={note.scope === "site" ? "Site note" : "Page note"}
                                >
                                  {note.scope === "site" ? "\u{1F310}" : "\u{1F4C4}"}
                                </span>
                                <span
                                  style={{
                                    flex: 1,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap" as const,
                                    color: "#e2e8f0",
                                  }}
                                >
                                  {note.text || "(empty)"}
                                </span>
                                <button
                                  onClick={() => handleDeleteNote(note)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "#94a3b8",
                                    fontSize: "11px",
                                    padding: "0 2px",
                                    lineHeight: 1,
                                    flexShrink: 0,
                                  }}
                                  title="Delete"
                                >
                                  {"\u2715"}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )
        )}

        {/* Alerts tab */}
        {tab === "alerts" && (
          aGroups.length === 0 ? (
            <div style={{ textAlign: "center", color: "#64748b", fontSize: "12px", padding: "24px 0" }}>
              No alerts found.
            </div>
          ) : (
            aGroups.map((group) => (
              <div key={group.domain} style={{ marginBottom: "4px" }}>
                <button
                  onClick={() => toggleExpand(`a_${group.domain}`)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    backgroundColor: "#1a1a2e",
                    border: "1px solid #2a2a40",
                    cursor: "pointer",
                    color: "#e2e8f0",
                    fontSize: "12px",
                    fontWeight: 500,
                    textAlign: "left" as const,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, overflow: "hidden" }}>
                    <span style={{ color: "#64748b", fontSize: "10px" }}>
                      {expanded.has(`a_${group.domain}`) ? "\u25BC" : "\u25B6"}
                    </span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                      {group.domain}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "1px 6px",
                      borderRadius: "10px",
                      backgroundColor: "rgba(0,212,255,0.15)",
                      color: "#00d4ff",
                      flexShrink: 0,
                    }}
                  >
                    {group.totalCount}
                  </span>
                </button>

                {expanded.has(`a_${group.domain}`) && (
                  <div style={{ marginLeft: "12px", marginTop: "4px" }}>
                    {group.paths.map((pathGroup) => (
                      <div key={pathGroup.path} style={{ marginBottom: "2px" }}>
                        <button
                          onClick={() => toggleExpand(`a_${group.domain}_${pathGroup.path}`)}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "4px 8px",
                            borderRadius: "5px",
                            backgroundColor: "#151522",
                            border: "1px solid #232340",
                            cursor: "pointer",
                            color: "#c4cdd8",
                            fontSize: "11px",
                            fontWeight: 400,
                            textAlign: "left" as const,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "5px", minWidth: 0, overflow: "hidden" }}>
                            <span style={{ color: "#64748b", fontSize: "9px" }}>
                              {expanded.has(`a_${group.domain}_${pathGroup.path}`) ? "\u25BC" : "\u25B6"}
                            </span>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                              {pathGroup.path}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: "9px",
                              padding: "1px 5px",
                              borderRadius: "10px",
                              backgroundColor: "rgba(0,212,255,0.1)",
                              color: "#00d4ff",
                              flexShrink: 0,
                            }}
                          >
                            {pathGroup.items.length}
                          </span>
                        </button>

                        {expanded.has(`a_${group.domain}_${pathGroup.path}`) && (
                          <div style={{ marginLeft: "10px", marginTop: "2px" }}>
                            {pathGroup.items.map((alert) => {
                              const scheduleLabel = formatSchedule(alert);
                              return (
                                <div
                                  key={alert.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "5px 8px",
                                    marginBottom: "2px",
                                    borderRadius: "6px",
                                    backgroundColor: "#0a0a14",
                                    fontSize: "11px",
                                    opacity: alert.enabled ? 1 : 0.6,
                                  }}
                                >
                                  <button
                                    onClick={() => handleToggleAlert(alert)}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                      fontSize: "12px",
                                      padding: 0,
                                      lineHeight: 1,
                                      flexShrink: 0,
                                    }}
                                    title={alert.enabled ? "Disable" : "Enable"}
                                  >
                                    {alert.enabled ? "\u2705" : "\u26AA"}
                                  </button>
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      flexShrink: 0,
                                    }}
                                    title={alert.scope === "global" ? "Global" : alert.scope === "site" ? "Site alert" : "Page alert"}
                                  >
                                    {alert.scope === "global" ? "\u{1F30D}" : alert.scope === "site" ? "\u{1F310}" : "\u{1F4C4}"}
                                  </span>
                                  <span
                                    style={{
                                      flex: 1,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap" as const,
                                      color: "#e2e8f0",
                                    }}
                                  >
                                    {alert.message || "(no message)"}
                                  </span>
                                  {scheduleLabel && (
                                    <span
                                      style={{
                                        fontSize: "9px",
                                        color: "#00d4ff",
                                        backgroundColor: "rgba(0,212,255,0.1)",
                                        padding: "1px 5px",
                                        borderRadius: "8px",
                                        flexShrink: 0,
                                        whiteSpace: "nowrap" as const,
                                      }}
                                      title={scheduleLabel}
                                    >
                                      {"\u{23F0}"} {scheduleLabel}
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleDeleteAlert(alert)}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                      color: "#94a3b8",
                                      fontSize: "11px",
                                      padding: "0 2px",
                                      lineHeight: 1,
                                      flexShrink: 0,
                                    }}
                                    title="Delete"
                                  >
                                    {"\u2715"}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
