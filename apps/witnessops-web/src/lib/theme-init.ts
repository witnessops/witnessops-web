/** Runs before paint. Applies a theme only after a previous click stored one. */
export const THEME_INIT_SCRIPT =
  '(function(){try{var t=localStorage.getItem("wo-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();';
