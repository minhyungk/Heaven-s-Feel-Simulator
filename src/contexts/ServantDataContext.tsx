import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Servant } from "../data/types";
import defaultServants, { filterServants } from "../data/servants";
import { loadDialogues } from "../data/servantDialogues";

interface ServantDataContextType {
  servants: Servant[];
  /** JA-only servants not in current language pool (for catalyst summon) */
  jaOnlyServants: Servant[];
  loading: boolean;
  byId: Map<number, Servant>;
}

const ServantDataContext = createContext<ServantDataContextType>({
  servants: defaultServants,
  jaOnlyServants: [],
  loading: false,
  byId: new Map(defaultServants.map((s) => [s.id, s])),
});

export function useServantData() {
  return useContext(ServantDataContext);
}

/** Resolves any Servant object to its current-language version by ID */
export function useServantResolver() {
  const { byId } = useServantData();
  return useCallback((s: Servant): Servant => byId.get(s.id) ?? s, [byId]);
}

async function loadServants(lang: string): Promise<Servant[]> {
  try {
    let mod;
    if (lang === "en") {
      mod = await import("../data/servants-en.json");
    } else if (lang === "ja") {
      mod = await import("../data/servants-ja.json");
    } else {
      return defaultServants;
    }
    const data = (mod.default ?? mod) as unknown as Servant[];
    return filterServants(data);
  } catch {
    return defaultServants;
  }
}

export function ServantDataProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const [servants, setServants] = useState<Servant[]>(defaultServants);
  const [jaOnlyServants, setJaOnlyServants] = useState<Servant[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const lang = i18n.language;
    // Preload dialogue data for current language
    if (lang !== "ko") loadDialogues(lang);
    if (lang === "ko") {
      setServants(defaultServants);
    } else {
      setLoading(true);
      loadServants(lang).then((data) => {
        setServants(data);
        setLoading(false);
      });
    }
  }, [i18n.language]);

  // Load JA-only servants (those not in current language pool) for catalyst summon
  useEffect(() => {
    loadServants("ja").then((jaServants) => {
      const currentIds = new Set(servants.map((s) => s.id));
      setJaOnlyServants(jaServants.filter((s) => !currentIds.has(s.id)));
    });
  }, [servants]);

  const byId = useMemo(() => {
    const map = new Map<number, Servant>();
    for (const s of servants) map.set(s.id, s);
    for (const s of jaOnlyServants) map.set(s.id, s);
    return map;
  }, [servants, jaOnlyServants]);

  return (
    <ServantDataContext.Provider value={{ servants, jaOnlyServants, loading, byId }}>
      {children}
    </ServantDataContext.Provider>
  );
}
