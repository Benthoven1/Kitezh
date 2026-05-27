document.querySelectorAll(".nav-item.has-dropdown").forEach((item) => {
  const trigger = item.querySelector(".nav-trigger");
  let leaveTimer = null;

  function closeItem(el) {
    el.classList.remove("open");
    el.querySelector(".nav-trigger").setAttribute("aria-expanded", "false");
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    clearTimeout(leaveTimer);
    const wasOpen = item.classList.contains("open");
    document.querySelectorAll(".nav-item.open").forEach(closeItem);
    if (!wasOpen) {
      item.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");
    }
  });

  item.addEventListener("mouseenter", () => {
    clearTimeout(leaveTimer);
    if (window.matchMedia("(hover: hover)").matches) {
      document.querySelectorAll(".nav-item.open").forEach(closeItem);
      item.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");
    }
  });

  item.addEventListener("mouseleave", () => {
    leaveTimer = setTimeout(() => closeItem(item), 150);
  });
});

document.addEventListener("click", () => {
  document.querySelectorAll(".nav-item.open").forEach((el) => {
    el.classList.remove("open");
    el.querySelector(".nav-trigger").setAttribute("aria-expanded", "false");
  });
  // Close mobile menu when clicking outside the navbar
  const nb = document.querySelector(".navbar");
  const bg = document.querySelector(".nav-burger");
  if (nb && nb.classList.contains("menu-open")) {
    nb.classList.remove("menu-open");
    if (bg) { bg.setAttribute("aria-expanded", "false"); bg.setAttribute("aria-label", "Open menu"); }
  }
});

// Mobile burger toggle
(function () {
  const burger = document.querySelector(".nav-burger");
  const navbar = document.querySelector(".navbar");
  if (!burger || !navbar) return;
  burger.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = navbar.classList.toggle("menu-open");
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
}());
