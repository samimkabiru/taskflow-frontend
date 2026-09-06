"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ConnectionState = "connected" | "connecting" | "disconnected";

interface ConnectionContextType {
  status: ConnectionState;
  setStatus: (status: ConnectionState) => void;
}

const ConnectionContext = createContext<ConnectionContextType>({
  status: "connected",
  setStatus: () => {},
});

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionState>("connected");
  return (
    <ConnectionContext.Provider value={{ status, setStatus }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnectionStatus() {
  return useContext(ConnectionContext);
}

export default function ConnectionStatusIndicator({
  status: overrideStatus,
}: {
  status?: ConnectionState;
}) {
  const { status: contextStatus } = useConnectionStatus();
  const currentStatus = overrideStatus ?? contextStatus;

  const STATUS_CONFIG: Record<
    ConnectionState,
    { label: string; dotClass: string; ping: boolean }
  > = {
    connected: {
      label: "Live Sync Connected",
      dotClass: "bg-emerald-500",
      ping: true,
    },
    connecting: {
      label: "Connecting to Sync...",
      dotClass: "bg-amber-500",
      ping: true,
    },
    disconnected: {
      label: "Offline / Disconnected",
      dotClass: "bg-rose-500",
      ping: false,
    },
  };

  const config = STATUS_CONFIG[currentStatus];

  return (
    <SimpleTooltip content={config.label}>
      <div
        className="relative flex items-center justify-center p-1.5 rounded-full hover:bg-surface-high/50 transition-colors group cursor-pointer"
        aria-label={config.label}
      >
        <span className="relative flex h-2.5 w-2.5">
          {config.ping && (
            <span
              className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                config.dotClass
              )}
            />
          )}
          <span
            className={cn(
              "relative inline-flex rounded-full h-2.5 w-2.5",
              config.dotClass
            )}
          />
        </span>
      </div>
    </SimpleTooltip>
  );
}
