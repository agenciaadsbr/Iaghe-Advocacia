/*
 * /redirect — só abre o WhatsApp para quem chegou após a gravação confirmada do lead.
 */
(function () {
  "use strict";
  var cfg = window.IAG_CONFIG;
  var L = window.IAGLead;
  var params = new URLSearchParams(window.location.search);
  var cameFromForm = params.get("r") === "1";

  if (!cameFromForm) {
    var none = document.getElementById("rd-none");
    var back = none.querySelector("a");
    if (back) back.href = (cfg.path || "/") + "#contato";
    none.hidden = false;
    return;
  }

  var url = L.whatsappUrl(params.get("a"));
  var ok = document.getElementById("rd-ok");
  var btn = document.getElementById("rd-btn");
  var bar = ok.querySelector(".rd-bar");
  ok.hidden = false;
  btn.href = url;

  var delay = cfg.redirectDelayMs || 3000;
  bar.style.setProperty("--d", delay + "ms");
  requestAnimationFrame(function () { requestAnimationFrame(function () { bar.classList.add("run"); }); });

  setTimeout(function () { window.location.href = url; }, delay);
})();
