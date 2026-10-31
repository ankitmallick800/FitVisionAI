import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";

const BUTTON = {
  primary: "bg-lime text-bg hover:brightness-105",
  ghost: "border border-line bg-surface text-ink hover:border-lime/60",
  danger: "bg-danger text-white hover:brightness-110",
  quiet: "text-mute hover:text-ink",
} as const;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BUTTON }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${BUTTON[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-line bg-surface p-5 shadow-card ${className}`}>{children}</section>;
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error ? <span className="block text-xs text-danger">{error}</span> : hint ? <span className="block text-xs text-mute">{hint}</span> : null}
    </label>
  );
}

export const controlClass =
  "w-full rounded-2xl border border-line bg-bg px-4 py-3 text-ink outline-none placeholder:text-mute/70 focus:border-lime";

export function Chip({
  selected,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`rounded-full border px-3 py-2 text-sm transition ${selected ? "border-lime bg-lime/15 text-lime" : "border-line text-mute hover:text-ink"}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Ring({ value, label }: { value: number; label: string }) {
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <div className="relative grid h-24 w-24 place-items-center" aria-label={`${label} ${Math.round(value)} percent`}>
      <svg viewBox="0 0 88 88" className="h-24 w-24 -rotate-90">
        <circle cx="44" cy="44" r={radius} stroke="#2A3138" strokeWidth="8" fill="none" />
        <circle
          cx="44"
          cy="44"
          r={radius}
          stroke="#B8FF3B"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-mono text-lg font-medium">{Math.round(value)}%</div>
        <div className="text-[10px] uppercase tracking-wider text-mute">{label}</div>
      </div>
    </div>
  );
}

export function Badge({ children, tone = "mute" }: { children: ReactNode; tone?: "mute" | "lime" | "amber" }) {
  const styles = tone === "lime" ? "bg-lime/15 text-lime" : tone === "amber" ? "bg-amber/15 text-amber" : "bg-white/5 text-mute";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>{children}</span>;
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-line px-5 py-10 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-mute">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs leading-5 text-mute ${className}`}>
      FitVision AI is general fitness guidance, not medical advice. It does not diagnose, treat, or prevent injury. Stop if you feel pain, dizziness, or unusual discomfort. Pose feedback is an estimate from one camera.
    </p>
  );
}

export function Dialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
  danger = false,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  danger?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-card"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="dialog-title" className="text-xl font-semibold">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-mute">{body}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function useTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · FitVision AI`;
  }, [title]);
}
