import { CheckCircle, WarningCircle, Info, X } from "@phosphor-icons/react";

export function ToastContainer({ toasts = [], onRemove }) {
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[110] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        const isSuccess = t.type === "success";
        const isError = t.type === "error";

        return (
          <div
            key={t.id}
            onClick={() => onRemove(t.id)}
            className="pointer-events-auto p-3.5 rounded-[var(--radius-md)] bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-2xl flex items-start gap-3 cursor-pointer transition-all animate-in slide-in-from-bottom-4 fade-in duration-200 hover:border-zinc-700"
          >
            <span className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle size={17} weight="fill" className="text-emerald-400" />}
              {isError && <WarningCircle size={17} weight="fill" className="text-rose-400" />}
              {!isSuccess && !isError && <Info size={17} weight="fill" className="text-blue-400" />}
            </span>
            <div className="flex-1 min-w-0">
              {t.title && <div className="text-[11px] font-semibold text-zinc-200">{t.title}</div>}
              <div className="text-xs text-zinc-400 leading-relaxed font-normal mt-0.5">{t.message}</div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(t.id);
              }}
              className="text-zinc-500 hover:text-zinc-300 shrink-0 cursor-pointer p-0.5"
              aria-label="Dismiss alert"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export { useToast, useNotifications } from "@/context/ToastContext";
export default ToastContainer;
