import { useState } from "react";
import { User, Coins, Key } from "@phosphor-icons/react";
import { ProfileSettings } from "./ProfileSettings";
import { BillingSettings } from "./BillingSettings";
import { ApiSettings } from "./ApiSettings";

export function Settings() {
  const [activeTab, setActiveTab] = useState("profile");

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "billing", label: "Billing & Storage", icon: Coins },
    { id: "api", label: "API & Integrations", icon: Key }
  ];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
      <div className="pb-3 border-b border-border/40">
        <h2 className="text-xl font-bold tracking-tight text-text-primary">Global Settings</h2>
        <p className="text-xs text-text-muted mt-0.5">
          Manage identity, monitor storage & token quotas, and configure Bring-Your-Own-Key parameters.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="w-full md:w-56 shrink-0 flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 border-b md:border-b-0 md:border-r border-border/40 md:pr-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap text-left ${
                  isActive
                    ? "bg-zinc-900 border border-border/40 text-text-primary shadow-xs"
                    : "text-text-muted hover:text-text-primary hover:bg-zinc-900/40"
                }`}
              >
                <Icon size={16} className={isActive ? "text-accent" : "text-text-muted"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 w-full min-w-0 bg-zinc-950 p-6 rounded-xl border border-border/40 shadow-xl">
          {activeTab === "profile" && <ProfileSettings />}
          {activeTab === "billing" && <BillingSettings />}
          {activeTab === "api" && <ApiSettings />}
        </div>
      </div>
    </div>
  );
}

export default Settings;
