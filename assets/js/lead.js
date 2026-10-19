/*
 * Captura de leads: validação, normalização, UTMs e persistência.
 * Sem dependências. Exposto em window.IAGLead.
 */
(function () {
  "use strict";
  var cfg = window.IAG_CONFIG;
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  var UTM_STORE = "iag_utm";
  var LAST_LEAD = "iag_last_lead";

  function safeGet(key) {
    try { return window.sessionStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, value) {
    try { window.sessionStorage.setItem(key, value); } catch (e) { /* storage indisponível: segue sem */ }
  }

  /* ---------- UTMs ---------- */
  function cleanParam(v) {
    return String(v || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 120);
  }

  // Lê UTMs da URL atual; se não houver, usa as guardadas na sessão (navegação interna).
  function captureUtms(search) {
    var params = new URLSearchParams(search || window.location.search);
    var found = {};
    UTM_KEYS.forEach(function (k) {
      var v = cleanParam(params.get(k));
      if (v) found[k] = v;
    });
    if (Object.keys(found).length) {
      safeSet(UTM_STORE, JSON.stringify(found));
      return found;
    }
    try { return JSON.parse(safeGet(UTM_STORE) || "{}") || {}; } catch (e) { return {}; }
  }

  function utmQuery(utms) {
    var p = new URLSearchParams();
    UTM_KEYS.forEach(function (k) { if (utms[k]) p.set(k, utms[k]); });
    return p.toString();
  }

  /* ---------- Validação ---------- */
  function normalizeName(raw) {
    return String(raw || "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim();
  }

  function validateName(raw) {
    var name = normalizeName(raw);
    if (!name) return { ok: false, error: "Informe seu nome." };
    if (name.length < 2) return { ok: false, error: "O nome precisa ter pelo menos 2 letras." };
    if (name.length > 80) return { ok: false, error: "Use no máximo 80 caracteres." };
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'´`.\- ]*$/.test(name)) {
      return { ok: false, error: "Use apenas letras no nome." };
    }
    return { ok: true, value: name };
  }

  // Aceita (63) 99945-1967, 63999451967, +55 63 99945-1967, 063... Retorna "55" + DDD + número.
  function normalizePhone(raw) {
    var d = String(raw || "").replace(/\D/g, "");
    if ((d.length === 12 || d.length === 13) && d.indexOf("55") === 0) d = d.slice(2);
    if ((d.length === 11 || d.length === 12) && d.charAt(0) === "0") d = d.slice(1);
    return d;
  }

  function validatePhone(raw) {
    var d = normalizePhone(raw);
    if (!d) return { ok: false, error: "Informe seu WhatsApp com DDD." };
    if (d.length !== 10 && d.length !== 11) {
      return { ok: false, error: "Confira o número: use DDD + número, como (63) 99999-9999." };
    }
    var ddd = d.slice(0, 2);
    if (ddd.charAt(0) === "0" || ddd.charAt(1) === "0") {
      return { ok: false, error: "O DDD informado não é válido." };
    }
    if (d.length === 11 && d.charAt(2) !== "9") {
      return { ok: false, error: "Celulares com 11 dígitos começam com 9 depois do DDD." };
    }
    if (/^(\d)\1+$/.test(d.slice(2))) {
      return { ok: false, error: "Confira o número informado." };
    }
    return { ok: true, value: "55" + d };
  }

  // Máscara visual enquanto digita: (63) 99945-1967
  function formatPhoneInput(raw) {
    var d = String(raw || "").replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d.length ? "(" + d : "";
    if (d.length <= 6) return "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length <= 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
    return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
  }

  /* ---------- Persistência ---------- */
  function rest(table, body, opts) {
    var controller = "AbortController" in window ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, (opts && opts.timeout) || 12000) : null;
    return fetch(cfg.supabaseUrl + "/rest/v1/" + table, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: cfg.supabaseAnonKey,
        Authorization: "Bearer " + cfg.supabaseAnonKey,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(body),
      keepalive: !!(opts && opts.keepalive),
      signal: controller ? controller.signal : undefined,
    }).finally(function () { if (timer) clearTimeout(timer); });
  }

  // Grava o lead. Resolve só quando o backend confirma (HTTP 201); rejeita em qualquer outro caso.
  function saveLead(lead) {
    var origem = utmQuery(lead.utms) || "direto";
    return rest("lp_leads", {
      site: cfg.site,
      servico: cfg.servico,
      nome: lead.nome,
      whatsapp: lead.whatsapp,
      origem: origem.slice(0, 600),
    }).then(function (res) {
      if (res.status !== 201) {
        var err = new Error("lead_not_saved");
        err.status = res.status;
        throw err;
      }
      return true;
    });
  }

  // Evita uma segunda gravação do mesmo número na mesma sessão (ex.: voltar e reenviar).
  function recentlySaved(whatsapp) {
    try {
      var last = JSON.parse(safeGet(LAST_LEAD) || "null");
      return !!(last && last.w === whatsapp && Date.now() - last.t < 10 * 60 * 1000);
    } catch (e) { return false; }
  }
  function markSaved(whatsapp) {
    safeSet(LAST_LEAD, JSON.stringify({ w: whatsapp, t: Date.now() }));
  }

  // Visita anônima (sem dados pessoais) — alimenta o painel /dash da agência. Uma por sessão.
  function trackVisit() {
    if (safeGet("iag_visit")) return;
    safeSet("iag_visit", "1");
    var ref = "";
    try { ref = document.referrer ? new URL(document.referrer).hostname : ""; } catch (e) { ref = ""; }
    rest("lp_visits", { site: cfg.site, referrer: ref || null, path: window.location.pathname }, { keepalive: true, timeout: 8000 })
      .catch(function () { /* visita não é crítica */ });
  }

  function whatsappUrl() {
    return "https://wa.me/" + cfg.whatsappNumber + "?text=" + encodeURIComponent(cfg.whatsappMessage);
  }

  window.IAGLead = {
    captureUtms: captureUtms,
    utmQuery: utmQuery,
    validateName: validateName,
    validatePhone: validatePhone,
    normalizePhone: normalizePhone,
    formatPhoneInput: formatPhoneInput,
    saveLead: saveLead,
    recentlySaved: recentlySaved,
    markSaved: markSaved,
    trackVisit: trackVisit,
    whatsappUrl: whatsappUrl,
  };
})();
