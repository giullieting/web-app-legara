(function () {
  "use strict";
  var C = window.LEGARA_CONTENT, K = window.LEGARA_CONFIG;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  var ARTIGOS = window.LEGARA_ARTIGOS || [];
  function inline(t) {
    return esc(t)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  }
  /* Markdown simples: ##, ###, **negrito**, *itálico*, listas, caixas de seleção e links http(s). */
  function md(src) {
    var out = [], par = [], lst = [], tipo = "";
    function fechaPar() { if (par.length) { out.push("<p>" + inline(par.join(" ")) + "</p>"); par = []; } }
    function fechaLst() { if (lst.length) { out.push('<ul class="' + tipo + '">' + lst.join("") + "</ul>"); lst = []; tipo = ""; } }
    String(src).split("\n").forEach(function (l) {
      var m, t = l.trim();
      if (!t) { fechaPar(); fechaLst(); return; }
      if ((m = t.match(/^(#{2,3})\s+(.*)$/))) { fechaPar(); fechaLst(); out.push("<h" + m[1].length + ">" + inline(m[2]) + "</h" + m[1].length + ">"); return; }
      if ((m = t.match(/^[-*]\s+\[( |x)\]\s+(.*)$/i))) { fechaPar(); if (tipo !== "check") fechaLst(); tipo = "check"; lst.push('<li><span class="box' + (m[1] !== " " ? " on" : "") + '" aria-hidden="true"></span>' + inline(m[2]) + "</li>"); return; }
      if ((m = t.match(/^[-*]\s+(.*)$/))) { fechaPar(); if (tipo !== "bul") fechaLst(); tipo = "bul"; lst.push("<li>" + inline(m[1]) + "</li>"); return; }
      fechaLst(); par.push(t);
    });
    fechaPar(); fechaLst(); return out.join("\n");
  }
  function leitura(a) { return Math.max(1, Math.ceil(String(a.corpo).split(/\s+/).length / 200)); }
  var LOGO = "assets/logo-gold-transparent.png";
  window.LEGARA_LOGO_SRC = LOGO;

  function servicosVisiveis() { return C.servicos; }

  /* ---------- Renderização das seções ---------- */
  function renderHome() {
    var m = C.marca;
    $("#hero-eyebrow").textContent = m.descritor;
    var partes = m.lema.split(". ");
    $("#hero-titulo").innerHTML = esc(partes[0]) + ".<em>" + esc((partes[1] || "")) + "</em>";
    $("#hero-texto").textContent = C.hero.texto;
    $("#hero-cta1").innerHTML = esc(C.hero.cta1) + ' <span class="arrow" aria-hidden="true">→</span>';
    $("#hero-cta2").textContent = C.hero.cta2;
    $("#hero-alt").textContent = m.lemaAlternativo;

    $("#dif-grid").innerHTML = C.diferenciais.map(function (d) {
      return '<div class="dif"><h3>' + esc(d.titulo) + "</h3><p>" + esc(d.texto) + "</p></div>";
    }).join("");

    var sv = servicosVisiveis();
    function card(s) {
      return '<a class="svc" href="#servico-' + s.slug + '">' +
        "<h3>" + esc(s.titulo) + "</h3><p>" + esc(s.resumo) + '</p><span class="more">Saiba mais <span class="arrow" aria-hidden="true">→</span></span></a>';
    }
    $("#svc-grid").innerHTML = sv.map(card).join("");
    var comp = C.complementares;
    $("#svc-extra").innerHTML = '<div class="svc-sub"><h3>' + esc(comp.titulo) + '</h3></div><div class="comp-intro">' + comp.intro.map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("") + '</div><div class="svc-grid">' +
      comp.itens.map(function (x) { return '<div class="svc svc-static"><h3>' + esc(x.titulo) + "</h3><p>" + esc(x.descricao) + '</p><p class="aplic"><strong>Aplicações:</strong> ' + esc(x.aplicacoes) + "</p></div>"; }).join("") + "</div>";
    $("#svc-aviso").textContent = C.avisoServicos;
    var SM = C.simuladores;
    $("#simu-titulo").textContent = SM.titulo; $("#simu-intro").textContent = SM.intro; $("#simu-aviso").textContent = C.simulador.aviso;
    $("#tools-grid").innerHTML = SM.ferramentas.map(function (f) { return '<a class="svc tool' + (f.destaque ? " tool-hi" : "") + '" href="#' + f.slug + '">' + (f.destaque ? '<span class="tag">Em destaque</span>' : "") + "<h3>" + esc(f.titulo) + "</h3><p>" + esc(f.resumo) + '</p><span class="more">Abrir <span class="arrow" aria-hidden="true">→</span></span></a>'; }).join("");

    var s = C.sobre;
    $("#sobre-titulo").textContent = s.titulo;
    $("#sobre-texto").innerHTML = s.texto.map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("");
    $("#sobre-mv").innerHTML = "<div><h3>Missão</h3><p>" + esc(s.missao) + "</p></div><div><h3>Visão</h3><p>" + esc(s.visao) + "</p></div>";
    $("#sobre-valores").innerHTML = "<h3>Valores</h3><ul>" + s.valores.map(function (v) { return "<li>" + esc(v) + "</li>"; }).join("") + "</ul>";

    $("#atd-titulo").textContent = C.atendimento.titulo;
    $("#steps").innerHTML = C.atendimento.etapas.map(function (e) { return '<li class="step"><h3>' + esc(e.titulo) + "</h3><p>" + esc(e.texto) + "</p></li>"; }).join("");
    $("#steps-aviso").textContent = C.atendimento.aviso;

    $("#cont-titulo").textContent = C.conteudo.titulo;
    $("#cont-intro").textContent = C.conteudo.intro;
    renderArticles("");

    $("#faq-list").innerHTML = C.faq.map(function (f) { return "<details><summary>" + esc(f.p) + '</summary><div class="ans">' + esc(f.r) + "</div></details>"; }).join("");

    $("#ct-titulo").textContent = C.contato.titulo;
    $("#ct-texto").textContent = C.contato.texto;
    $("#ct-sigilo").textContent = C.contato.avisoSigilo;
    var acts = "";
    if (K.whatsapp) acts += '<a class="btn btn-outline" target="_blank" rel="noopener" href="https://wa.me/' + esc(K.whatsapp) + "?text=" + encodeURIComponent(K.whatsappTexto) + '">WhatsApp</a>';
    if (K.email) acts += '<a class="btn btn-outline" href="mailto:' + esc(K.email) + '">' + esc(K.email) + "</a>";
    $("#ct-actions").innerHTML = acts;
    $("#f-servico").innerHTML = '<option value="">Selecione</option>' + sv.concat(C.complementares.itens).map(function (x) { return '<option value="' + esc(x.titulo) + '">' + esc(x.titulo) + "</option>"; }).join("") + '<option value="Ainda não sei">Ainda não sei</option>';
  }

  var catAtiva = "";
  function fmtData(d) { var p = d.split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }
  function renderArticles(cat) {
    catAtiva = cat;
    var list = ARTIGOS.filter(function (a) { return !cat || a.categoria === cat; }).sort(function (a, b) { return b.data.localeCompare(a.data); });
    $("#articles").innerHTML = list.length ? '<div class="articles">' + list.map(function (a) {
      return '<a class="art" href="#artigo-' + a.slug + '"><span class="meta">' + esc(a.categoria) + " · " + fmtData(a.data) + " · " + leitura(a) + " min de leitura</span><h3>" + esc(a.titulo) + "</h3><p>" + esc(a.resumo) + "</p></a>";
    }).join("") + "</div>" : '<p class="empty">' + esc(C.conteudo.vazio) + "</p>";
  }

  /* ---------- Rodapé ---------- */
  function renderFooter() {
    var e = K.empresa;
    function dado(rot, v) { return "<li>" + rot + ": " + (v ? esc(v) : '<span class="todo">a preencher</span>') + "</li>"; }
    var contato = "";
    if (K.email) contato += "<li>" + esc(K.email) + "</li>";
    if (K.whatsapp) contato += "<li>WhatsApp: " + esc(K.whatsapp) + "</li>";
    var redes = (e.redesSociais || []).map(function (r) { return '<li><a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.nome) + "</a></li>"; }).join("");
    $("#foot-grid").innerHTML =
      '<div><img src="' + LOGO + '" alt="LEGARA, Perícia Patrimonial e Societária" width="1200" height="727"><p style="margin-top:20px">Análises técnicas, perícias e avaliações voltadas à compreensão de questões patrimoniais, financeiras e societárias.</p></div>' +
      "<div><h4>Serviços</h4><ul>" + C.servicos.map(function (s) { return '<li><a href="#servico-' + s.slug + '">' + esc(s.titulo) + "</a></li>"; }).join("") + "</ul></div>" +
      '<div><h4>Institucional</h4><ul><li><a href="#sobre">Sobre</a></li><li><a href="#atendimento">Atendimento</a></li><li><a href="#conteudo">Artigos</a></li><li><a href="#simuladores">Simuladores</a></li><li><a href="#faq">Perguntas frequentes</a></li><li><a href="#contato">Contato</a></li><li><a href="#privacidade">Política de privacidade</a></li></ul></div>' +
      "<div><h4>Contato e dados da empresa</h4><ul>" + contato + dado("Razão social", e.razaoSocial) + dado("CNPJ", e.cnpj) + dado("Endereço", e.endereco) + dado("Responsável técnico", e.responsavelTecnico) + dado("Registros profissionais", e.registrosProfissionais) + redes + "</ul></div>";
    $("#foot-bottom").innerHTML = "<span>© " + new Date().getFullYear() + " LEGARA. Todos os direitos reservados.</span><span>Este site não utiliza cookies de rastreamento. <a href=\"#privacidade\">Saiba mais</a></span>";
  }

  /* ---------- Roteamento por hash (tokens simples) ---------- */
  var SECOES = ["inicio", "diferenciais", "servicos", "sobre", "atendimento", "conteudo", "simuladores", "faq", "contato"];
  function showView(html) { $("#view-in").innerHTML = html; $("#home").hidden = true; $("#view").hidden = false; window.scrollTo(0, 0); }
  function showHome() { $("#home").hidden = false; $("#view").hidden = true; }
  function route() {
    var h = (location.hash || "#inicio").slice(1);
    document.title = C.marca.nome + " | " + C.marca.descritor;
    var m;
    if ((m = h.match(/^servico-(.+)$/))) {
      var s = C.servicos.filter(function (x) { return x.slug === m[1]; })[0];
      if (s) {
        document.title = s.titulo + " | " + C.marca.nome;
        var outros = servicosVisiveis().filter(function (x) { return x !== s; });
        showView('<p class="crumbs"><a href="#inicio">Início</a> / <a href="#servicos">Serviços</a> / ' + esc(s.titulo) + "</p><h1>" + esc(s.titulo) + '</h1><p class="lead">' + esc(s.resumo) + "</p>" +
                    '<ul class="list">' + s.itens.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul>" +
          '<p class="note" style="margin-bottom:32px">' + esc(C.avisoServicos) + '</p><div class="actions"><a class="btn btn-primary" href="#contato" data-servico="' + esc(s.titulo) + '">Solicitar atendimento</a><a class="btn btn-outline" href="#servicos">Ver todos os serviços</a></div>' +
          '<div class="others"><h2>Outros serviços</h2><ul>' + outros.map(function (o) { return '<li><a href="#servico-' + o.slug + '">' + esc(o.titulo) + "</a></li>"; }).join("") + "</ul></div>");
        return;
      }
    }
    if ((m = h.match(/^artigo-(.+)$/))) {
      var a = ARTIGOS.filter(function (x) { return x.slug === m[1]; })[0];
      if (a) {
        document.title = a.titulo + " | " + C.marca.nome;
        showView('<article class="article"><p class="crumbs"><a href="#inicio">Início</a> / <a href="#conteudo">Artigos</a> / ' + esc(a.categoria) + '</p><p class="eyebrow">' + esc(a.categoria) + " · " + fmtData(a.data) + " · " + leitura(a) + ' min de leitura</p><h1>' + esc(a.titulo) + '</h1><div class="prose md">' + md(a.corpo) + "</div>" +
          (a.simulador ? '<aside class="sim-promo" style="margin-top:48px"><p>Quer ver como SAC e Price se comportam no seu caso? Teste no simulador SAC x Price.</p><a class="btn btn-primary" href="#sac-price">Abrir o simulador <span class="arrow" aria-hidden="true">→</span></a></aside>' : "") +
          '<div class="actions" style="margin-top:40px"><a class="btn btn-outline" href="#conteudo">Voltar aos artigos</a><a class="btn btn-outline" href="#contato">Falar com a LEGARA</a></div></article>');
        return;
      }
    }
    var ferr = C.simuladores.ferramentas.filter(function (x) { return x.slug === h; })[0];
    if (ferr) {
      document.title = ferr.titulo + " | " + C.marca.nome;
      var dest = document.createElement("div"); $("#view-in").innerHTML = ""; $("#view-in").appendChild(dest);
      $("#home").hidden = true; $("#view").hidden = false; window.scrollTo(0, 0);
      var cfg = { id: ferr.slug, titulo: ferr.titulo, intro: ferr.intro };
      if (h === "sac-price") { cfg.sistemas = ["price", "sac"]; cfg.arquivo = "LEGARA-sac-x-price.xlsx"; cfg.tituloXlsx = "SAC x Price"; cfg.insight = true; window.LegaraSim.mount(dest, C, cfg); }
      else if (h === "simulador") { cfg.sistemas = window.LegaraSim.util.ORDEM; cfg.arquivo = "LEGARA-simulacao-amortizacao.xlsx"; cfg.tituloXlsx = "Simulação de amortização"; window.LegaraSim.mount(dest, C, cfg); }
      else if (h === "antecipacao") window.LegaraCalc.mountAntecipacao(dest, C, cfg);
      else window.LegaraCalc.mountConferencia(dest, C, cfg);
      return;
    }
    if (h === "privacidade") {
      var p = C.privacidade;
      document.title = p.titulo + " | " + C.marca.nome;
      showView('<p class="crumbs"><a href="#inicio">Início</a> / ' + esc(p.titulo) + "</p><h1>" + esc(p.titulo) + '</h1><p class="callout">' + esc(p.aviso) + '</p><div class="prose">' + p.paragrafos.map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("") + "</div>");
      return;
    }
    var wasHidden = $("#home").hidden;
    showHome();
    if (SECOES.indexOf(h) >= 0) {
      var el = document.getElementById(h);
      if (wasHidden && el) el.scrollIntoView();
    } else if (!(h && document.getElementById(h))) { window.scrollTo(0, 0); }
    SECOES.forEach(function (id) {
      var l = document.querySelector('.nav a[href="#' + id + '"]'); if (l) l.setAttribute("aria-current", id === h ? "true" : "false");
    });
    closeMenu();
  }

  /* ---------- Menu ---------- */
  function closeMenu() { $("#nav").classList.remove("open"); $("#menu-btn").setAttribute("aria-expanded", "false"); }
  $("#menu-btn").addEventListener("click", function () {
    var open = $("#nav").classList.toggle("open"); this.setAttribute("aria-expanded", String(open));
  });

  /* ---------- Formulário ---------- */
  var aberturaForm = Date.now();
  var form = $("#form"), statusEl = $("#f-status");
  function setErr(id, campo, msg) {
    $("#e-" + id).textContent = msg || "";
    var f = $("#e-" + id).closest(".field"); if (f) f.dataset.invalid = msg ? "true" : "false";
    return msg ? campo : null;
  }
  function validar() {
    var v = function (id) { return $("#f-" + id).value.trim(); };
    var primeiro = null, e;
    e = setErr("nome", "nome", v("nome").length < 3 ? "Informe seu nome completo." : ""); primeiro = primeiro || e;
    e = setErr("email", "email", /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v("email")) ? "" : "Informe um e-mail válido, como nome@dominio.com.br."); primeiro = primeiro || e;
    var dig = v("tel").replace(/\D/g, "");
    e = setErr("tel", "tel", dig.length < 10 || dig.length > 13 ? "Informe um telefone com DDD, de 10 a 13 dígitos." : ""); primeiro = primeiro || e;
    e = setErr("servico", "servico", v("servico") ? "" : "Selecione o tipo de serviço."); primeiro = primeiro || e;
    e = setErr("msg", "msg", v("msg").length < 20 ? "Descreva a necessidade em pelo menos 20 caracteres." : ""); primeiro = primeiro || e;
    e = setErr("consent", "consent", $("#f-consent").checked ? "" : "É necessário concordar com o tratamento dos dados para enviar."); primeiro = primeiro || e;
    return primeiro;
  }
  function status(kind, msg) { statusEl.hidden = false; statusEl.dataset.kind = kind; statusEl.textContent = msg; }
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    statusEl.hidden = true;
    var erro = validar();
    if (erro) { status("err", "Revise os campos destacados antes de enviar."); $("#f-" + erro).focus(); return; }
    if ($("#f-site").value || Date.now() - aberturaForm < 3000) { status("err", "Não foi possível enviar agora. Tente novamente em instantes."); return; }
    if (!K.formEndpoint) {
      status("info", "Os campos foram validados, mas o envio ainda não está configurado neste site. Nenhuma informação foi enviada.");
      return;
    }
    var btn = $("#f-submit"); btn.disabled = true; status("info", "Enviando sua solicitação...");
    var dados = { nome: $("#f-nome").value.trim(), email: $("#f-email").value.trim(), telefone: $("#f-tel").value.trim(), servico: $("#f-servico").value, mensagem: $("#f-msg").value.trim(), consentimento: "sim" };
    fetch(K.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(dados) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); form.reset(); status("ok", "Solicitação enviada. A LEGARA retornará pelo contato informado."); })
      .catch(function () { status("err", "Não foi possível enviar sua solicitação. Tente novamente ou use outro canal de contato."); })
      .then(function () { btn.disabled = false; });
  });
  ["nome", "email", "tel", "servico", "msg"].forEach(function (id) { $("#f-" + id).addEventListener("input", function () { setErr(id, id, ""); }); });
  $("#f-consent").addEventListener("change", function () { setErr("consent", "consent", ""); });
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest("a[data-servico]");
    if (a) { setTimeout(function () { $("#f-servico").value = a.dataset.servico; }, 0); }
  });

  /* ---------- Chatbot ---------- */
  var chat = $("#chat"), fab = $("#chat-fab"), chatBody = $("#chat-body"), chatInput = $("#chat-input"), chatSend = $("#chat-send");
  var historico = [], chatIniciado = false;
  function addMsg(t, quem) { var d = document.createElement("div"); d.className = "msg " + quem; d.textContent = t; chatBody.appendChild(d); chatBody.scrollTop = chatBody.scrollHeight; return d; }
  function iniciarChat() {
    if (chatIniciado) return; chatIniciado = true;
    $("#chat-nome").textContent = C.chatbot.nome;
    addMsg(C.chatbot.saudacao, "bot");
    var w = document.createElement("p"); w.className = "chat-warn"; w.textContent = C.chatbot.aviso; chatBody.appendChild(w);
    if (!K.chatEndpoint) { var n = document.createElement("p"); n.className = "chat-note"; n.textContent = C.chatbot.semIA; chatBody.appendChild(n); }
    var q = document.createElement("div"); q.className = "quick";
    q.innerHTML = C.chatbot.atalhos.map(function (a) { return '<a href="#' + a.destino + '">' + esc(a.rotulo) + "</a>"; }).join("");
    q.addEventListener("click", function (e) { if (e.target.closest("a")) setChat(false); });
    chatBody.appendChild(q);
    if (!K.chatEndpoint) { chatInput.disabled = true; chatSend.disabled = true; chatInput.placeholder = "IA ainda não conectada"; }
    else chatInput.placeholder = "Escreva sua dúvida";
  }
  function setChat(open) {
    chat.hidden = !open; fab.setAttribute("aria-expanded", String(open));
    if (open) { iniciarChat(); (chatInput.disabled ? $("#chat-close") : chatInput).focus(); } else fab.focus();
  }
  fab.addEventListener("click", function () { setChat(chat.hidden); });
  $("#chat-close").addEventListener("click", function () { setChat(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !chat.hidden) setChat(false); });
  $("#chat-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var t = chatInput.value.trim(); if (!t || !K.chatEndpoint) return;
    chatInput.value = ""; addMsg(t, "me"); historico.push({ role: "user", content: t }); historico = historico.slice(-10);
    var espera = addMsg("Digitando...", "bot"); chatSend.disabled = true;
    fetch(K.chatEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: historico }) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { espera.textContent = j.reply || "Não tenho dados suficientes para responder. Posso encaminhar você ao formulário de contato."; historico.push({ role: "assistant", content: espera.textContent }); })
      .catch(function () { espera.textContent = "Não consegui responder agora. Use o formulário de contato para falar com a equipe."; })
      .then(function () { chatSend.disabled = false; });
  });

  /* ---------- Início ---------- */
  if (K.avisoPrevia) { var pn = $("#preview-note"); pn.hidden = false; pn.textContent = "Prévia em desenvolvimento. Formulário e chat com IA ainda não estão conectados; dados institucionais a preencher."; }
  renderHome(); renderFooter();
  window.addEventListener("hashchange", route);
  route();
})();
