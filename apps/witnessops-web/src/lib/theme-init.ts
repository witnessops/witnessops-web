/** Runs before paint. A stored click wins; otherwise the system preference applies. Nothing is written here. */
export const THEME_INIT_SCRIPT =
  '(function(){try{var t=localStorage.getItem("wo-theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t);}catch(e){}})();';
