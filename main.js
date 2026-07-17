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

  /* ---------- Contact form: server-side send on lavendercapital.vc, mailto fallback elsewhere ---------- */
  var form = document.getElementById("enquiry");
  if (form) {
    var SERVER_SEND =
      /(^|\.)lavendercapital\.vc$/.test(location.hostname) && typeof fetch !== "undefined";
    var topicField = document.getElementById("f-topic");
    var topicNote = document.getElementById("form-topic");
    var formNote = document.getElementById("form-note");

    if (!SERVER_SEND && formNote) {
      formNote.textContent = "Opens your mail client with everything prefilled.";
    }

    // CTA buttons routing into the form with a preset topic.
    document.querySelectorAll("[data-topic]").forEach(function (a) {
      a.addEventListener("click", function () {
        var t = a.getAttribute("data-topic");
        if (topicField) topicField.value = t;
        if (topicNote) {
          topicNote.textContent = "Regarding: " + t;
          topicNote.hidden = false;
        }
      });
    });

    var mailtoSend = function (name, email, brief, topic) {
      var body = "Name: " + name + "\nEmail: " + email + "\n\n" + brief;
      window.location.href =
        "mailto:info@lavendercapital.vc?subject=" +
        encodeURIComponent((topic || "Enquiry") + " - " + name) +
        "&body=" + encodeURIComponent(body);
    };

    var showDone = function () {
      form.innerHTML =
        '<div class="form-done">' +
        "<p class=\"form-done-title\">Thank you — your enquiry has been received.</p>" +
        "<p class=\"form-done-sub\">We respond to every serious enquiry within two business days. Strictly confidential.</p>" +
        "</div>";
    };

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
      var topic = topicField ? topicField.value : "";

      if (!SERVER_SEND) {
        mailtoSend(name, email, brief, topic);
        return;
      }

      var btn = form.querySelector('button[type="submit"]');
      var label = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Sending\u2026";
      fetch("/contact.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          email: email,
          brief: brief,
          topic: topic,
          company: (document.getElementById("f-company") || { value: "" }).value
        })
      })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d || !d.ok) throw new Error("send failed");
          showDone();
        })
        .catch(function () {
          // Server hiccup: restore the button and fall back to the mail client.
          btn.disabled = false;
          btn.textContent = label;
          mailtoSend(name, email, brief, topic);
        });
    });
  }

  var loader = document.getElementById("loader");

  if (reduce || typeof gsap === "undefined") {
    // Reduced motion / no GSAP: reveal everything statically.
    if (loader) loader.remove();
    document.querySelectorAll("[data-reveal]").forEach(function (el) { el.classList.add("in"); });
    document.querySelectorAll("[data-load], .line-mask .line").forEach(function (el) {
      el.style.opacity = "1"; el.style.transform = "none";
    });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  var finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------- Lenis inertia scroll ---------- */
  var lenis = null;
  if (typeof Lenis !== "undefined") {
    lenis = new Lenis({ duration: 1.1, easing: function (t) { return 1 - Math.pow(1 - t, 3); } });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    // Glide to in-page anchors instead of jumping.
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var target = document.querySelector(a.getAttribute("href"));
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: a.getAttribute("href") === "#top" ? 0 : -70, duration: 1.4 });
      });
    });
  }

  /* ---------- Preloader curtain ---------- */
  var intro = gsap.timeline({ defaults: { ease: "power3.out" }, paused: true });
  if (loader) {
    if (lenis) lenis.stop();
    gsap.timeline({
      onComplete: function () {
        loader.remove();
        if (lenis) lenis.start();
      }
    })
      .fromTo(".loader-mark",
        { opacity: 0, letterSpacing: "0.6em" },
        { opacity: 1, letterSpacing: "0.42em", duration: 0.9, ease: "power2.out" }, 0.15)
      .to(".loader-mark", { opacity: 0, duration: 0.4, ease: "power2.in" }, 1.25)
      .to(loader, { yPercent: -100, duration: 0.9, ease: "power4.inOut" }, 1.45)
      .add(function () { intro.play(); }, 1.55);
  } else {
    intro.play();
  }

  /* ---------- Hero load-in ---------- */
  gsap.set("[data-load]", { opacity: 0 });
  gsap.set(".line-mask .line", { yPercent: 110 });
  intro
    .to(".line-mask .line", { yPercent: 0, duration: 1.0, stagger: 0.12 }, 0.1)
    .to("[data-load='0']", { opacity: 1, duration: 0.7 }, 0.3)
    .to("[data-load='2'].hero-visual", { opacity: 1, duration: 1.1 }, 0.35)
    .fromTo(".hero-visual", { clipPath: "inset(0% 0% 14% 0%)" },
      { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, ease: "power3.inOut" }, 0.35)
    .to("[data-load='3'], [data-load='4']", { opacity: 1, duration: 0.8, stagger: 0.12 }, 0.7);

  /* ---------- Hero ambient motion ---------- */
  var heroImg = document.querySelector(".hero-visual img");
  if (heroImg) {
    // Slow Ken Burns drift — barely perceptible, keeps the glass alive.
    gsap.fromTo(heroImg, { scale: 1.04 }, {
      scale: 1.11, duration: 26, ease: "sine.inOut", yoyo: true, repeat: -1
    });
    // Lavender glow breathes.
    gsap.to(".hero-glow", {
      opacity: 0.55, duration: 7, ease: "sine.inOut", yoyo: true, repeat: -1
    });
    // Periodic light sweep across the glass.
    gsap.timeline({ repeat: -1, repeatDelay: 7, delay: 2.2 })
      .fromTo(".hero-sheen",
        { xPercent: -260 },
        { xPercent: 900, duration: 2.6, ease: "power2.inOut" });
  }

  /* ---------- Stat count-ups ---------- */
  document.querySelectorAll("[data-count]").forEach(function (el) {
    var end = parseInt(el.getAttribute("data-count"), 10);
    var obj = { v: 0 };
    el.textContent = "0";
    gsap.to(obj, {
      v: end, duration: 1.8, ease: "power2.out",
      snap: { v: 1 },
      onUpdate: function () { el.textContent = String(Math.round(obj.v)); },
      scrollTrigger: { trigger: el, start: "top 88%", once: true }
    });
  });

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
