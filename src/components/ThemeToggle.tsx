import { useState } from "react";
import { readTheme, writeTheme, type ThemeName } from "../theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeName>(readTheme);
  const dark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      role="switch"
      aria-checked={dark}
      onClick={() => {
        const next: ThemeName = dark ? "light" : "dark";
        setTheme(next);
        writeTheme(next);
      }}
    >
      <span className="theme-toggle__track" aria-hidden="true">
        <span className="theme-toggle__knob" />
      </span>
      Noche
    </button>
  );
}
