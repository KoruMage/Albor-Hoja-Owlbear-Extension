import type { ReactNode } from "react";
import { NumberField } from "./fields";

export function ResourceBox({
  title,
  leftLabel,
  rightLabel,
  actual,
  max,
  extraLabel,
  extra,
  small,
  readOnly,
  onActual,
  onMax,
  onExtra,
}: {
  title: string;
  leftLabel: string;
  rightLabel: string;
  actual: number;
  max: number;
  extraLabel?: string;
  extra?: number;
  small?: boolean;
  readOnly?: boolean;
  onActual: (n: number) => void;
  onMax: (n: number) => void;
  onExtra?: (n: number) => void;
}) {
  const hasExtra = onExtra && extraLabel !== undefined && extra !== undefined;
  return (
    <div className={small ? "resource-box resource-box--small" : "resource-box"}>
      <div className="resource-box__head">
        <h4 className="resource-box__title">{title}</h4>
        {hasExtra && (
          <label className="resource-box__extra">
            {extraLabel}
            <NumberField value={extra} readOnly={readOnly} onChange={onExtra} />
          </label>
        )}
      </div>
      <span className="resource">
        <label className="resource__cell resource__cell--actual">
          <NumberField value={actual} readOnly={readOnly} onChange={onActual} />
          {leftLabel}
        </label>
        <span className="resource__sep" aria-hidden="true">
          /
        </span>
        <label className="resource__cell">
          <NumberField value={max} readOnly={readOnly} onChange={onMax} />
          {rightLabel}
        </label>
      </span>
    </div>
  );
}

export function SingleResource({ title, children }: { title: string; children: ReactNode }) {
  return (
    <label className="resource-box resource-box--small resource-box--single">
      <span className="resource-box__title">{title}</span>
      {children}
    </label>
  );
}
