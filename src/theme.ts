import { appStorage } from "./web/appStorage";

export const THEME_KEY = "com.albor/theme";

export type ThemeName = "light" | "dark";

export function readTheme(): ThemeName {
  try {
    return appStorage().getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme: ThemeName): void {
  if (theme === "dark") document.documentElement.dataset.theme = "dark";
  else delete document.documentElement.dataset.theme;
}

export function writeTheme(theme: ThemeName): void {
  applyTheme(theme);
  try {
    appStorage().setItem(THEME_KEY, theme);
  } catch {
    // private mode
  }
}
