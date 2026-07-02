"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Icon } from "./icons";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void;
}

const Ctx = createContext<ToastCtx>({ toast: () => {} });

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = crypto.randomUUID().slice(0, 8);
    setItems((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-[9999] pointer-events-none">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-[13px] font-medium shadow-lg pointer-events-auto"
            style={{
              background: item.type === "error" ? "#be123c" : item.type === "success" ? "#141414" : "#2563eb",
              color: "white",
              animation: "toast-in 0.2s ease-out",
            }}
          >
            {item.type === "success" && <Icon name="check" size={13} strokeWidth={2.4} />}
            {item.type === "error" && <Icon name="close" size={13} strokeWidth={2.4} />}
            {item.type === "info" && <Icon name="bolt" size={13} strokeWidth={2} />}
            {item.message}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Ctx.Provider>
  );
}
