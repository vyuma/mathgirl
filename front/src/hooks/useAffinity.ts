"use client";

import { useCallback } from "react";
import { authFetch } from "@/lib/api/authFetch";
import { useAffinityStore } from "@/stores/affinityStore";

export function useAffinity() {
  const affinity = useAffinityStore((s) => s.affinity);
  const setAffinity = useAffinityStore((s) => s.setAffinity);
  const showGain = useAffinityStore((s) => s.showGain);

  const fetchAffinity = useCallback(async () => {
    try {
      const res = await authFetch("/api/backend/users/me");
      if (!res.ok) return;
      const data = await res.json();
      const newAffinity: number = data.affinity;
      const gain = newAffinity - affinity;
      setAffinity(newAffinity);
      if (gain > 0) showGain(gain);
    } catch {
      // silent
    }
  }, [affinity, setAffinity, showGain]);

  const addAffinity = useCallback(async (gain: number) => {
    // Optimistic update
    const next = affinity + gain;
    setAffinity(next);
    showGain(gain);
    try {
      const res = await authFetch("/api/backend/users/me/affinity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gain }),
      });
      if (res.ok) {
        const data = await res.json();
        setAffinity(data.affinity);
      }
    } catch {
      // silent — optimistic value stays
    }
  }, [affinity, setAffinity, showGain]);

  return { fetchAffinity, addAffinity };
}
