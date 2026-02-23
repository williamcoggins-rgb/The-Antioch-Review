/* ============================================
   THE ANTIOCH REVIEW — Main JavaScript
   ============================================ */

(function () {
  "use strict";

  // --- Set current date in header ---
  function setHeaderDate() {
    const el = document.getElementById("headerDate");
    if (!el) return;
    const now = new Date();
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    el.textContent = now.toLocaleDateString("en-US", options);
  }

  // --- Mobile navigation ---
  function initMobileNav() {
    const toggle = document.getElementById("menuToggle");
    const overlay = document.getElementById("mobileNavOverlay");
    const nav = document.getElementById("mobileNav");
    const close = document.getElementById("mobileNavClose");

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

  // --- Search overlay (simple toggle) ---
  function initSearch() {
    var searchToggle = document.getElementById("searchToggle");
    if (!searchToggle) return;

    // Create search overlay
    var overlay = document.createElement("div");
    overlay.id = "searchOverlay";
    overlay.style.cssText =
      "display:none;position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:3000;" +
      "justify-content:center;align-items:flex-start;padding-top:120px;";
    overlay.innerHTML =
      '<div style="width:100%;max-width:640px;padding:0 16px;">' +
      '<div style="position:relative;">' +
      '<input type="text" id="searchInput" placeholder="Search The Antioch Review..." ' +
      'style="width:100%;padding:16px 20px;font-size:1.125rem;font-family:Inter,sans-serif;' +
      'border:none;border-bottom:3px solid #b8860b;background:transparent;color:#fff;outline:none;">' +
      '<button id="searchClose" style="position:absolute;right:0;top:50%;transform:translateY(-50%);' +
      'background:none;border:none;color:#fff;font-size:1.5rem;cursor:pointer;">&times;</button>' +
      "</div>" +
      "</div>";
    document.body.appendChild(overlay);

    var searchInput = document.getElementById("searchInput");
    var searchClose = document.getElementById("searchClose");

    searchToggle.addEventListener("click", function () {
      overlay.style.display = "flex";
      searchInput.focus();
    });

    searchClose.addEventListener("click", function () {
      overlay.style.display = "none";
      searchInput.value = "";
    });

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) {
        overlay.style.display = "none";
        searchInput.value = "";
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.style.display === "flex") {
        overlay.style.display = "none";
        searchInput.value = "";
      }
    });
  }

  // --- Merch page filter buttons ---
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

  // --- Sticky header shadow on scroll ---
  function initStickyHeader() {
    var header = document.querySelector(".site-header");
    if (!header) return;

    window.addEventListener("scroll", function () {
      if (window.scrollY > 10) {
        header.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)";
      } else {
        header.style.boxShadow = "none";
      }
    });
  }

  // --- Newsletter form ---
  function initNewsletter() {
    var forms = document.querySelectorAll(".newsletter-form");
    forms.forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = form.querySelector("input[type='email']");
        if (input && input.value) {
          var btn = form.querySelector("button");
          var originalText = btn.textContent;
          btn.textContent = "Subscribed!";
          btn.style.background = "#27ae60";
          input.value = "";
          setTimeout(function () {
            btn.textContent = originalText;
            btn.style.background = "";
          }, 2500);
        }
      });
    });
  }

  // --- Active nav link ---
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

  // --- Initialize everything ---
  document.addEventListener("DOMContentLoaded", function () {
    setHeaderDate();
    initMobileNav();
    initSearch();
    initMerchFilters();
    initStickyHeader();
    initNewsletter();
    setActiveNav();
  });
})();
