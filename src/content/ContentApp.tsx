import { useState, useEffect } from "react";
import { useNotes } from "../hooks/useNotes";
import { useAlerts } from "../hooks/useAlerts";
import FloatingPanel from "./components/FloatingPanel";
import AlertToast from "./components/AlertToast";
import UpgradeModal from "./components/UpgradeModal";

export default function ContentApp() {
  const url = window.location.href;
  const { notes, addNote, removeNote, editNote, toggleScope, limitReached, setLimitReached } = useNotes(url);
  const { alerts, addAlert, removeAlert, editAlert, toggleAlert } = useAlerts(url);
  const [forceShow, setForceShow] = useState(0);

  useEffect(() => {
    const listener = (message: { type: string }) => {
      if (message.type === "TOGGLE_PANEL") {
        setForceShow((n) => n + 1);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  return (
    <>
      <AlertToast alerts={alerts} />
      <FloatingPanel
        notes={notes}
        url={url}
        onAddNote={addNote}
        onDeleteNote={removeNote}
        onEditNote={editNote}
        onToggleScope={toggleScope}
        alerts={alerts}
        onAddAlert={addAlert}
        onDeleteAlert={removeAlert}
        onEditAlert={editAlert}
        onToggleAlert={toggleAlert}
        forceShow={forceShow}
      />
      {limitReached && (
        <UpgradeModal onDismiss={() => setLimitReached(false)} />
      )}
    </>
  );
}
