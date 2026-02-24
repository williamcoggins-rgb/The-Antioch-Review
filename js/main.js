/* ============================================
   THE ANTIOCH REVIEW — Main JavaScript
   Premium Interactions & Animations (2025)
   ============================================ */

(function () {
  "use strict";

  /* ===========================================
     GLOBAL CONFIG & UTILITIES
     =========================================== */

  var GOLD = "#b8860b";
  var GOLD_LIGHT = "#d4a843";
  var isMobile = function () { return window.innerWidth < 768; };
  var isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Throttle utility — returns a function that fires at most once per `limit` ms
  function throttle(fn, limit) {
    var lastCall = 0;
    var raf = null;
    return function () {
      var now = Date.now();
      var context = this;
      var args = arguments;
      if (now - lastCall >= limit) {
        lastCall = now;
        fn.apply(context, args);
      } else if (!raf) {
        raf = requestAnimationFrame(function () {
          lastCall = Date.now();
          raf = null;
          fn.apply(context, args);
        });
      }
    };
  }

  // Easing: easeOutExpo
  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  // Inject CSS into <head> — used by several premium features
  function injectStyles(id, css) {
    if (document.getElementById(id)) return;
    var style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ===========================================
     1. SET HEADER DATE (preserved)
     =========================================== */
  function setHeaderDate() {
    var el = document.getElementById("headerDate");
    if (!el) return;
    var now = new Date();
    var options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    el.textContent = now.toLocaleDateString("en-US", options);
  }

  /* ===========================================
     2. MOBILE NAVIGATION (preserved)
     =========================================== */
  function initMobileNav() {
    var toggle = document.getElementById("menuToggle");
    var overlay = document.getElementById("mobileNavOverlay");
    var nav = document.getElementById("mobileNav");
    var close = document.getElementById("mobileNavClose");

    if (!toggle || !overlay || !nav) return;

    function openNav() {
      overlay.classList.add("open");
      nav.classList.add("open");
      document.body.style.overflow = "hidden";
    }

    function closeNav() {
      overlay.classList.remove("open");
      nav.classList.remove("open");
      document.body.style.overflow = "";
    }

    toggle.addEventListener("click", openNav);
    if (close) close.addEventListener("click", closeNav);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeNav();
    });
  }

  /* ===========================================
     3. ENHANCED SEARCH OVERLAY (Feature #7)
     =========================================== */
  function initSearch() {
    var searchToggle = document.getElementById("searchToggle");
    if (!searchToggle) return;

    // Inject enhanced search styles
    injectStyles("ar-search-styles", [
      "#searchOverlay {",
      "  display:none; position:fixed; inset:0; z-index:3000;",
      "  background:rgba(0,0,0,0.7); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);",
      "  justify-content:center; align-items:flex-start; padding-top:18vh;",
      "  opacity:0; transform:scale(0.95);",
      "  transition: opacity 0.35s cubic-bezier(0.4,0,0.2,1), transform 0.35s cubic-bezier(0.4,0,0.2,1);",
      "}",
      "#searchOverlay.ar-search-visible {",
      "  opacity:1; transform:scale(1);",
      "}",
      "#searchOverlay.ar-search-closing {",
      "  opacity:0; transform:scale(1.05);",
      "}",
      "#searchOverlay .ar-search-inner {",
      "  width:100%; max-width:640px; padding:0 16px;",
      "}",
      "#searchOverlay .ar-search-field-wrap {",
      "  position:relative; border-radius:4px; padding:2px;",
      "  background: linear-gradient(135deg, " + GOLD + ", " + GOLD_LIGHT + ", " + GOLD + ");",
      "  background-size:200% 200%;",
      "  animation: arSearchBorder 3s ease infinite;",
      "}",
      "@keyframes arSearchBorder {",
      "  0%,100%{background-position:0% 50%} 50%{background-position:100% 50%}",
      "}",
      "#searchInput {",
      "  width:100%; padding:18px 48px 18px 20px; font-size:1.25rem;",
      "  font-family:Inter,sans-serif; border:none; background:rgba(0,0,0,0.85);",
      "  color:#fff; outline:none; border-radius:3px;",
      "  transition: padding 0.3s ease;",
      "}",
      "#searchInput:focus { padding:18px 48px 18px 28px; }",
      "#searchInput::placeholder { color:rgba(255,255,255,0.4); }",
      "#searchClose {",
      "  position:absolute; right:12px; top:50%; transform:translateY(-50%);",
      "  background:none; border:none; color:#fff; font-size:1.5rem; cursor:pointer;",
      "  opacity:0.6; transition:opacity 0.2s;",
      "}",
      "#searchClose:hover { opacity:1; }",
      "@media (prefers-reduced-motion: reduce) {",
      "  #searchOverlay { transition:none; }",
      "  @keyframes arSearchBorder { 0%,100%{background-position:0% 50%} }",
      "}"
    ].join("\n"));

    // Create search overlay
    var overlay = document.createElement("div");
    overlay.id = "searchOverlay";
    overlay.innerHTML =
      '<div class="ar-search-inner">' +
      '<div class="ar-search-field-wrap">' +
      '<input type="text" id="searchInput" placeholder="Search The Antioch Review..." autocomplete="off">' +
      '<button id="searchClose" aria-label="Close search">&times;</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    var searchInput = document.getElementById("searchInput");
    var searchClose = document.getElementById("searchClose");

    function openSearch() {
      overlay.style.display = "flex";
      overlay.classList.remove("ar-search-closing");
      // Force reflow then animate
      void overlay.offsetWidth;
      overlay.classList.add("ar-search-visible");
      searchInput.focus();
    }

    function closeSearch() {
      overlay.classList.remove("ar-search-visible");
      overlay.classList.add("ar-search-closing");
      setTimeout(function () {
        overlay.style.display = "none";
        overlay.classList.remove("ar-search-closing");
        searchInput.value = "";
      }, 350);
    }

    searchToggle.addEventListener("click", openSearch);
    searchClose.addEventListener("click", closeSearch);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeSearch();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.style.display === "flex") closeSearch();
    });
  }

  /* ===========================================
     4. MERCH FILTERS (preserved)
     =========================================== */
  function initMerchFilters() {
    var filterBtns = document.querySelectorAll(".filter-btn");
    if (!filterBtns.length) return;

    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        filterBtns.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");

        var category = btn.getAttribute("data-filter");
        var cards = document.querySelectorAll(".product-card");

        cards.forEach(function (card) {
          if (category === "all" || card.getAttribute("data-category") === category) {
            card.style.display = "";
          } else {
            card.style.display = "none";
          }
        });
      });
    });
  }

  /* ===========================================
     5. STICKY HEADER (preserved) — now enhanced
        with hide/show on scroll (Feature #9)
     =========================================== */
  function initStickyHeader() {
    var header = document.querySelector(".site-header");
    if (!header) return;

    // Inject header transition styles
    injectStyles("ar-header-styles", [
      ".site-header {",
      "  transition: transform 0.4s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s, backdrop-filter 0.3s, background 0.3s;",
      "}",
      ".site-header.ar-header-hidden {",
      "  transform: translateY(-100%);",
      "}",
      ".site-header.ar-header-scrolled {",
      "  background: rgba(255,255,255,0.92);",
      "  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);",
      "  box-shadow: 0 2px 20px rgba(0,0,0,0.08);",
      "}",
      "body.dark-mode .site-header.ar-header-scrolled {",
      "  background: rgba(26,26,26,0.92);",
      "}",
      "@media (prefers-reduced-motion: reduce) {",
      "  .site-header { transition: box-shadow 0.3s, background 0.3s; }",
      "  .site-header.ar-header-hidden { transform: none; }",
      "}"
    ].join("\n"));

    var lastScrollY = 0;
    var headerHeight = header.offsetHeight;
    var scrollThreshold = 5;

    var handleScroll = throttle(function () {
      var currentY = window.scrollY;

      // Shadow + glassmorphism when scrolled
      if (currentY > 10) {
        header.classList.add("ar-header-scrolled");
        header.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)";
      } else {
        header.classList.remove("ar-header-scrolled");
        header.style.boxShadow = "none";
      }

      // Hide/show on scroll direction
      if (!prefersReducedMotion && !isMobile()) {
        var delta = currentY - lastScrollY;
        if (delta > scrollThreshold && currentY > headerHeight) {
          header.classList.add("ar-header-hidden");
        } else if (delta < -scrollThreshold) {
          header.classList.remove("ar-header-hidden");
        }
      }

      lastScrollY = currentY;
    }, 16);

    window.addEventListener("scroll", handleScroll, { passive: true });
  }

  /* ===========================================
     6. NEWSLETTER FORM — enhanced (Feature #10)
     =========================================== */
  function initNewsletter() {
    var forms = document.querySelectorAll(".newsletter-form");
    if (!forms.length) return;

    // Inject newsletter animation styles
    injectStyles("ar-newsletter-styles", [
      "@keyframes arCheckDraw {",
      "  from { stroke-dashoffset: 24; }",
      "  to { stroke-dashoffset: 0; }",
      "}",
      "@keyframes arConfetti {",
      "  0% { transform: translateY(0) scale(1); opacity:1; }",
      "  100% { transform: translateY(-60px) scale(0); opacity:0; }",
      "}",
      ".ar-newsletter-success {",
      "  font-family: Inter, sans-serif; font-size: 0.875rem; color: #27ae60;",
      "  font-weight: 600; margin-top: 8px; opacity:0;",
      "  transition: opacity 0.4s ease;",
      "}",
      ".ar-newsletter-success.visible { opacity:1; }",
      ".ar-btn-morphed {",
      "  width: 44px !important; min-width: 44px !important; height: 44px !important;",
      "  padding: 0 !important; border-radius: 50% !important;",
      "  background: #27ae60 !important; border: none !important;",
      "  display: flex !important; align-items: center; justify-content: center;",
      "  transition: all 0.4s cubic-bezier(0.4,0,0.2,1);",
      "  overflow: hidden; flex-shrink: 0;",
      "}",
      ".ar-input-fading { opacity:0; transition: opacity 0.3s ease; }",
      "@media (prefers-reduced-motion: reduce) {",
      "  @keyframes arConfetti { 0%,100%{opacity:0;} }",
      "}"
    ].join("\n"));

    function spawnConfetti(x, y) {
      if (prefersReducedMotion) return;
      var count = 12;
      for (var i = 0; i < count; i++) {
        var dot = document.createElement("div");
        dot.style.cssText = [
          "position:fixed; pointer-events:none; z-index:9999;",
          "width:6px; height:6px; border-radius:50%;",
          "background:" + (i % 2 === 0 ? GOLD : GOLD_LIGHT) + ";",
          "left:" + (x + (Math.random() - 0.5) * 80) + "px;",
          "top:" + y + "px;",
          "animation: arConfetti " + (0.6 + Math.random() * 0.4) + "s ease forwards;"
        ].join("");
        document.body.appendChild(dot);
        setTimeout(function () { if (dot.parentNode) dot.parentNode.removeChild(dot); }, 1200);
      }
    }

    forms.forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = form.querySelector("input[type='email']");
        if (!input || !input.value) return;

        var btn = form.querySelector("button");
        var originalText = btn.textContent;
        var originalWidth = btn.offsetWidth;
        var btnRect = btn.getBoundingClientRect();

        // Morph button
        btn.style.width = originalWidth + "px";
        btn.textContent = "";
        void btn.offsetWidth;
        btn.classList.add("ar-btn-morphed");
        btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><polyline points="4 12 10 18 20 6" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="24" stroke-dashoffset="24" style="animation:arCheckDraw 0.4s 0.2s ease forwards;"/></svg>';

        // Fade input
        input.classList.add("ar-input-fading");
        input.value = "";

        // Confetti burst from button location
        spawnConfetti(btnRect.left + btnRect.width / 2, btnRect.top);

        // Success message
        var existing = form.parentNode.querySelector(".ar-newsletter-success");
        if (!existing) {
          existing = document.createElement("div");
          existing.className = "ar-newsletter-success";
          existing.textContent = "You're subscribed! Check your inbox for a confirmation.";
          form.parentNode.insertBefore(existing, form.nextSibling);
        }
        setTimeout(function () { existing.classList.add("visible"); }, 100);

        // Reset after delay
        setTimeout(function () {
          btn.classList.remove("ar-btn-morphed");
          btn.innerHTML = "";
          btn.textContent = originalText;
          btn.style.width = "";
          btn.style.background = "";
          input.classList.remove("ar-input-fading");
          existing.classList.remove("visible");
          setTimeout(function () {
            if (existing.parentNode) existing.parentNode.removeChild(existing);
          }, 400);
        }, 3000);
      });
    });
  }

  /* ===========================================
     7. ACTIVE NAV LINK (preserved)
     =========================================== */
  function setActiveNav() {
    var currentPath = window.location.pathname;
    var navLinks = document.querySelectorAll(".nav-list li a");
    navLinks.forEach(function (link) {
      link.classList.remove("active");
      var href = link.getAttribute("href");
      if (currentPath.endsWith(href) || (currentPath === "/" && href === "index.html")) {
        link.classList.add("active");
      }
    });
  }

  /* ===========================================
     8. DARK MODE — enhanced with circular wipe (Feature #11)
     =========================================== */
  function initDarkMode() {
    var toggle = document.getElementById("darkModeToggle");
    if (!toggle) return;

    // Inject circular wipe styles
    injectStyles("ar-darkmode-styles", [
      ".ar-dark-wipe {",
      "  position: fixed; top:0; left:0; width:100%; height:100%;",
      "  z-index: 99999; pointer-events: none;",
      "  clip-path: circle(0% at 50% 50%);",
      "  transition: clip-path 0.6s cubic-bezier(0.4,0,0.2,1);",
      "}",
      ".ar-dark-wipe.expanding {",
      "  clip-path: circle(150% at var(--cx) var(--cy));",
      "}",
      "@media (prefers-reduced-motion: reduce) {",
      "  .ar-dark-wipe { transition:none; }",
      "}"
    ].join("\n"));

    // Check saved preference
    var savedMode = localStorage.getItem("antioch-dark-mode");
    if (savedMode === "true") {
      document.body.classList.add("dark-mode");
      toggle.innerHTML = "&#9788;"; // Sun icon
    }

    var isAnimating = false;

    toggle.addEventListener("click", function () {
      var isDarkNow = document.body.classList.contains("dark-mode");
      var willBeDark = !isDarkNow;

      // Attempt circular wipe transition
      if (!prefersReducedMotion && typeof CSS !== "undefined" && CSS.supports && CSS.supports("clip-path", "circle(50%)")) {
        if (isAnimating) return;
        isAnimating = true;

        var rect = toggle.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;

        var wipe = document.createElement("div");
        wipe.className = "ar-dark-wipe";
        wipe.style.setProperty("--cx", cx + "px");
        wipe.style.setProperty("--cy", cy + "px");
        wipe.style.background = willBeDark ? "#1a1a1a" : "#ffffff";
        document.body.appendChild(wipe);

        // Force reflow then expand
        void wipe.offsetWidth;
        wipe.classList.add("expanding");

        setTimeout(function () {
          document.body.classList.toggle("dark-mode");
          var isDark = document.body.classList.contains("dark-mode");
          localStorage.setItem("antioch-dark-mode", isDark);
          toggle.innerHTML = isDark ? "&#9788;" : "&#9789;";

          setTimeout(function () {
            if (wipe.parentNode) wipe.parentNode.removeChild(wipe);
            isAnimating = false;
          }, 100);
        }, 500);

      } else {
        // Fallback — simple toggle
        document.body.classList.toggle("dark-mode");
        var isDark = document.body.classList.contains("dark-mode");
        localStorage.setItem("antioch-dark-mode", isDark);
        toggle.innerHTML = isDark ? "&#9788;" : "&#9789;";
      }
    });
  }

  /* ===========================================
     9. FAQ ACCORDION (preserved)
     =========================================== */
  function initFAQ() {
    var faqItems = document.querySelectorAll(".faq-item");
    if (!faqItems.length) return;

    faqItems.forEach(function (item) {
      var question = item.querySelector(".faq-question");
      if (!question) return;

      question.addEventListener("click", function () {
        // Close other items
        faqItems.forEach(function (other) {
          if (other !== item) other.classList.remove("open");
        });
        // Toggle current
        item.classList.toggle("open");
      });
    });
  }

  /* ===========================================
     10. ADVANCED SCROLL REVEAL SYSTEM (Feature #1)
         Replaces basic initScrollAnimations
     =========================================== */
  function initScrollAnimations() {
    // Inject scroll reveal CSS
    injectStyles("ar-reveal-styles", [
      /* Base hidden states for auto-detected elements */
      ".ar-reveal {",
      "  opacity: 0; transform: translateY(30px);",
      "  transition: opacity 0.6s cubic-bezier(0.4,0,0.2,1), transform 0.6s cubic-bezier(0.4,0,0.2,1);",
      "}",
      ".ar-reveal.ar-reveal-scale {",
      "  opacity:0; transform: scale(0.92);",
      "}",
      ".ar-reveal.ar-reveal-left {",
      "  opacity:0; transform: translateX(-30px);",
      "}",
      ".ar-reveal.ar-reveal-right {",
      "  opacity:0; transform: translateX(30px);",
      "}",
      ".ar-reveal.ar-reveal-fade {",
      "  opacity:0; transform: none;",
      "}",
      /* Visible state */
      ".ar-reveal.ar-visible {",
      "  opacity: 1; transform: translateY(0) translateX(0) scale(1);",
      "}",
      /* Legacy support: .animate-on-scroll still works */
      ".animate-on-scroll { opacity: 0; }",
      ".animate-on-scroll.visible {",
      "  animation: fadeInUp 0.6s ease forwards;",
      "}",
      "@keyframes fadeInUp {",
      "  from { opacity:0; transform:translateY(20px); }",
      "  to { opacity:1; transform:translateY(0); }",
      "}",
      "@media (prefers-reduced-motion: reduce) {",
      "  .ar-reveal { opacity:1; transform:none; transition:none; }",
      "  .animate-on-scroll { opacity:1; }",
      "}"
    ].join("\n"));

    if (prefersReducedMotion) return;

    // Gather all elements to reveal
    var autoSelectors = [
      ".article-card",
      ".pricing-card",
      ".product-card",
      ".benefit-card",
      ".team-card",
      ".podcast-card",
      ".story-card--small",
      ".opinion-card",
      ".most-read-item",
      ".whats-news-list li"
    ];

    // Auto-detect and tag elements
    autoSelectors.forEach(function (sel) {
      var items = document.querySelectorAll(sel);
      items.forEach(function (el) {
        if (!el.classList.contains("ar-reveal") && !el.classList.contains("animate-on-scroll")) {
          el.classList.add("ar-reveal");
        }
      });
    });

    // Also handle .animate-on-scroll elements through the same observer
    var legacyElements = document.querySelectorAll(".animate-on-scroll");

    // Group elements by their parent for stagger calculation
    var parentGroups = new Map();

    var allReveal = document.querySelectorAll(".ar-reveal");
    allReveal.forEach(function (el) {
      var parent = el.parentElement;
      if (!parentGroups.has(parent)) {
        parentGroups.set(parent, []);
      }
      parentGroups.get(parent).push(el);
    });

    // Assign stagger indexes
    parentGroups.forEach(function (children) {
      children.forEach(function (child, index) {
        child.setAttribute("data-ar-stagger", index);
      });
    });

    // Intersection Observer for ar-reveal elements
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var stagger = parseInt(el.getAttribute("data-ar-stagger") || "0", 10);
          var delay = stagger * 80;

          setTimeout(function () {
            el.classList.add("ar-visible");
          }, delay);

          revealObserver.unobserve(el);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });

    allReveal.forEach(function (el) {
      revealObserver.observe(el);
    });

    // Legacy observer for .animate-on-scroll
    var legacyObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          legacyObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    legacyElements.forEach(function (el) {
      legacyObserver.observe(el);
    });
  }

  /* ===========================================
     FEATURE #2: 3D CARD TILT ON HOVER
     =========================================== */
  function initCardTilt() {
    if (prefersReducedMotion || isTouch || isMobile()) return;

    var tiltSelectors = ".article-card, .pricing-card, .product-card, .podcast-card, .benefit-card";
    var cards = document.querySelectorAll(tiltSelectors);
    if (!cards.length) return;

    injectStyles("ar-tilt-styles", [
      ".ar-tilt-card {",
      "  transform-style: preserve-3d; will-change: transform;",
      "  transition: transform 0.15s ease-out;",
      "}",
      ".ar-tilt-card .ar-tilt-shine {",
      "  position: absolute; top:0; left:0; width:100%; height:100%;",
      "  pointer-events: none; z-index:1; border-radius: inherit;",
      "  background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.12) 0%, transparent 60%);",
      "  opacity: 0; transition: opacity 0.3s ease;",
      "}",
      ".ar-tilt-card:hover .ar-tilt-shine { opacity:1; }",
      "@media (prefers-reduced-motion: reduce) {",
      "  .ar-tilt-card { transition:none; }",
      "}"
    ].join("\n"));

    cards.forEach(function (card) {
      // Need position relative for the shine overlay
      var computedPos = getComputedStyle(card).position;
      if (computedPos === "static") card.style.position = "relative";

      card.classList.add("ar-tilt-card");

      // Add shine div
      var shine = document.createElement("div");
      shine.className = "ar-tilt-shine";
      card.appendChild(shine);

      var maxTilt = 4;
      var rafId = null;

      card.addEventListener("mousemove", function (e) {
        if (rafId) return;
        rafId = requestAnimationFrame(function () {
          var rect = card.getBoundingClientRect();
          var x = (e.clientX - rect.left) / rect.width;
          var y = (e.clientY - rect.top) / rect.height;

          var rotateY = (x - 0.5) * maxTilt * 2;
          var rotateX = (0.5 - y) * maxTilt * 2;

          card.style.transform = "perspective(800px) rotateX(" + rotateX + "deg) rotateY(" + rotateY + "deg)";

          // Move shine to follow mouse
          shine.style.background = "radial-gradient(circle at " +
            (x * 100) + "% " + (y * 100) + "%, rgba(255,255,255,0.15) 0%, transparent 60%)";

          rafId = null;
        });
      });

      card.addEventListener("mouseleave", function () {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
        shine.style.background = "";
      });
    });
  }

  /* ===========================================
     FEATURE #3: MAGNETIC HOVER ON BUTTONS
     =========================================== */
  function initMagneticButtons() {
    if (prefersReducedMotion || isTouch || isMobile()) return;

    var magnetSelectors = ".btn-subscribe, .btn-pricing, .btn-add-cart, .filter-btn";
    var buttons = document.querySelectorAll(magnetSelectors);
    if (!buttons.length) return;

    injectStyles("ar-magnetic-styles", [
      ".ar-magnetic {",
      "  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);",
      "}",
      "@media (prefers-reduced-motion: reduce) {",
      "  .ar-magnetic { transition:none; }",
      "}"
    ].join("\n"));

    var magnetRange = 50;
    var maxDisplacement = 4;

    buttons.forEach(function (btn) {
      btn.classList.add("ar-magnetic");

      btn.addEventListener("mousemove", function (e) {
        var rect = btn.getBoundingClientRect();
        var centerX = rect.left + rect.width / 2;
        var centerY = rect.top + rect.height / 2;
        var distX = e.clientX - centerX;
        var distY = e.clientY - centerY;
        var dist = Math.sqrt(distX * distX + distY * distY);
        var maxDist = Math.max(rect.width, rect.height) / 2 + magnetRange;

        if (dist < maxDist) {
          var strength = 1 - (dist / maxDist);
          var moveX = (distX / maxDist) * maxDisplacement * strength;
          var moveY = (distY / maxDist) * maxDisplacement * strength;
          btn.style.transform = "translate(" + moveX + "px, " + moveY + "px)";
        }
      });

      btn.addEventListener("mouseleave", function () {
        btn.style.transform = "translate(0, 0)";
      });
    });
  }

  /* ===========================================
     FEATURE #4: PARALLAX EFFECTS
     =========================================== */
  function initParallax() {
    if (prefersReducedMotion || isMobile()) return;

    var heroH2 = document.querySelector(".hero-center h2");
    var featureImage = document.querySelector(".feature-image");
    var verseInner = document.querySelector(".verse-of-day-inner");

    // If no parallax targets exist, bail
    if (!heroH2 && !featureImage && !verseInner) return;

    injectStyles("ar-parallax-styles", [
      ".ar-parallax { will-change: transform; }",
      "@media (prefers-reduced-motion: reduce) {",
      "  .ar-parallax { transform:none !important; }",
      "}"
    ].join("\n"));

    if (heroH2) heroH2.classList.add("ar-parallax");
    if (featureImage) featureImage.classList.add("ar-parallax");
    if (verseInner) verseInner.classList.add("ar-parallax");

    var handleParallax = throttle(function () {
      if (isMobile()) return;
      var scrollY = window.scrollY;
      var winH = window.innerHeight;

      function applyParallax(el, speed) {
        if (!el) return;
        var rect = el.getBoundingClientRect();
        // Only animate when in viewport
        if (rect.bottom < 0 || rect.top > winH) return;
        var center = rect.top + rect.height / 2;
        var offset = ((center - winH / 2) / winH) * speed;
        // Clamp to max 30px
        offset = Math.max(-30, Math.min(30, offset));
        el.style.transform = "translateY(" + offset + "px)";
      }

      applyParallax(heroH2, -15);
      applyParallax(featureImage, 10);
      applyParallax(verseInner, -8);
    }, 16);

    window.addEventListener("scroll", handleParallax, { passive: true });
  }

  /* ===========================================
     FEATURE #5: SMOOTH COUNTER ANIMATIONS
     =========================================== */
  function initCounterAnimations() {
    if (prefersReducedMotion) return;

    // Animate pricing prices
    var pricingPrices = document.querySelectorAll(".pricing-price");
    // Animate most-read items (the ::before counter is CSS, so we overlay a visual number)

    if (!pricingPrices.length) return;

    function animateCounter(el, target, duration, prefix, suffix) {
      var start = performance.now();
      prefix = prefix || "";
      suffix = suffix || "";
      var startVal = 0;

      function step(now) {
        var elapsed = now - start;
        var progress = Math.min(elapsed / duration, 1);
        var eased = easeOutExpo(progress);
        var current = Math.round(startVal + (target - startVal) * eased);
        el.textContent = prefix + current + suffix;
        if (progress < 1) {
          requestAnimationFrame(step);
        }
      }

      requestAnimationFrame(step);
    }

    // Pricing price animation
    var priceObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var text = el.textContent.trim();
          // Parse out the number, e.g. "$14/mo" -> 14
          var match = text.match(/\$(\d+)/);
          if (match) {
            var num = parseInt(match[1], 10);
            var spanEl = el.querySelector("span");
            var suffix = spanEl ? spanEl.textContent : "";

            // Temporarily hide span, animate the number, then restore
            el.textContent = "$0";
            var suffixSpan = document.createElement("span");
            suffixSpan.textContent = suffix;
            el.appendChild(suffixSpan);

            var start = performance.now();
            var duration = 1200;

            function step(now) {
              var elapsed = now - start;
              var progress = Math.min(elapsed / duration, 1);
              var eased = easeOutExpo(progress);
              var current = Math.round(num * eased);
              el.firstChild.textContent = "$" + current;
              if (progress < 1) {
                requestAnimationFrame(step);
              }
            }

            requestAnimationFrame(step);
          }
          priceObserver.unobserve(el);
        }
      });
    }, { threshold: 0.3 });

    pricingPrices.forEach(function (el) {
      priceObserver.observe(el);
    });
  }

  /* ===========================================
     FEATURE #6: TEXT SPLIT REVEAL
     =========================================== */
  function initTextSplitReveal() {
    if (prefersReducedMotion) return;

    var heroSelectors = [
      ".hero-center h2",
      ".subscribe-hero h1",
      ".about-hero h1",
      ".category-hero h1",
      ".merch-hero h1"
    ];

    injectStyles("ar-split-styles", [
      ".ar-split-line {",
      "  overflow: hidden; display: inline-block;",
      "}",
      ".ar-split-word {",
      "  display: inline-block; transform: translateY(105%);",
      "  transition: transform 0.5s cubic-bezier(0.4,0,0.2,1);",
      "}",
      ".ar-split-word.ar-word-visible {",
      "  transform: translateY(0);",
      "}",
      "@media (prefers-reduced-motion: reduce) {",
      "  .ar-split-word { transform:none; }",
      "}"
    ].join("\n"));

    var targets = [];
    heroSelectors.forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el) targets.push(el);
    });

    if (!targets.length) return;

    targets.forEach(function (el) {
      // Skip if already processed or if it's inside an <a> tag
      if (el.getAttribute("data-ar-split")) return;
      el.setAttribute("data-ar-split", "true");

      // Preserve the original HTML in case of links
      var anchorChild = el.querySelector("a");
      var textSource = anchorChild || el;
      var originalText = textSource.textContent;
      var words = originalText.split(/\s+/).filter(function (w) { return w.length > 0; });

      if (!words.length) return;

      // Build new HTML with wrapped words
      var html = words.map(function (word) {
        return '<span class="ar-split-line"><span class="ar-split-word">' + word + '</span></span>';
      }).join(" ");

      if (anchorChild) {
        anchorChild.innerHTML = html;
      } else {
        el.innerHTML = html;
      }
    });

    // Observe each target for viewport entry
    var splitObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var wordSpans = entry.target.querySelectorAll(".ar-split-word");
          wordSpans.forEach(function (span, i) {
            setTimeout(function () {
              span.classList.add("ar-word-visible");
            }, i * 60);
          });
          splitObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    targets.forEach(function (el) {
      splitObserver.observe(el);
    });
  }

  /* ===========================================
     FEATURE #8: SCROLL PROGRESS BAR
     =========================================== */
  function initScrollProgressBar() {
    injectStyles("ar-progress-styles", [
      ".ar-scroll-progress {",
      "  position: fixed; top: 0; left: 0; width: 100%; height: 3px;",
      "  z-index: 10000; pointer-events: none;",
      "  transform-origin: left;",
      "  transform: scaleX(0);",
      "  background: linear-gradient(90deg, " + GOLD + ", " + GOLD_LIGHT + ", " + GOLD + ");",
      "  background-size: 200% 100%;",
      "  animation: arProgressShimmer 2s linear infinite;",
      "}",
      "@keyframes arProgressShimmer {",
      "  0% { background-position: 200% 0; }",
      "  100% { background-position: -200% 0; }",
      "}",
      "@media (prefers-reduced-motion: reduce) {",
      "  .ar-scroll-progress { animation:none; }",
      "}"
    ].join("\n"));

    var bar = document.createElement("div");
    bar.className = "ar-scroll-progress";
    document.body.appendChild(bar);

    var updateProgress = throttle(function () {
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        bar.style.transform = "scaleX(0)";
        return;
      }
      var progress = window.scrollY / docHeight;
      bar.style.transform = "scaleX(" + Math.min(progress, 1) + ")";
    }, 16);

    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
  }

  /* ===========================================
     FEATURE #12: PRELOADER / PAGE ENTRANCE
     =========================================== */
  function initPageEntrance() {
    if (prefersReducedMotion) return;

    injectStyles("ar-entrance-styles", [
      /* Logo shimmer */
      ".ar-entrance-logo {",
      "  animation: arLogoShimmer 0.8s ease forwards;",
      "}",
      "@keyframes arLogoShimmer {",
      "  0% { opacity:0; background-size:200% 100%; background-position:200% 0;",
      "       -webkit-background-clip:text; background-clip:text; color:transparent;",
      "       background-image:linear-gradient(90deg, #111 40%, " + GOLD + " 50%, #111 60%); }",
      "  50% { opacity:1; background-position:0% 0; color:transparent; }",
      "  100% { opacity:1; color:inherit; background-image:none; }",
      "}",
      /* Nav slide */
      ".ar-entrance-nav {",
      "  opacity:0; transform:translateY(-10px);",
      "  animation: arNavSlide 0.4s ease forwards;",
      "}",
      "@keyframes arNavSlide {",
      "  to { opacity:1; transform:translateY(0); }",
      "}",
      /* Hero fade */
      ".ar-entrance-hero {",
      "  opacity:0; transform:translateY(15px);",
      "  animation: arHeroFade 0.5s ease forwards;",
      "}",
      "@keyframes arHeroFade {",
      "  to { opacity:1; transform:translateY(0); }",
      "}",
      "body.dark-mode .ar-entrance-logo {",
      "  animation-name: arLogoShimmerDark;",
      "}",
      "@keyframes arLogoShimmerDark {",
      "  0% { opacity:0; background-size:200% 100%; background-position:200% 0;",
      "       -webkit-background-clip:text; background-clip:text; color:transparent;",
      "       background-image:linear-gradient(90deg, #e8e6e1 40%, " + GOLD + " 50%, #e8e6e1 60%); }",
      "  50% { opacity:1; background-position:0% 0; color:transparent; }",
      "  100% { opacity:1; color:inherit; background-image:none; }",
      "}",
      "@media (prefers-reduced-motion: reduce) {",
      "  .ar-entrance-logo, .ar-entrance-nav, .ar-entrance-hero {",
      "    opacity:1; transform:none; animation:none;",
      "  }",
      "}"
    ].join("\n"));

    // Logo animation
    var logoH1 = document.querySelector(".site-logo h1");
    if (logoH1) {
      logoH1.classList.add("ar-entrance-logo");
    }

    // Nav items stagger
    var navItems = document.querySelectorAll(".nav-list li");
    navItems.forEach(function (li, i) {
      li.classList.add("ar-entrance-nav");
      li.style.animationDelay = (100 + i * 40) + "ms";
    });

    // Hero content
    var heroElements = document.querySelectorAll(
      ".hero-center, .hero-left, .hero-right, " +
      ".subscribe-hero, .about-hero, .category-hero, .merch-hero"
    );
    heroElements.forEach(function (el, i) {
      el.classList.add("ar-entrance-hero");
      el.style.animationDelay = (200 + i * 100) + "ms";
    });
  }

  /* ===========================================
     FEATURE #13: CURSOR GLOW (Desktop only)
     =========================================== */
  function initCursorGlow() {
    if (prefersReducedMotion || isTouch || isMobile()) return;

    injectStyles("ar-cursor-styles", [
      ".ar-cursor-glow {",
      "  position: fixed; top:0; left:0; width:400px; height:400px;",
      "  pointer-events: none; z-index: 9998;",
      "  border-radius: 50%;",
      "  background: radial-gradient(circle, rgba(184,134,11,0.04) 0%, transparent 70%);",
      "  transform: translate(-50%, -50%);",
      "  will-change: left, top;",
      "  transition: opacity 0.3s;",
      "}",
      "@media (max-width: 768px) { .ar-cursor-glow { display:none; } }",
      "@media (prefers-reduced-motion: reduce) { .ar-cursor-glow { display:none; } }"
    ].join("\n"));

    var glow = document.createElement("div");
    glow.className = "ar-cursor-glow";
    document.body.appendChild(glow);

    var glowX = 0, glowY = 0;
    var targetX = 0, targetY = 0;
    var rafRunning = false;

    function updateGlow() {
      glowX += (targetX - glowX) * 0.15;
      glowY += (targetY - glowY) * 0.15;
      glow.style.left = glowX + "px";
      glow.style.top = glowY + "px";

      if (Math.abs(targetX - glowX) > 0.5 || Math.abs(targetY - glowY) > 0.5) {
        requestAnimationFrame(updateGlow);
      } else {
        rafRunning = false;
      }
    }

    document.addEventListener("mousemove", function (e) {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!rafRunning) {
        rafRunning = true;
        requestAnimationFrame(updateGlow);
      }
    }, { passive: true });
  }

  /* ===========================================
     FEATURE #14: INTERSECTION-BASED SECTION COLORING
     =========================================== */
  function initSectionColoring() {
    if (prefersReducedMotion) return;

    var header = document.querySelector(".site-header");
    if (!header) return;

    var darkSections = document.querySelectorAll(".podcast-section, .breaking-bar");
    if (!darkSections.length) return;

    injectStyles("ar-section-color-styles", [
      ".site-header {",
      "  transition: background 0.5s ease, box-shadow 0.3s, transform 0.4s cubic-bezier(0.4,0,0.2,1);",
      "}",
      ".site-header.ar-header-tinted {",
      "  background: rgba(26,39,68,0.95) !important;",
      "}",
      ".site-header.ar-header-tinted .nav-list li a,",
      ".site-header.ar-header-tinted .header-date,",
      ".site-header.ar-header-tinted .header-search,",
      ".site-header.ar-header-tinted .btn-sign-in,",
      ".site-header.ar-header-tinted .menu-toggle,",
      ".site-header.ar-header-tinted .dark-mode-toggle {",
      "  color: rgba(255,255,255,0.8);",
      "  transition: color 0.3s;",
      "}",
      ".site-header.ar-header-tinted .site-logo h1 a,",
      ".site-header.ar-header-tinted .site-logo h1 {",
      "  color: #fff;",
      "}",
      ".site-header.ar-header-tinted .logo-tagline {",
      "  color: rgba(255,255,255,0.5);",
      "}",
      ".site-header.ar-header-tinted .site-nav {",
      "  border-bottom-color: rgba(255,255,255,0.15);",
      "  background: transparent;",
      "}",
      "@media (prefers-reduced-motion: reduce) {",
      "  .site-header.ar-header-tinted { background: initial !important; }",
      "}"
    ].join("\n"));

    var sectionObserver = new IntersectionObserver(function (entries) {
      var anyIntersecting = false;
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio > 0.2) {
          anyIntersecting = true;
        }
      });
      // Check if any dark section is currently in the header zone
      var tint = false;
      darkSections.forEach(function (sec) {
        var rect = sec.getBoundingClientRect();
        var headerH = header.offsetHeight;
        if (rect.top < headerH && rect.bottom > 0) {
          tint = true;
        }
      });
      if (tint) {
        header.classList.add("ar-header-tinted");
      } else {
        header.classList.remove("ar-header-tinted");
      }
    }, {
      threshold: [0, 0.1, 0.2, 0.5],
      rootMargin: "0px"
    });

    darkSections.forEach(function (sec) {
      sectionObserver.observe(sec);
    });

    // Also check on scroll for smoother transitions
    var checkTint = throttle(function () {
      var headerH = header.offsetHeight;
      var tint = false;
      darkSections.forEach(function (sec) {
        var rect = sec.getBoundingClientRect();
        if (rect.top < headerH && rect.bottom > 0) {
          tint = true;
        }
      });
      if (tint) {
        header.classList.add("ar-header-tinted");
      } else {
        header.classList.remove("ar-header-tinted");
      }
    }, 16);

    window.addEventListener("scroll", checkTint, { passive: true });
  }

  /* ===========================================
     INITIALIZE EVERYTHING
     =========================================== */
  document.addEventListener("DOMContentLoaded", function () {
    // --- Original preserved functions ---
    setHeaderDate();
    initMobileNav();
    initSearch();
    initMerchFilters();
    initStickyHeader();
    initNewsletter();
    setActiveNav();
    initDarkMode();
    initFAQ();
    initScrollAnimations();

    // --- Premium features ---
    initPageEntrance();        // Feature #12 — page entrance animation
    initCardTilt();            // Feature #2 — 3D card tilt
    initMagneticButtons();     // Feature #3 — magnetic hover buttons
    initParallax();            // Feature #4 — parallax effects
    initCounterAnimations();   // Feature #5 — counter animations
    initTextSplitReveal();     // Feature #6 — text split reveal
    initScrollProgressBar();   // Feature #8 — scroll progress bar
    initCursorGlow();          // Feature #13 — cursor glow
    initSectionColoring();     // Feature #14 — section coloring
  });
})();
