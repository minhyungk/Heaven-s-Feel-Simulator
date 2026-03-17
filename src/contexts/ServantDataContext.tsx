import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Servant } from "../data/types";
import defaultServants, { filterServants } from "../data/servants";

interface ServantDataContextType {
  servants: Servant[];
  loading: boolean;
  byId: Map<number, Servant>;
}

const ServantDataContext = createContext<ServantDataContextType>({
  servants: defaultServants,
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const lang = i18n.language;
    if (lang === "ko") {
      setServants(defaultServants);
      return;
    }
    setLoading(true);
    loadServants(lang).then((data) => {
      setServants(data);
      setLoading(false);
    });
  }, [i18n.language]);

  const byId = useMemo(() => {
    const map = new Map<number, Servant>();
    for (const s of servants) map.set(s.id, s);
    return map;
  }, [servants]);

  return (
    <ServantDataContext.Provider value={{ servants, loading, byId }}>
      {children}
    </ServantDataContext.Provider>
  );
}
