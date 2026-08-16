(() => {
  // this only discourages casual inspection; browser code can never be truly hidden
  document.addEventListener("contextmenu", (event) => event.preventDefault());

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    const blocked =
      event.key === "F12" ||
      (event.ctrlKey && event.shiftKey && ["i", "j", "c", "."].includes(key)) ||
      (event.ctrlKey && key === "u");

    if (blocked) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
})();