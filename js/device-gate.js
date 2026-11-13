// EasyNote runs on computers, smartboards and iPads/tablets only.
// Phones get a notice instead of the app. The app script is only loaded when the device is allowed.
(function () {
  var ua = navigator.userAgent || "";
  // iPadOS Safari pretends to be a Mac; a Mac never has a multi-touch screen.
  var iPad = /iPad/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var phoneUA = /iPhone|iPod|Windows Phone|BlackBerry|BB10|webOS|Opera Mini|IEMobile|Mobile Safari.*Android|Android.*Mobile/i.test(ua);
  var mobileHint = navigator.userAgentData && navigator.userAgentData.mobile === true;
  // Physical screen, not the browser window, so a small desktop window is never blocked.
  var shortSide = Math.min(screen.width, screen.height);
  var touchOnly = window.matchMedia && matchMedia("(pointer: coarse)").matches && !matchMedia("(any-pointer: fine)").matches;
  // Catches phones using "Request desktop site": touch-only + phone-sized screen (tablets are 600+ px).
  var smallTouch = touchOnly && shortSide < 600;

  var isPhone = !iPad && (phoneUA || mobileHint || smallTouch);

  if (!isPhone) {
    var s = document.createElement("script");
    s.type = "module"; s.src = "/js/main.js";
    document.head.appendChild(s);
    return;
  }

  document.documentElement.classList.add("phone-blocked");
  function show() {
    var url = location.origin + "/";
    var box = document.createElement("section");
    box.className = "phone-gate";
    box.innerHTML =
      '<div class="pg-card">' +
        '<img src="assets/logo.svg" class="app-logo" alt="" />' +
        '<h1 class="wordmark">Easy<span>Note</span></h1>' +
        '<p class="pg-lead">EasyNote is made for big screens.</p>' +
        '<p class="pg-text">Please open it on a <b>computer</b>, <b>smartboard</b> or <b>iPad / tablet</b>. Phones are too small to teach and write comfortably.</p>' +
        '<div class="pg-devices"><span>🖥️ Computer</span><span>📺 Smartboard</span><span>📱 iPad / tablet</span></div>' +
        '<button class="btn primary big" id="pg-copy">Copy link to open on another device</button>' +
        '<p class="pg-link"></p>' +
      '</div>';
    document.body.appendChild(box);
    box.querySelector(".pg-link").textContent = url;
    var btn = box.querySelector("#pg-copy");
    btn.onclick = function () {
      var done = function () { btn.textContent = "Link copied ✓"; };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { prompt("Copy this link:", url); });
      else prompt("Copy this link:", url);
    };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", show); else show();
})();

