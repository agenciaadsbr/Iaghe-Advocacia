/*
 * Painel de leads da LP — login via Supabase Auth; leitura protegida por RLS
 * (lp_acessos libera só o site desta LP para o usuário logado).
 */
(function () {
  "use strict";
  var cfg = window.IAG_CONFIG;
  var URL_ = cfg.supabaseUrl, KEY = cfg.supabaseAnonKey, SITE = cfg.site;
  var LOGIN_EMAIL = "admin@" + SITE + ".adsbr.internal"; // usuário "Admin" na tela
  var CLIENT = "Iaghe Advocacia";
  var LP_LABEL = { "iag-advocacia": "Direito Bancário" };
  // Separa as LPs do mesmo cliente: visitas pelo caminho da página, leads pelo início do "servico".
  var LPS = cfg.lps || {};
  function normPath(p) {
    p = String(p || "/").split("?")[0].replace(/\.html$/, "").replace(/\/index$/, "/");
    if (p.length > 1) p = p.replace(/\/+$/, "");
    return p || "/";
  }
  function lpOfVisit(v) {
    var p = normPath(v.path);
    for (var k in LPS) if (normPath(LPS[k].path) === p) return LPS[k].servico;
    return LP_LABEL[v.site] || v.site;
  }
  function lpOfLead(l) {
    var s = String(l.servico || "");
    for (var k in LPS) if (s === LPS[k].servico || s.indexOf(LPS[k].servico + " - ") === 0) return LPS[k].servico;
    return LP_LABEL[l.site] || l.site;
  }
  var SESSION_KEY = "iag_dash_session";
  var TZ = "America/Sao_Paulo";
  var PAGE = 1000;

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Sessão ---------- */
  function loadSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch (e) { return null; } }
  function saveSession(s) { try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) { /* segue em memória */ } memSession = s; }
  function clearSession() { try { localStorage.removeItem(SESSION_KEY); } catch (e) {} memSession = null; }
  var memSession = loadSession();

  function authRequest(grant, body) {
    return fetch(URL_ + "/auth/v1/token?grant_type=" + grant, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: KEY },
      body: JSON.stringify(body),
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || !j.access_token) { var e = new Error("auth"); e.status = r.status; throw e; }
        var s = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in || 3600) * 1000 };
        saveSession(s);
        return s;
      });
    });
  }

  function validSession() {
    var s = memSession;
    if (!s) return Promise.reject(new Error("no-session"));
    if (s.expires_at - Date.now() > 60000) return Promise.resolve(s);
    return authRequest("refresh_token", { refresh_token: s.refresh_token });
  }

  /* ---------- REST com paginação ---------- */
  function fetchAll(table, query) {
    var out = [];
    function page(from) {
      return validSession().then(function (s) {
        return fetch(URL_ + "/rest/v1/" + table + "?" + query, {
          headers: { apikey: KEY, Authorization: "Bearer " + s.access_token, Range: from + "-" + (from + PAGE - 1), "Range-Unit": "items" },
        });
      }).then(function (r) {
        if (r.status === 401) { var e = new Error("unauth"); e.status = 401; throw e; }
        if (!r.ok && r.status !== 206) throw new Error("http " + r.status);
        return r.json();
      }).then(function (rows) {
        out = out.concat(rows);
        return rows.length === PAGE ? page(from + PAGE) : out;
      });
    }
    return page(0);
  }

  /* ---------- Datas (fuso de Brasília) ---------- */
  var dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  var dtFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  function dayKey(d) { return dayFmt.format(d); } // YYYY-MM-DD
  function addDays(key, n) { var d = new Date(key + "T12:00:00-03:00"); d.setUTCDate(d.getUTCDate() + n); return dayKey(d); }
  function shortDay(key) { return key.slice(8, 10) + "/" + key.slice(5, 7); }

  /* ---------- Formatação ---------- */
  function fmtPhone(w) {
    var d = String(w || "").replace(/\D/g, "");
    if (d.indexOf("55") === 0 && d.length >= 12) d = d.slice(2);
    if (d.length === 11) return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
    if (d.length === 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
    return w || "";
  }
  function waLink(lead) {
    var d = String(lead.whatsapp || "").replace(/\D/g, "");
    if (d.length === 10 || d.length === 11) d = "55" + d;
    var first = String(lead.nome || "").trim().split(/\s+/)[0] || "";
    var msg = "Olá, " + first + ". Recebemos seu contato através da " + CLIENT + " e gostaria de dar continuidade ao seu atendimento.";
    return "https://wa.me/" + d + "?text=" + encodeURIComponent(msg);
  }
  function origemLabel(o) {
    if (!o || o === "direto") return "Direto";
    try {
      var p = new URLSearchParams(o);
      var src = p.get("utm_source"), camp = p.get("utm_campaign");
      if (src || camp) return [src, camp].filter(Boolean).join(" / ");
    } catch (e) {}
    return o;
  }
  function pct(a, b) { return b ? (a / b) * 100 : 0; }
  function fmtPct(v) { return v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%"; }
  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text != null) e.textContent = text; // textContent: dados do formulário nunca viram HTML
    return e;
  }
  function emptyRow(tbody, cols, msg) {
    tbody.replaceChildren();
    var tr = el("tr"); var td = el("td", { colspan: String(cols), class: "empty" }, msg); tr.appendChild(td); tbody.appendChild(tr);
  }

  /* ---------- Views ---------- */
  function showLogin(msg) {
    $("view-app").hidden = true; $("view-login").hidden = false;
    $("l-msg").textContent = msg || "";
    setTimeout(function () { $("l-user").focus(); }, 0);
  }
  function showApp() {
    $("view-login").hidden = true; $("view-app").hidden = false;
    load();
  }

  $("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var user = $("l-user").value.trim(), pass = $("l-pass").value;
    if (!user || !pass) { $("l-msg").textContent = "Preencha usuário e senha."; return; }
    var email = user.indexOf("@") > -1 ? user : (user.toLowerCase() === "admin" ? LOGIN_EMAIL : null);
    if (!email) { $("l-msg").textContent = "Usuário ou senha incorretos."; return; }
    $("l-btn").disabled = true; $("l-msg").textContent = "";
    authRequest("password", { email: email, password: pass })
      .then(function () { $("l-pass").value = ""; showApp(); })
      .catch(function (err) {
        $("l-msg").textContent = err.status === 400 || err.status === 401 ? "Usuário ou senha incorretos." : "Não foi possível conectar. Tente de novo em instantes.";
      })
      .finally(function () { $("l-btn").disabled = false; });
  });

  $("logout").addEventListener("click", function () {
    var s = memSession;
    clearSession();
    if (s) fetch(URL_ + "/auth/v1/logout", { method: "POST", headers: { apikey: KEY, Authorization: "Bearer " + s.access_token } }).catch(function () {});
    showLogin();
  });

  /* ---------- Carregar e desenhar ---------- */
  var today = dayKey(new Date());
  $("d-to").value = today;
  $("d-from").value = addDays(today, -29);
  $("d-from").max = today; $("d-to").max = today;
  ["d-from", "d-to"].forEach(function (id) { $(id).addEventListener("change", load); });

  var reqId = 0, lastChart = null;
  function load() {
    var from = $("d-from").value, to = $("d-to").value;
    if (!from || !to) return;
    if (from > to) { var t = from; from = to; to = t; }
    var startIso = new Date(from + "T00:00:00-03:00").toISOString();
    var endIso = new Date(addDays(to, 1) + "T00:00:00-03:00").toISOString();
    var range = "&created_at=gte." + encodeURIComponent(startIso) + "&created_at=lt." + encodeURIComponent(endIso);
    var site = "site=eq." + encodeURIComponent(SITE);
    var my = ++reqId;
    $("subtitle").textContent = "Carregando…";

    Promise.all([
      fetchAll("lp_leads", "select=id,site,servico,nome,whatsapp,origem,created_at&" + site + range + "&order=created_at.desc"),
      fetchAll("lp_visits", "select=site,path,created_at&" + site + range + "&order=created_at.asc"),
    ]).then(function (res) {
      if (my !== reqId) return;
      render(res[0], res[1], from, to);
    }).catch(function (err) {
      if (my !== reqId) return;
      if (err.status === 401 || err.message === "no-session" || err.message === "auth") { clearSession(); showLogin("Sua sessão expirou. Entre de novo."); return; }
      $("subtitle").textContent = "Não foi possível carregar os dados. Verifique a conexão e recarregue a página.";
    });
  }

  function render(leads, visits, from, to) {
    var n = leads.length;
    $("subtitle").textContent = n === 1 ? "1 lead no período" : n.toLocaleString("pt-BR") + " leads no período";
    $("s-visits").textContent = visits.length.toLocaleString("pt-BR");
    $("s-leads").textContent = n.toLocaleString("pt-BR");
    $("s-conv").textContent = fmtPct(pct(n, visits.length));

    // Série diária
    var days = [], k = from;
    while (k <= to && days.length < 400) { days.push(k); k = addDays(k, 1); }
    var vMap = {}, lMap = {};
    visits.forEach(function (v) { var d = dayKey(new Date(v.created_at)); vMap[d] = (vMap[d] || 0) + 1; });
    leads.forEach(function (l) { var d = dayKey(new Date(l.created_at)); lMap[d] = (lMap[d] || 0) + 1; });
    var series = days.map(function (d) { var v = vMap[d] || 0, l = lMap[d] || 0; return { d: d, v: v, l: l, c: pct(l, v) }; });
    lastChart = [series, visits.length + n === 0];
    drawChart(series, visits.length + n === 0);

    // Conversão por LP
    var bySite = {};
    visits.forEach(function (v) { var k = lpOfVisit(v); (bySite[k] = bySite[k] || { v: 0, l: 0 }).v++; });
    leads.forEach(function (l) { var k = lpOfLead(l); (bySite[k] = bySite[k] || { v: 0, l: 0 }).l++; });
    var tLp = $("t-lp"), sites = Object.keys(bySite);
    if (!sites.length) emptyRow(tLp, 4, "Nenhum dado encontrado");
    else {
      tLp.replaceChildren();
      sites.forEach(function (s) {
        var r = bySite[s], tr = el("tr");
        tr.appendChild(el("td", null, s));
        tr.appendChild(el("td", { class: "num" }, r.v.toLocaleString("pt-BR")));
        tr.appendChild(el("td", { class: "num" }, r.l.toLocaleString("pt-BR")));
        tr.appendChild(el("td", { class: "num" }, fmtPct(pct(r.l, r.v))));
        tLp.appendChild(tr);
      });
    }

    // Leads
    var tL = $("t-leads");
    if (!n) { emptyRow(tL, 6, "Nenhum lead encontrado"); return; }
    tL.replaceChildren();
    leads.forEach(function (l) {
      var tr = el("tr");
      tr.appendChild(el("td", null, l.nome));
      tr.appendChild(el("td", { class: "muted" }, fmtPhone(l.whatsapp)));
      tr.appendChild(el("td", { class: "muted" }, l.servico || LP_LABEL[l.site] || l.site));
      tr.appendChild(el("td", { class: "muted" }, origemLabel(l.origem)));
      tr.appendChild(el("td", { class: "muted" }, dtFmt.format(new Date(l.created_at))));
      var td = el("td"), a = el("a", { class: "wa", href: waLink(l), target: "_blank", rel: "noopener noreferrer", "aria-label": "Abrir WhatsApp de " + (l.nome || "lead") });
      a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.3-.5.1-1 .1-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.3-.3.6-.3.7-.3h.6c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.7 1.2 1.5 1.9 1 .9 1.9 1.2 2.2 1.3.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.8.9c.3.1.4.2.5.3.1.1.1.6-.1 1.3Z"/></svg>';
      a.appendChild(document.createTextNode("WhatsApp"));
      td.appendChild(a); tr.appendChild(td);
      tL.appendChild(tr);
    });
  }

  /* ---------- Gráfico (SVG, sem biblioteca) ---------- */
  function drawChart(series, empty) {
    var box = $("chart");
    box.replaceChildren();
    if (empty) { box.appendChild(el("p", { class: "empty" }, "Nenhum dado encontrado no período")); return; }
    var W = Math.max(box.clientWidth, 300), H = window.innerWidth <= 560 ? 220 : 280;
    var m = { t: 12, r: 44, b: 26, l: 34 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
    var maxCount = Math.max(1, Math.max.apply(null, series.map(function (s) { return Math.max(s.v, s.l); })));
    var niceMax = niceCeil(maxCount);
    var maxPct = Math.max(10, niceCeil(Math.max.apply(null, series.map(function (s) { return s.c; }))));
    var n = series.length;
    var x = function (i) { return m.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1)); };
    var yL = function (v) { return m.t + ih - (v / niceMax) * ih; };
    var yR = function (v) { return m.t + ih - (v / maxPct) * ih; };
    var NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Gráfico diário de visitas, cadastros e taxa de conversão");
    function mk(tag, at, parent) { var e = document.createElementNS(NS, tag); Object.keys(at).forEach(function (k) { e.setAttribute(k, at[k]); }); (parent || svg).appendChild(e); return e; }

    var grid = mk("g", { class: "grid" }), axis = mk("g", { class: "axis" });
    for (var t = 0; t <= 4; t++) {
      var vv = (niceMax / 4) * t, yy = yL(vv);
      mk("line", { x1: m.l, x2: W - m.r, y1: yy, y2: yy }, grid);
      mk("text", { x: m.l - 8, y: yy + 4, "text-anchor": "end" }, axis).textContent = fmtTick(vv);
      mk("text", { x: W - m.r + 8, y: yR((maxPct / 4) * t) + 4, "text-anchor": "start" }, axis).textContent = ((maxPct / 4) * t).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";
    }
    var step = Math.max(1, Math.ceil(n / Math.floor(iw / 56)));
    series.forEach(function (s, i) { if (i % step === 0 || (i === n - 1 && (n - 1) % step >= step / 2)) mk("text", { x: x(i), y: H - 6, "text-anchor": "middle" }, axis).textContent = shortDay(s.d); });

    function line(key, yf, color, width, dash) {
      var d = series.map(function (s, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + yf(s[key]).toFixed(1); }).join(" ");
      var at = { d: d, fill: "none", stroke: color, "stroke-width": width, "stroke-linejoin": "round", "stroke-linecap": "round" };
      if (dash) at["stroke-dasharray"] = dash;
      mk("path", at);
      if (n <= 45) series.forEach(function (s, i) { mk("circle", { cx: x(i), cy: yf(s[key]), r: 2.5, fill: color }); });
    }
    var css = getComputedStyle(document.documentElement);
    line("v", yL, css.getPropertyValue("--c-visits").trim(), 1.5);
    line("l", yL, css.getPropertyValue("--c-leads").trim(), 2);
    line("c", yR, css.getPropertyValue("--c-conv").trim(), 1.5, "4 4");

    var guide = mk("line", { y1: m.t, y2: m.t + ih, stroke: "#525252", "stroke-width": 1, opacity: 0 });
    var tip = el("div", { class: "tip", hidden: "" });
    box.appendChild(svg); box.appendChild(tip);
    svg.addEventListener("pointermove", function (ev) {
      var r = svg.getBoundingClientRect(), px = ((ev.clientX - r.left) / r.width) * W;
      var i = n === 1 ? 0 : Math.round(((px - m.l) / iw) * (n - 1));
      i = Math.max(0, Math.min(n - 1, i));
      var s = series[i], gx = x(i);
      guide.setAttribute("x1", gx); guide.setAttribute("x2", gx); guide.setAttribute("opacity", 1);
      tip.replaceChildren(el("b", null, shortDay(s.d)), document.createTextNode("Visitas " + s.v + " · Cadastros " + s.l + " · " + fmtPct(s.c)));
      tip.hidden = false;
      tip.style.left = Math.min(Math.max((gx / W) * r.width, 90), r.width - 90) + "px";
      tip.style.top = (m.t / H) * r.height + 4 + "px";
    });
    svg.addEventListener("pointerleave", function () { guide.setAttribute("opacity", 0); tip.hidden = true; });
  }
  function niceCeil(v) { if (v <= 4) return 4; var p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
  function fmtTick(v) { return v >= 1000 ? (v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "k" : v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }); }

  var resizeT;
  window.addEventListener("resize", function () { clearTimeout(resizeT); resizeT = setTimeout(function () { if (!$("view-app").hidden && lastChart) drawChart(lastChart[0], lastChart[1]); }, 250); });

  /* ---------- Início ---------- */
  if (memSession) showApp(); else showLogin();
})();
