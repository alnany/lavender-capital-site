(function () {
  "use strict";
  var TABS = ["overview", "lavender", "janys", "team", "contact"];
  var TITLES = {
    overview: "Lavender Capital — Web3 Venture Capital & Digital Asset Advisory | Hong Kong",
    lavender: "Lavender Capital — Web3 & Blockchain Venture Capital",
    janys: "Janys Capital — Digital Asset M&A, Tokenization & Capital Markets Advisory",
    team: "Team — Lavender Capital & Janys Capital",
    contact: "Contact — Lavender Capital & Janys Capital"
  };

  var pages = document.querySelectorAll("[data-page]");
  var tabs = document.querySelectorAll("[data-tab-target]");
  var navTabs = document.querySelectorAll(".nav-link");
  var nav = document.querySelector(".nav");
  var mobileMenuToggle = document.getElementById("mobileMenuToggle");
  var mobilePanel = document.getElementById("mobilePanel");
  var menuOpenIcon = document.getElementById("menuOpenIcon");
  var menuCloseIcon = document.getElementById("menuCloseIcon");

  function closeMobileMenu() {
    mobilePanel.classList.remove("open");
    mobileMenuToggle.setAttribute("aria-expanded", "false");
    menuOpenIcon.classList.remove("hidden");
    menuCloseIcon.classList.add("hidden");
  }

  function openTab(tabName, pushHash) {
    if (TABS.indexOf(tabName) === -1) tabName = "overview";
    pages.forEach(function (page) { page.classList.toggle("active", page.dataset.page === tabName); });
    navTabs.forEach(function (tab) { tab.classList.toggle("active", tab.dataset.tabTarget === tabName); });
    document.title = TITLES[tabName] || TITLES.overview;
    closeMobileMenu();
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (pushHash !== false) {
      if (tabName === "overview") history.replaceState(null, "", window.location.pathname);
      else history.replaceState(null, "", "#" + tabName);
    }
    requestAnimationFrame(revealVisible);
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var target = this.getAttribute("data-tab-target");
      if (target) openTab(target);
    });
  });

  window.addEventListener("hashchange", function () {
    openTab((window.location.hash || "#overview").slice(1), false);
  });

  mobileMenuToggle.addEventListener("click", function () {
    var isOpen = mobilePanel.classList.toggle("open");
    mobileMenuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    menuOpenIcon.classList.toggle("hidden", isOpen);
    menuCloseIcon.classList.toggle("hidden", !isOpen);
  });

  /* ---------- Nav scroll state ---------- */
  var lastY = 0;
  window.addEventListener("scroll", function () {
    var y = window.scrollY;
    if ((y > 12) !== (lastY > 12)) nav.classList.toggle("scrolled", y > 12);
    lastY = y;
  }, { passive: true });

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  var io = null;
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  }
  function revealVisible() {
    revealEls.forEach(function (el) {
      if (el.classList.contains("in")) return;
      if (io && el.offsetParent !== null) io.observe(el);
      else if (!io) el.classList.add("in");
    });
  }
  /* stagger children of grids */
  document.querySelectorAll("[data-stagger]").forEach(function (wrap) {
    Array.prototype.forEach.call(wrap.children, function (child, i) {
      child.style.setProperty("--d", (i * 110) + "ms");
    });
  });
  revealVisible();

  /* ---------- Card spotlight ---------- */
  var fine = window.matchMedia("(pointer: fine)").matches;
  if (fine) {
    document.querySelectorAll(".card, .mandate-card, .member-card").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
        card.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
      });
    });
  }

  /* ---------- Contact form ---------- */
  var optionChips = document.querySelectorAll(".option-chip");
  var selectedAreasInput = document.getElementById("selected_areas");
  var form = document.getElementById("contactForm");
  var formMessage = document.getElementById("formMessage");
  var successState = document.getElementById("successState");
  var selectedAreas = [];

  optionChips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var value = this.getAttribute("data-chip");
      var index = selectedAreas.indexOf(value);
      if (index >= 0) { selectedAreas.splice(index, 1); this.classList.remove("active"); }
      else { selectedAreas.push(value); this.classList.add("active"); }
      selectedAreasInput.value = selectedAreas.join(", ");
    });
  });

  function val(id) { return document.getElementById(id).value.trim(); }

  document.getElementById("openMailClient").addEventListener("click", function () {
    formMessage.innerHTML = "";
    var required = ["first_name", "last_name", "email", "role_type", "primary_interest", "brief"];
    var missing = required.some(function (id) { return !val(id); });
    if (missing) {
      formMessage.innerHTML = '<div class="alert error">Please complete all required fields before submitting.</div>';
      formMessage.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    var subject = encodeURIComponent("Enquiry — " + val("first_name") + " " + val("last_name") + (val("organisation") ? " (" + val("organisation") + ")" : ""));
    var body = encodeURIComponent(
      "Name: " + val("first_name") + " " + val("last_name") + "\n" +
      "Email: " + val("email") + "\n" +
      "Organisation: " + (val("organisation") || "—") + "\n" +
      "Reaching out as: " + val("role_type") + "\n" +
      "Primary interest: " + val("primary_interest") + "\n" +
      "Collaboration areas: " + (selectedAreas.join(", ") || "—") + "\n\n" +
      val("brief")
    );
    window.location.href = "mailto:info@lavendercapital.vc?subject=" + subject + "&body=" + body;
    form.classList.add("hidden");
    successState.classList.remove("hidden");
  });

  /* ---------- Initial route: #hash or legacy ?tab= ---------- */
  var params = new URLSearchParams(window.location.search);
  var initial = (window.location.hash || "").slice(1) || params.get("tab") || "overview";
  if (initial !== "overview") openTab(initial, true);
  else revealVisible();
})();
