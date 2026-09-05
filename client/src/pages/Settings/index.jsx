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
    <div className="w-full space-y-6 pb-12">
      <div className="pb-3 border-b border-border">
        <h2 className="text-xl font-bold tracking-tight text-text-primary">Global Settings</h2>
        <p className="text-xs text-text-muted mt-0.5">
          Manage identity, monitor storage & token quotas, and configure Bring-Your-Own-Key parameters.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start w-full">
        <div className="w-full md:w-64 lg:w-72 shrink-0 flex md:flex-col gap-1.5 overflow-x-auto pb-2 md:pb-0 border-b md:border-b-0 md:border-r border-border md:pr-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap text-left ${
                  isActive
                    ? "bg-surface-card border border-border text-accent shadow-xs font-semibold"
                    : "text-text-muted hover:text-text-primary hover:bg-surface"
                }`}
              >
                <Icon size={16} className={isActive ? "text-accent" : "text-text-muted"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 w-full min-w-0 bg-surface-card p-6 md:p-8 rounded-xl border border-border shadow-xs">
          {activeTab === "profile" && <ProfileSettings />}
          {activeTab === "billing" && <BillingSettings />}
          {activeTab === "api" && <ApiSettings />}
        </div>
      </div>
    </div>
  );
}

export default Settings;
