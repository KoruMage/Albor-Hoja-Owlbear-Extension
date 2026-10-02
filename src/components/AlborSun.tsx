export interface AlborSunProps {
  /** Ancho en píxeles; el alto guarda la proporción 5:3. */
  size?: number;
  /** "color" es el logotipo; "line" es la ilustración a línea fina para estados vacíos. */
  variant?: "color" | "line";
  className?: string;
  /** Si se da, el sol se anuncia como imagen; si no, queda oculto a lectores de pantalla. */
  title?: string;
}

export function AlborSun({ size = 48, variant = "color", className, title }: AlborSunProps) {
  const line = variant === "line";
  const ray = line ? 1.5 : 2.5;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 60"
      width={size}
      height={(size * 3) / 5}
      fill="none"
      className={`albor-sun albor-sun--${variant} ${className ?? ""}`.trim()}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <line
        x1="10"
        y1="46"
        x2="90"
        y2="46"
        stroke="#b88e44"
        strokeWidth={line ? 1.5 : 2}
        strokeLinecap="round"
      />
      {line ? (
        <path d="M 32 46 A 18 18 0 0 1 68 46" stroke="#b88e44" strokeWidth="1.5" />
      ) : (
        <>
          <path d="M 32 46 A 18 18 0 0 1 68 46 Z" fill="#e08a2c" stroke="#8c6a28" strokeWidth="1.5" />
          <path d="M 38 46 A 12 12 0 0 1 62 46 Z" fill="#f5ab35" />
        </>
      )}
      <g stroke="#b88e44" strokeWidth={ray} strokeLinecap="round">
        <line x1="50" y1="24" x2="50" y2="10" />
        <line x1="37" y1="28" x2="26" y2="16" />
        <line x1="63" y1="28" x2="74" y2="16" />
      </g>
      {!line && <circle cx="50" cy="6" r="1.5" fill="#b88e44" />}
    </svg>
  );
}
