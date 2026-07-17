/* Lavender Capital — motion & interaction */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Nav scrolled state (IntersectionObserver, no scroll listener) ---------- */
  var nav = document.getElementById("nav");
  var sentinel = document.createElement("div");
  sentinel.style.cssText = "position:absolute;top:0;height:1px;width:1px;";
  document.body.prepend(sentinel);
  new IntersectionObserver(function (entries) {
    nav.classList.toggle("scrolled", !entries[0].isIntersecting);
  }).observe(sentinel);

  /* ---------- Contact form -> mailto compose ---------- */
  var form = document.getElementById("enquiry");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      ["f-name", "f-email", "f-brief"].forEach(function (id) {
        var input = document.getElementById(id);
        var field = input.closest(".field");
        var err = field.querySelector(".field-err");
        var valid = input.checkValidity() && input.value.trim().length > 0;
        field.classList.toggle("invalid", !valid);
        err.hidden = valid;
        if (!valid) ok = false;
      });
      if (!ok) return;
      var name = document.getElementById("f-name").value.trim();
      var email = document.getElementById("f-email").value.trim();
      var brief = document.getElementById("f-brief").value.trim();
      var body = "Name: " + name + "\nEmail: " + email + "\n\n" + brief;
      window.location.href =
        "mailto:info@lavendercapital.vc?subject=" +
        encodeURIComponent("Enquiry - " + name) +
        "&body=" + encodeURIComponent(body);
    });
  }

  if (reduce || typeof gsap === "undefined") {
    // Reduced motion / no GSAP: reveal everything statically.
    document.querySelectorAll("[data-reveal]").forEach(function (el) { el.classList.add("in"); });
    document.querySelectorAll("[data-load], .line-mask .line").forEach(function (el) {
      el.style.opacity = "1"; el.style.transform = "none";
    });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Hero load-in ---------- */
  gsap.set("[data-load]", { opacity: 0 });
  gsap.set(".line-mask .line", { yPercent: 110 });
  var intro = gsap.timeline({ defaults: { ease: "power3.out" } });
  intro
    .to(".line-mask .line", { yPercent: 0, duration: 1.0, stagger: 0.12 }, 0.1)
    .to("[data-load='0']", { opacity: 1, duration: 0.7 }, 0.3)
    .to("[data-load='2'].hero-visual", { opacity: 1, duration: 1.1 }, 0.35)
    .to("[data-load='3'], [data-load='4']", { opacity: 1, duration: 0.8, stagger: 0.12 }, 0.7);

  /* ---------- Scroll reveals ---------- */
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 86%",
    once: true,
    onEnter: function (batch) {
      batch.forEach(function (el, i) {
        setTimeout(function () { el.classList.add("in"); }, i * 90);
      });
    }
  });

  /* ---------- Manifesto: word-by-word scrub ---------- */
  var mani = document.querySelector("[data-words]");
  if (mani) {
    var words = mani.textContent.trim().split(/\s+/);
    mani.textContent = "";
    words.forEach(function (w, i) {
      var s = document.createElement("span");
      s.className = "w";
      s.textContent = w;
      mani.appendChild(s);
      if (i < words.length - 1) mani.appendChild(document.createTextNode(" "));
    });
    gsap.fromTo(mani.querySelectorAll(".w"),
      { opacity: 0.14 },
      {
        opacity: 1, stagger: 0.06, ease: "none",
        scrollTrigger: { trigger: mani, start: "top 78%", end: "bottom 45%", scrub: true }
      }
    );
  }

  /* ---------- Image / numeral parallax ---------- */
  document.querySelectorAll("[data-parallax]").forEach(function (el) {
    var amount = parseFloat(el.getAttribute("data-parallax")) || 0;
    gsap.fromTo(el, { yPercent: -amount }, {
      yPercent: amount, ease: "none",
      scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true }
    });
  });

  /* ---------- Pinned arm panels (desktop only) ---------- */
  ScrollTrigger.matchMedia({
    "(min-width: 900px)": function () {
      var arms = gsap.utils.toArray(".arm");
      if (arms.length < 2) return;
      // Pin the first panel while the second scrolls over it.
      ScrollTrigger.create({
        trigger: arms[0],
        start: "top top",
        endTrigger: arms[1],
        end: "top top",
        pin: true,
        pinSpacing: false
      });
      gsap.fromTo(arms[0].querySelector(".arm-inner"),
        { opacity: 1, scale: 1 },
        {
          opacity: 0.35, scale: 0.97, ease: "none",
          scrollTrigger: { trigger: arms[1], start: "top bottom", end: "top top", scrub: true }
        }
      );
    }
  });

  /* ---------- Nav active link ---------- */
  document.querySelectorAll(".nav-links a").forEach(function (link) {
    var id = link.getAttribute("href");
    var target = document.querySelector(id);
    if (!target) return;
    ScrollTrigger.create({
      trigger: target,
      start: "top center",
      end: "bottom center",
      onToggle: function (self) { link.classList.toggle("active", self.isActive); }
    });
  });
})();
