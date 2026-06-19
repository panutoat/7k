"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Unit } from "./types";

interface UnitsContextValue {
  units: Unit[];
  byId: Map<string, Unit>;
  getUnit: (id: string | null) => Unit | undefined;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const UnitsContext = createContext<UnitsContextValue | null>(null);

export function UnitsProvider({ children }: { children: React.ReactNode }) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/units");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "โหลดตัวละครไม่สำเร็จ");
      setUnits(data.units as Unit[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    reload();
  }, [reload]);

  const value = useMemo<UnitsContextValue>(() => {
    const byId = new Map(units.map((u) => [u.id, u]));
    return {
      units,
      byId,
      getUnit: (id) => (id ? byId.get(id) : undefined),
      loading,
      error,
      reload,
    };
  }, [units, loading, error, reload]);

  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

export function useUnits(): UnitsContextValue {
  const ctx = useContext(UnitsContext);
  if (!ctx) throw new Error("useUnits must be used within a UnitsProvider");
  return ctx;
}
