/*
 * Interface da LP: header, dados institucionais e formulário.
 */
(function () {
  "use strict";
  var cfg = window.IAG_CONFIG;
  var L = window.IAGLead;
  var loadedAt = Date.now();
  var utms = L.captureUtms();

  if (!cfg.previewMode) L.trackVisit();

  /* ---------- Header: ganha fundo sólido após o hero ---------- */
  var header = document.querySelector(".site-header");
  var sentinel = document.querySelector("[data-header-sentinel]");
  if (header && sentinel && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      header.classList.toggle("is-solid", !entries[0].isIntersecting);
    }).observe(sentinel);
  }

  /* ---------- Dados institucionais (só aparecem quando confirmados) ---------- */
  var inst = cfg.institucional || {};
  function fill(selector, value) {
    document.querySelectorAll(selector).forEach(function (el) {
      if (value) { el.textContent = value; el.hidden = false; }
    });
  }
  fill("[data-inst='oab']", inst.oab);
  fill("[data-inst='endereco']", inst.endereco);
  fill("[data-inst='email']", inst.email);
  fill("[data-inst='cnpj']", inst.cnpj ? "CNPJ " + inst.cnpj : null);

  // Foto real do advogado substitui a imagem arquitetônica + monograma.
  if (inst.fotoAdvogado) {
    var plate = document.querySelector("[data-lawyer-plate]");
    if (plate) {
      var img = new Image();
      img.src = inst.fotoAdvogado;
      img.alt = inst.advogado;
      img.width = 800; img.height = 1000;
      img.loading = "lazy"; img.decoding = "async";
      plate.replaceChildren(img);
      if (plate.parentElement) plate.parentElement.classList.add("has-photo");
    }
  }

  /* ---------- Imagens: se uma falhar, some sem deixar ícone quebrado ---------- */
  document.querySelectorAll("img[data-img]").forEach(function (im) {
    function miss() { im.classList.add("is-missing"); }
    if (im.complete && im.naturalWidth === 0 && im.currentSrc) miss();
    im.addEventListener("error", miss);
  });

  /* ---------- Entrada suave dos blocos ao rolar ---------- */
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll("[data-stagger]").forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (child, i) { child.style.setProperty("--i", i); });
  });
  var revealEls = document.querySelectorAll("[data-reveal], [data-stagger], [data-anim]");
  if (!reduceMotion && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- CTA fixo no celular: entre o fim do hero e o formulário ---------- */
  var mcta = document.querySelector("[data-mobile-cta]");
  var heroCta = document.querySelector("[data-hero-cta]");
  var contact = document.getElementById("contato");
  if (mcta && heroCta && contact) {
    var mctaLink = mcta.querySelector("a");
    var ticking = false;
    var updateMcta = function () {
      ticking = false;
      var vh = window.innerHeight;
      var on = heroCta.getBoundingClientRect().bottom < 0 && contact.getBoundingClientRect().top > vh * 0.85;
      if (on !== mcta.classList.contains("is-on")) {
        mcta.classList.toggle("is-on", on);
        mcta.setAttribute("aria-hidden", on ? "false" : "true");
        mctaLink.tabIndex = on ? 0 : -1;
      }
    };
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(updateMcta); } }, { passive: true });
    window.addEventListener("resize", updateMcta);
    updateMcta();
  }

  /* ---------- FAQ com abertura suave (mantém <details> nativo) ---------- */
  document.querySelectorAll(".faq details").forEach(function (d) {
    var summary = d.querySelector("summary");
    var body = d.querySelector(".faq-a");
    if (!summary || !body || reduceMotion || !body.animate) return;
    var anim = null, closing = false;
    summary.addEventListener("click", function (e) {
      e.preventDefault();
      if (anim) { anim.cancel(); anim = null; }
      if (closing) { closing = false; return; } // clicou de novo durante o fechamento: mantém aberto
      if (!d.open) {
        d.open = true;
        var h = body.scrollHeight;
        anim = body.animate([{ height: "0px", opacity: 0 }, { height: h + "px", opacity: 1 }], { duration: 320, easing: "cubic-bezier(.2,.7,.2,1)" });
        anim.onfinish = function () { anim = null; };
      } else {
        var h2 = body.scrollHeight;
        closing = true;
        anim = body.animate([{ height: h2 + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 240, easing: "cubic-bezier(.4,0,.2,1)" });
        anim.onfinish = function () { d.open = false; closing = false; anim = null; };
      }
    });
  });
  if (inst.logotipo) {
    document.querySelectorAll("[data-brand]").forEach(function (el) {
      var logo = new Image();
      logo.src = inst.logotipo; logo.alt = "Iaghe Advocacia";
      logo.className = "brand-logo"; logo.height = 36;
      el.replaceChildren(logo);
    });
  }

  /* ---------- Formulário ---------- */
  var form = document.getElementById("lead-form");
  if (!form) return;
  var nameInput = form.elements.nome;
  var phoneInput = form.elements.whatsapp;
  var honeypot = form.elements.website;
  var submitBtn = form.querySelector("[type=submit]");
  var statusEl = document.getElementById("form-status");
  var submitting = false;

  /* ---------- Assunto escolhido nos botões "Quero conversar sobre…" ---------- */
  var topic = null;
  var topicBox = document.getElementById("form-topic");
  function setTopic(t) {
    topic = L.validTopic(t);
    if (!topicBox) return;
    topicBox.hidden = !topic;
    var strong = topicBox.querySelector("strong");
    if (strong) strong.textContent = topic || "";
    document.querySelectorAll("[data-topic]").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-topic") === topic ? "true" : "false");
    });
  }
  document.querySelectorAll("[data-topic]").forEach(function (b) {
    b.addEventListener("click", function () {
      setTopic(b.getAttribute("data-topic"));
      setTimeout(function () { try { nameInput.focus({ preventScroll: true }); } catch (e) { nameInput.focus(); } }, 650);
    });
  });
  var clearTopic = document.querySelector("[data-topic-clear]");
  if (clearTopic) clearTopic.addEventListener("click", function () { setTopic(null); });

  function setFieldError(input, message) {
    var errEl = document.getElementById(input.id + "-error");
    input.setAttribute("aria-invalid", message ? "true" : "false");
    if (errEl) { errEl.textContent = message || ""; errEl.hidden = !message; }
  }
  function setStatus(type, message) {
    statusEl.className = "form-status" + (type ? " is-" + type : "");
    statusEl.textContent = message || "";
  }

  phoneInput.addEventListener("input", function () {
    var atEnd = phoneInput.selectionStart === phoneInput.value.length;
    phoneInput.value = L.formatPhoneInput(phoneInput.value);
    if (atEnd) phoneInput.setSelectionRange(phoneInput.value.length, phoneInput.value.length);
    if (phoneInput.getAttribute("aria-invalid") === "true") setFieldError(phoneInput, L.validatePhone(phoneInput.value).error);
  });
  nameInput.addEventListener("input", function () {
    if (nameInput.getAttribute("aria-invalid") === "true") setFieldError(nameInput, L.validateName(nameInput.value).error);
  });
  nameInput.addEventListener("blur", function () {
    if (nameInput.value) setFieldError(nameInput, L.validateName(nameInput.value).error);
  });
  phoneInput.addEventListener("blur", function () {
    if (phoneInput.value) setFieldError(phoneInput, L.validatePhone(phoneInput.value).error);
  });

  function goToRedirect() {
    var q = L.utmQuery(utms);
    window.location.assign((cfg.redirectPath || "/redirect") + "?r=1" + (topic ? "&a=" + encodeURIComponent(topic) : "") + (q ? "&" + q : ""));
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (submitting) return;

    var n = L.validateName(nameInput.value);
    var p = L.validatePhone(phoneInput.value);
    setFieldError(nameInput, n.error);
    setFieldError(phoneInput, p.error);
    if (!n.ok || !p.ok) {
      setStatus("error", "Confira os campos destacados.");
      (n.ok ? phoneInput : nameInput).focus();
      return;
    }

    // Proteção simples contra robôs: campo invisível preenchido ou envio instantâneo.
    if ((honeypot && honeypot.value) || Date.now() - loadedAt < 2500) {
      setStatus("error", "Não foi possível enviar agora. Aguarde alguns segundos e tente novamente.");
      return;
    }

    if (cfg.previewMode) {
      setStatus("success", "Prévia: dados válidos. Na página publicada eles são gravados e o WhatsApp abre em seguida.");
      return;
    }

    if (L.recentlySaved(p.value)) { goToRedirect(); return; }

    submitting = true;
    form.setAttribute("aria-busy", "true");
    submitBtn.disabled = true;
    submitBtn.classList.add("is-loading");
    setStatus("", "Enviando seus dados…");

    L.saveLead({ nome: n.value, whatsapp: p.value, utms: utms, topic: topic })
      .then(function () {
        L.markSaved(p.value);
        setStatus("success", "Dados registrados. Encaminhando você para o WhatsApp…");
        setTimeout(goToRedirect, 400);
      })
      .catch(function () {
        submitting = false;
        form.removeAttribute("aria-busy");
        submitBtn.disabled = false;
        submitBtn.classList.remove("is-loading");
        setStatus("error", "Não conseguimos registrar seus dados agora. Verifique sua conexão e tente de novo em instantes.");
      });
  });
})();
