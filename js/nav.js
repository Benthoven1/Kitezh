document.querySelectorAll(".nav-item.has-dropdown").forEach((item) => {
  const trigger = item.querySelector(".nav-trigger");
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const wasOpen = item.classList.contains("open");
    document.querySelectorAll(".nav-item.open").forEach((el) => el.classList.remove("open"));
    if (!wasOpen) { item.classList.add("open"); trigger.setAttribute("aria-expanded", "true"); }
    else           { trigger.setAttribute("aria-expanded", "false"); }
  });
  item.addEventListener("mouseenter", () => {
    if (window.matchMedia("(hover: hover)").matches) {
      document.querySelectorAll(".nav-item.open").forEach((el) => el.classList.remove("open"));
      item.classList.add("open");
    }
  });
  item.addEventListener("mouseleave", () => item.classList.remove("open"));
});

document.addEventListener("click", () => {
  document.querySelectorAll(".nav-item.open").forEach((el) => el.classList.remove("open"));
});
