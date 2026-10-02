export function num(value: string, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function ReadValue({ value, className }: { value: string; className?: string }) {
  return (
    <span className={className ? `read-value ${className}` : "read-value"}>
      {value.trim() ? value : "\u00a0"}
    </span>
  );
}

export function TextField({
  value,
  readOnly,
  onChange,
  placeholder,
  ariaLabel,
  className,
}: {
  value: string;
  readOnly?: boolean;
  onChange: (next: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}) {
  if (readOnly) return <ReadValue value={value} className={className} />;
  return (
    <input
      className={className}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function NumberField({
  value,
  readOnly,
  onChange,
  fallback = 0,
  min,
  max,
  ariaLabel,
  className,
}: {
  value: number;
  readOnly?: boolean;
  onChange: (next: number) => void;
  fallback?: number;
  min?: number;
  max?: number;
  ariaLabel?: string;
  className?: string;
}) {
  if (readOnly) return <ReadValue value={String(value)} className={className} />;
  return (
    <input
      type="number"
      className={className}
      value={value}
      min={min}
      max={max}
      aria-label={ariaLabel}
      onChange={(e) => onChange(num(e.target.value, fallback))}
    />
  );
}

export function AreaField({
  value,
  readOnly,
  onChange,
  placeholder,
  ariaLabel,
  className,
  rows,
}: {
  value: string;
  readOnly?: boolean;
  onChange: (next: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  rows?: number;
}) {
  if (readOnly) {
    return <ReadValue value={value} className={`read-value--multiline ${className ?? ""}`} />;
  }
  return (
    <textarea
      className={className}
      value={value}
      rows={rows}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/** Línea de escritura con la muesca del extremo derecho (etiquetas, dominio, equipo). */
export function WriteLine({
  value,
  readOnly,
  onChange,
  ariaLabel,
}: {
  value: string;
  readOnly?: boolean;
  onChange: (next: string) => void;
  ariaLabel: string;
}) {
  return (
    <div className="write-line">
      <TextField value={value} readOnly={readOnly} onChange={onChange} ariaLabel={ariaLabel} />
    </div>
  );
}
