import {
  createContext,
  KeyboardEvent,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

export interface ConfirmOptions {
  message: ReactNode;
  detail?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export interface AlertOptions {
  message: ReactNode;
  detail?: ReactNode;
  confirmLabel?: string;
}

export interface DialogApi {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: ReactNode | AlertOptions) => Promise<void>;
}

type Request = { id: number } & (
  | { kind: "confirm"; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | { kind: "alert"; options: AlertOptions; resolve: () => void }
);

const DialogContext = createContext<DialogApi | null>(null);

function textOf(node: ReactNode): string {
  return typeof node === "string" || typeof node === "number" ? String(node) : "";
}

const nativeDialogs: DialogApi = {
  confirm: async ({ message }) => window.confirm(textOf(message)),
  alert: async (options) => {
    const message = isAlertOptions(options) ? options.message : options;
    window.alert(textOf(message));
  },
};

function isAlertOptions(value: ReactNode | AlertOptions): value is AlertOptions {
  return typeof value === "object" && value !== null && "message" in value;
}

/** Sin DialogProvider arriba, cae en los diálogos nativos del navegador. */
export function useDialog(): DialogApi {
  return useContext(DialogContext) ?? nativeDialogs;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Request[]>([]);
  const nextId = useRef(0);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        const id = nextId.current++;
        setQueue((q) => [...q, { id, kind: "confirm", options, resolve }]);
      }),
    [],
  );

  const alert = useCallback(
    (options: ReactNode | AlertOptions) =>
      new Promise<void>((resolve) => {
        const id = nextId.current++;
        const normalized = isAlertOptions(options) ? options : { message: options };
        setQueue((q) => [...q, { id, kind: "alert", options: normalized, resolve }]);
      }),
    [],
  );

  const api = useMemo(() => ({ confirm, alert }), [confirm, alert]);
  const current = queue[0] ?? null;

  const settle = (ok: boolean) => {
    if (!current) return;
    if (current.kind === "confirm") current.resolve(ok);
    else current.resolve();
    setQueue((q) => q.slice(1));
  };

  return (
    <DialogContext.Provider value={api}>
      {children}
      {current && <ConfirmDialog key={current.id} request={current} onSettle={settle} />}
    </DialogContext.Provider>
  );
}

const FOCUSABLE =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

function ConfirmDialog({ request, onSettle }: { request: Request; onSettle: (ok: boolean) => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const detailId = `${baseId}-detail`;
  const { options } = request;
  const isConfirm = request.kind === "confirm";
  const danger = isConfirm && Boolean((options as ConfirmOptions).danger);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    (isConfirm ? cancelRef.current : confirmRef.current)?.focus();
    return () => previous?.focus?.();
  }, [isConfirm]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onSettle(false);
      return;
    }
    if (e.key !== "Tab") return;
    const nodes = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (nodes.length === 0) {
      e.preventDefault();
      return;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !dialogRef.current?.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="dialog-backdrop">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={options.detail ? detailId : undefined}
        className={`panel dialog${danger ? " dialog--danger" : ""}`}
        onKeyDown={onKeyDown}
      >
        <h2 id={titleId} className="dialog__title">
          {options.message}
        </h2>
        {options.detail && (
          <p id={detailId} className="dialog__detail">
            {options.detail}
          </p>
        )}
        <div className="dialog__actions">
          {isConfirm ? (
            <>
              <button ref={cancelRef} type="button" onClick={() => onSettle(false)}>
                {(options as ConfirmOptions).cancelLabel ?? "Cancelar"}
              </button>
              <button
                ref={confirmRef}
                type="button"
                className={danger ? "btn-danger" : "btn-primary"}
                onClick={() => onSettle(true)}
              >
                {options.confirmLabel ?? "Aceptar"}
              </button>
            </>
          ) : (
            <button ref={confirmRef} type="button" className="btn-primary" onClick={() => onSettle(true)}>
              {options.confirmLabel ?? "Entendido"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
