(() => {
  const script = document.createElement("script");
  script.onload = () => {
    const stats = new Stats();
    const _panels = [0, 1, 2]; // 0: fps, 1: ms, 2: mbtion = 'relative';
    // stats.dom.style.float = 'left';
    stats.dom.style.top = "unset";
    stats.dom.style.left = "unset";

    stats.dom.style.bottom = "6rem";
    stats.dom.style.right = "0rem";
    for (const child of stats.dom.children) {
      child.classList.add("d-block");
    }
    document.body.appendChild(stats.dom);
    requestAnimationFrame(function loop() {
      stats.update();
      requestAnimationFrame(loop);
    });
  };
  script.src = "//mrdoob.github.io/stats.js/build/stats.min.js";
  document.head.appendChild(script);
})();
