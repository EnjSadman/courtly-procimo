import { THEME_STORAGE_KEY } from "@/lib/theme";

export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var theme=t==="light"||t==="dark"?t:"dark";var r=document.documentElement;r.dataset.theme=theme;r.classList.toggle("dark",theme==="dark")}catch(e){}})();`,
      }}
    />
  );
}
