// Applies the saved colour theme before first paint to avoid a flash of the wrong theme.
(function () {
  try {
    var t = localStorage.getItem("curio:theme");
    var dark = t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  } catch {}
})();
