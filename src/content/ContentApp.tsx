import { useNotes } from "../hooks/useNotes";
import { useAlerts } from "../hooks/useAlerts";
import FloatingPanel from "./components/FloatingPanel";
import AlertToast from "./components/AlertToast";

export default function ContentApp() {
  const url = window.location.href;
  const { notes, addNote, removeNote, editNote, toggleScope } = useNotes(url);
  const { alerts, addAlert, removeAlert, editAlert, toggleAlert } = useAlerts(url);

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
      />
    </>
  );
}
