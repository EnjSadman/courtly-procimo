export const THEME_STORAGE_KEY = "courtly-theme";
export const THEME_CHANGE_EVENT = "courtly-theme-change";

export type Theme = "light" | "dark";

export function isTheme(value: string | null | undefined): value is Theme {
  return value === "light" || value === "dark";
}

export function resolveTheme(stored: string | null): Theme {
  return isTheme(stored) ? stored : "dark";
}

export function getStoredTheme(): Theme {
  return resolveTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
}

export function subscribeToTheme(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
  };
}

export function applyThemeToDocument(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
}

export function writeTheme(theme: Theme) {
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyThemeToDocument(theme);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}
