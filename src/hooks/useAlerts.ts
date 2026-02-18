import { useState, useEffect, useCallback } from "react";
import type { Alert, NoteScope } from "../lib/types";
import {
  getAlertsForUrl,
  saveAlert,
  deleteAlert,
  updateAlert,
} from "../lib/storage";

export function useAlerts(url: string) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    const loaded = await getAlertsForUrl(url);
    setAlerts(loaded);
    setLoading(false);
  }, [url]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const addAlert = useCallback(
    async (scope: NoteScope = "page") => {
      const alert: Alert = {
        id: crypto.randomUUID(),
        url,
        scope,
        message: "",
        enabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveAlert(alert);
      setAlerts((prev) => [...prev, alert]);
      return alert;
    },
    [url]
  );

  const removeAlert = useCallback(async (alert: Alert) => {
    await deleteAlert(alert);
    setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
  }, []);

  const editAlert = useCallback(
    async (
      alert: Alert,
      updates: Partial<Omit<Alert, "id" | "url" | "createdAt">>
    ) => {
      await updateAlert(alert, updates);
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alert.id ? { ...a, ...updates, updatedAt: Date.now() } : a
        )
      );
    },
    []
  );

  const toggleAlert = useCallback(
    async (alert: Alert) => {
      await editAlert(alert, { enabled: !alert.enabled });
    },
    [editAlert]
  );

  return { alerts, loading, addAlert, removeAlert, editAlert, toggleAlert };
}
