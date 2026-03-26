import { useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface Tab {
  id: string;
  label: string;
  icon: string;
  content: ReactNode;
}

interface Props {
  tabs: Tab[];
}

export default function MobileTabLayout({ tabs }: Props) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="flex flex-col w-full" style={{ minHeight: "calc(100vh - 120px)" }}>
      {/* Active tab content */}
      <div className="flex-1 w-full">
        {tabs[activeTab]?.content}
      </div>

      {/* Bottom tab bar */}
      <div
        className="fixed bottom-0 left-0 right-0 flex z-50"
        style={{ background: "#0a0a1a", borderTop: "1px solid rgba(255,255,255,0.1)" }}
      >
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(i)}
            className="flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors cursor-pointer"
            style={{
              color: i === activeTab ? "#ffd700" : "#666",
              background: i === activeTab ? "rgba(255,215,0,0.05)" : "transparent",
            }}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function useTRPGTabs() {
  const { t } = useTranslation("trpg");
  return {
    status: { id: "status", label: t("tabs.status", "전황"), icon: "⚔" },
    log: { id: "log", label: t("tabs.log", "로그"), icon: "📜" },
    servant: { id: "servant", label: t("tabs.servant", "내 서번트"), icon: "👤" },
  };
}
