import { CheckCircle, WarningCircle, Info, X } from "@phosphor-icons/react";

export function ToastContainer({ toasts = [], onRemove }) {
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 z-[110] flex flex-col items-center md:items-end gap-2 pointer-events-none w-max max-w-[calc(100vw-2rem)] md:max-w-md">
      {toasts.map((t) => {
        const isSuccess = t.type === "success";
        const isError = t.type === "error";

        return (
          <div
            key={t.id}
            onClick={() => onRemove(t.id)}
            className="pointer-events-auto w-auto max-w-[calc(100vw-2rem)] md:max-w-md mx-auto md:mx-0 px-4 py-2.5 rounded-xl shadow-lg text-sm inline-flex items-center gap-2.5 bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-2xl cursor-pointer transition-all animate-in slide-in-from-bottom-4 fade-in duration-200 hover:border-zinc-700"
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
