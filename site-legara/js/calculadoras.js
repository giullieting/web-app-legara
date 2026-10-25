/* Calculadoras da LEGARA: amortização antecipada e conferência da evolução do financiamento.
   Usa o cálculo e os utilitários de simulador.js (window.LegaraSim). Planilhas Excel só com valores calculados. */
(function () {
  "use strict";
  var LS = window.LegaraSim, U = LS.util, brl = U.brl, pct = U.pct, dt = U.dt, esc = U.esc, zero = U.zero, X = U.xl;
  var root;
  function $(s) { return root.querySelector(s); }
  function num(id) { var s = String($("#c-" + id).value).replace(",", "."); return s === "" ? NaN : Number(s); }
  function campo(id, rotulo, extra, dica) { return '<div class="field"><label for="c-' + id + '">' + rotulo + "</label>" + extra + (dica ? '<p class="hint">' + dica + "</p>" : "") + '<p class="err" id="c-e-' + id + '" aria-live="polite"></p></div>'; }
  function inp(id, v, ex) { return '<input id="c-' + id + '" type="number" inputmode="decimal" step="any" min="0" value="' + v + '"' + (ex || "") + ">"; }
  function sgn(v) { return (v > 0 ? "+" : v < 0 ? "−" : "") + brl.format(Math.abs(v)); }
  var NOME_SIS = { price: "Price", sac: "SAC", sam: "SAM", americano: "Americano" };

  /* ---------- Campos comuns ---------- */
  function camposBase(def) {
    return campo("pv", "Valor financiado (R$)", inp("pv", def.pv)) +
      campo("taxa", "Taxa de juros (%)", '<div class="pair">' + inp("taxa", def.taxa) + '<select id="c-per" aria-label="Período da taxa"><option value="anual">ao ano</option><option value="mensal">ao mês</option></select></div>') +
      campo("prazo", "Prazo", '<div class="pair"><input id="c-prazo" type="number" inputmode="numeric" step="1" min="1" value="' + def.prazo + '"><select id="c-unid" aria-label="Unidade do prazo"><option value="meses">meses</option><option value="anos">anos</option></select></div>');
  }
  function camposExtras() {
    return campo("seguro", "Seguro mensal (R$)", inp("seguro", 0)) + campo("tarifa", "Tarifa mensal (R$)", inp("tarifa", 0)) + campo("data", "Data da 1ª parcela", '<input id="c-data" type="date" value="' + U.isoHoje() + '">');
  }
  function lerBase(e, comCarencia) {
    var p = { bem: num("pv"), entrada: 0, taxa: num("taxa"), per: $("#c-per").value, prazo: num("prazo"), unid: $("#c-unid").value, carencia: comCarencia ? num("carencia") : 0, seguro: num("seguro"), tarifa: num("tarifa"), data: null };
    if (!(p.bem > 0)) e.pv = "Informe um valor maior que zero.";
    if (!(p.taxa >= 0)) e.taxa = "Informe uma taxa de zero ou mais."; else if (p.taxa > 1000) e.taxa = "Taxa fora de uma faixa plausível.";
    var meses = p.unid === "anos" ? p.prazo * 12 : p.prazo;
    if (!(p.prazo > 0) || meses > 600 || meses !== Math.round(meses)) e.prazo = "Informe um prazo inteiro de 1 a 600 meses (ou até 50 anos).";
    if (comCarencia) { if (!(p.carencia >= 0) || p.carencia !== Math.round(p.carencia)) e.carencia = "Informe um número inteiro de meses, de zero em diante."; else if (!e.prazo && p.carencia >= meses) e.carencia = "A carência deve ser menor que o prazo."; }
    if (!(p.seguro >= 0)) e.seguro = "Informe zero ou um valor positivo.";
    if (!(p.tarifa >= 0)) e.tarifa = "Informe zero ou um valor positivo.";
    var ds = $("#c-data").value.split("-");
    if (ds.length === 3 && Number(ds[0]) > 1900) p.data = new Date(Number(ds[0]), Number(ds[1]) - 1, Number(ds[2])); else e.data = "Informe a data da primeira parcela.";
    return p;
  }
  function mostrarErros(e, ids) {
    var tem = false;
    ids.forEach(function (id) { var m = e[id] || ""; var el = $("#c-e-" + id); if (!el) return; el.textContent = m; el.closest(".field").dataset.invalid = m ? "true" : "false"; if (m) tem = true; });
    return tem;
  }
  function cabecalhoPagina(cfg, C) {
    return '<p class="crumbs"><a href="#inicio">Início</a> / <a href="#simuladores">Simuladores</a> / ' + esc(cfg.titulo) + "</p><h1>" + esc(cfg.titulo) + '</h1><p class="lead">' + esc(cfg.intro) + "</p>" +
      '<aside class="callout sim-aviso" role="note"><strong>Aviso.</strong> ' + esc(C.simulador.aviso) + ' <a href="#contato">Falar com a LEGARA</a></aside>';
  }
  function tabela(cols, linhasHtml, rodapeHtml) {
    return "<thead><tr>" + cols.map(function (c) { return '<th scope="col">' + c + "</th>"; }).join("") + "</tr></thead><tbody>" + linhasHtml + "</tbody>" + (rodapeHtml || "");
  }

  /* ---------- Planilha: auxiliares (valores calculados) ---------- */
  function folha(wb, kit, nome, titulo, sub, cols, rows, fmts, widths) {
    var ws = wb.addWorksheet(nome, { properties: { tabColor: { argb: X.GOLD } }, views: [{ showGridLines: false, state: "frozen", ySplit: 5 }], pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
    ws.columns = widths.map(function (w) { return { width: w }; });
    kit.cabecalho(ws, titulo, sub, cols.length);
    var h = ws.getRow(5); h.height = 32;
    cols.forEach(function (t, q) { var c = h.getCell(q + 1); c.value = t; c.font = { name: "Calibri", size: 11, bold: true, color: { argb: X.GOLD_L } }; c.fill = kit.fill(X.NAVY); c.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; });
    rows.forEach(function (r, qi) {
      var row = 6 + qi, zebra = qi % 2 ? X.IVORY : "FFFFFFFF";
      r.forEach(function (v, c) { var cell = ws.getCell(row, c + 1); cell.value = v; cell.border = kit.borda; cell.fill = kit.fill(r.destaque ? "FFFFF3D6" : zebra); cell.font = { name: "Calibri", size: 10.5, color: { argb: X.INK } }; if (fmts[c]) cell.numFmt = fmts[c]; if (typeof v === "string") cell.alignment = { wrapText: true, vertical: "top" }; });
    });
    kit.rodape(ws, 6 + rows.length + 1, cols.length);
    return ws;
  }
  function folhaPremissas(wb, kit, titulo, linhas, extraTitulo, extraLinhas) {
    var ws = wb.addWorksheet("Premissas", { properties: { tabColor: { argb: X.GOLD } }, views: [{ showGridLines: false }], pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
    ws.columns = [{ width: 3 }, { width: 44 }, { width: 28 }, { width: 70 }];
    kit.cabecalho(ws, titulo, "Perícia Patrimonial e Societária", 4);
    ws.mergeCells("B5:D5"); var t = ws.getCell("B5"); t.value = "Premissas utilizadas"; t.font = { name: "Georgia", size: 15, color: { argb: X.INK } };
    var r = 6;
    linhas.forEach(function (l) { var a = ws.getCell(r, 2), b = ws.getCell(r, 3); a.value = l[0]; a.font = { name: "Calibri", size: 11, bold: true, color: { argb: X.INK } }; a.fill = kit.fill(X.IVORY); a.border = kit.borda; b.value = l[1]; if (l[2]) b.numFmt = l[2]; b.border = kit.borda; b.alignment = { horizontal: "right" }; b.font = { name: "Calibri", size: 11, color: { argb: X.INK } }; r++; });
    r++;
    (extraLinhas ? [[extraTitulo, extraLinhas]] : []).concat([["Aviso importante", X.AVISO]]).forEach(function (bl) {
      ws.mergeCells(r, 2, r, 4); var h = ws.getCell(r, 2); h.value = bl[0]; h.font = { name: "Georgia", size: 14, color: { argb: X.INK } }; r++;
      bl[1].forEach(function (tx) { ws.mergeCells(r, 2, r, 4); var c = ws.getCell(r, 2); c.value = tx; c.alignment = { wrapText: true, vertical: "top" }; c.font = { name: "Calibri", size: 10.5, color: { argb: X.INK } }; ws.getRow(r).height = Math.max(18, 16 * Math.ceil(tx.length / 110)); r++; });
      r++;
    });
    return ws;
  }

  /* =====================================================================
     1) Amortização antecipada
     ===================================================================== */
  function antecipar(p, sis, E, k) {
    var R = LS.calc(p), B = R.sist[sis], n = R.n, i = R.i, PV = R.PV;
    var ult = B.rows[k - 1], Ef = Math.min(E, ult.fim), quita = E >= ult.fim - 1e-9;
    function ramo(tipo) {
      var rows = B.rows.slice(0, k).map(function (r) { var c = {}; for (var x in r) c[x] = r[x]; c.pagExtra = 0; return c; });
      rows[k - 1].pagExtra = Ef; rows[k - 1].fim = ult.fim - Ef;
      var saldo = rows[k - 1].fim, s0 = saldo, q = k, m = n - k;
      var pmt2 = i === 0 ? s0 / m : s0 * i / (1 - Math.pow(1 + i, -m));
      while (saldo > 1e-9 && q < n) {
        var juros = saldo * i, am;
        if (tipo === "prazo") am = sis === "price" ? R.pmtPrice - juros : PV / n;
        else am = sis === "price" ? pmt2 - juros : s0 / m;
        if (am >= saldo - 1e-9 || (tipo === "prestacao" && q + 1 === n)) am = saldo;
        var parcela = juros + am;
        rows.push({ k: q + 1, data: U.addMonths(p.data, q), ini: saldo, juros: juros, amort: am, parcela: parcela, extra: R.extra, total: parcela + R.extra, pagExtra: 0, fim: saldo - am });
        saldo -= am; q++;
      }
      var tj = 0, tt = 0; rows.forEach(function (r) { tj += r.juros; tt += r.total + r.pagExtra; });
      return { rows: rows, tj: tj, tt: tt, np: rows.length, seg: rows[k] ? rows[k].total : null, ultima: rows[rows.length - 1].total };
    }
    var base = { rows: B.rows.map(function (r) { var c = {}; for (var x in r) c[x] = r[x]; c.pagExtra = 0; return c; }), tj: B.tj, tt: B.tt, np: n, seg: k < n ? B.rows[k].total : null, ultima: B.rows[n - 1].total };
    return { R: R, base: base, prazo: ramo("prazo"), prestacao: ramo("prestacao"), saldoK: ult.fim, Ef: Ef, quita: quita, k: k, n: n };
  }

  function mountAntecipacao(el, C, cfg) {
    root = el; var st = { res: null, p: null, sis: "price", cen: "prazo" };
    root.innerHTML = cabecalhoPagina(cfg, C) +
      '<div class="sim-grid"><form id="c-form" class="form-card" novalidate onsubmit="return false"><p class="label">Dados do financiamento <span class="hint">(valores de exemplo; edite todos os campos)</span></p><div class="sim-fields">' +
      camposBase({ pv: 280000, taxa: 11.5, prazo: 180 }) +
      campo("sis", "Sistema de amortização", '<select id="c-sis"><option value="price">Price (parcelas iguais)</option><option value="sac">SAC (amortização constante)</option></select>') +
      camposExtras() +
      '</div><p class="label" style="margin-top:28px">Pagamento extraordinário</p><div class="sim-fields">' +
      campo("extra", "Valor do pagamento extra (R$)", inp("extra", 20000)) +
      campo("mes", "Feito após o pagamento da parcela nº", inp("mes", 36, ' step="1" min="1"'), "O valor reduz o saldo devedor depois dessa parcela.") +
      '</div></form><div class="sim-out"><p class="empty" id="c-vazio" hidden>Corrija os campos destacados para ver o resultado.</p><div id="c-res">' +
      '<dl class="sim-resumo" id="c-resumo"></dl><p class="note" id="c-quita" hidden></p>' +
      '<h2>Comparativo dos cenários</h2><div class="scroll"><table class="tbl" id="c-comp"></table></div><div class="sim-insight" id="c-insight"></div>' +
      '<h2>Saldo devedor ao longo do prazo</h2><div class="sim-leg"><span><span class="sw sw-sac"></span>Sem pagamento extra</span><span><span class="sw sw-price"></span>Reduzindo o prazo</span><span><span class="sw sw-sam"></span>Reduzindo a prestação</span></div><div id="c-graf" class="sim-chart"></div>' +
      '<h2>Tabela de amortização</h2><div class="chips" id="c-tabs" role="group" aria-label="Cenário exibido"></div><div class="scroll tall"><table class="tbl" id="c-tab"></table></div>' +
      '<div class="sim-dl"><button class="btn btn-primary" id="c-baixar" type="button">Baixar planilha Excel <span class="arrow" aria-hidden="true">→</span></button><div class="status" id="c-status" role="status" aria-live="polite" hidden></div></div>' +
      '<p class="note">' + esc(C.simulador.aviso) + ' <a href="#contato">Entre em contato</a> para maiores informações.</p></div></div></div>';

    function atualizar() {
      var e = {}, p = lerBase(e, false), E = num("extra"), k = num("mes"), n = p.unid === "anos" ? p.prazo * 12 : p.prazo;
      if (!(E > 0)) e.extra = "Informe um valor maior que zero.";
      if (!(k >= 1) || k !== Math.round(k) || (!e.prazo && k >= n)) e.mes = "Informe um número inteiro de 1 até " + (isFinite(n) ? n - 1 : "o prazo menos 1") + ".";
      var tem = mostrarErros(e, ["pv", "taxa", "prazo", "seguro", "tarifa", "data", "extra", "mes"]);
      $("#c-res").hidden = tem; $("#c-vazio").hidden = !tem; if (tem) { st.res = null; return; }
      st.p = p; st.sis = $("#c-sis").value; st.res = antecipar(p, st.sis, E, k); st.E = E; render();
    }
    function render() {
      var A = st.res, R = A.R, b = A.base, a = A.prazo, c = A.prestacao;
      $("#c-resumo").innerHTML = [["Saldo antes do extra (após parcela " + A.k + ")", brl.format(A.saldoK)], ["Pagamento extra considerado", brl.format(A.Ef)], ["Saldo após o extra", brl.format(A.saldoK - A.Ef)], ["Taxa mensal efetiva", pct(R.i)]]
        .map(function (x) { return "<div><dt>" + x[0] + "</dt><dd>" + x[1] + "</dd></div>"; }).join("");
      var q = $("#c-quita"); q.hidden = !A.quita; if (A.quita) q.textContent = "O valor informado é igual ou maior que o saldo devedor após a parcela " + A.k + ". Foi considerado o valor necessário para quitar a dívida (" + brl.format(A.Ef) + ").";
      var linhas = [["Sem pagamento extra", b], ["Reduzindo o prazo (mantém a prestação)", a], ["Reduzindo a prestação (mantém o prazo)", c]];
      $("#c-comp").innerHTML = tabela(["Cenário", "Nº de parcelas", "Parcela seguinte ao extra", "Última parcela", "Total de juros", "Total pago (inclui o extra)", "Economia de juros", "Economia no total pago"],
        linhas.map(function (l, qi) { var s = l[1]; return '<tr><th scope="row">' + l[0] + "</th><td>" + s.np + "</td><td>" + (s.seg === null ? "—" : brl.format(s.seg)) + "</td><td>" + brl.format(s.ultima) + "</td><td>" + brl.format(s.tj) + "</td><td>" + brl.format(s.tt) + "</td><td>" + (qi ? brl.format(b.tj - s.tj) : "—") + "</td><td>" + (qi ? brl.format(b.tt - s.tt) : "—") + "</td></tr>"; }).join(""));
      var it = [];
      it.push("Reduzindo o prazo, o financiamento termina na parcela " + a.np + " (" + (b.np - a.np) + " parcela(s) a menos que o contrato original de " + b.np + ").");
      if (c.seg !== null && b.seg !== null) it.push("Reduzindo a prestação, a parcela seguinte passa de " + brl.format(b.seg) + " para " + brl.format(c.seg) + ", e o prazo continua em " + c.np + " parcelas.");
      it.push("A economia de juros em relação ao cenário sem pagamento extra é de " + brl.format(b.tj - a.tj) + " reduzindo o prazo e de " + brl.format(b.tj - c.tj) + " reduzindo a prestação.");
      $("#c-insight").innerHTML = "<ul>" + it.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>";
      var ser = function (cls, s) { return { cls: cls, pts: [[0, R.PV]].concat(s.rows.map(function (r) { return [r.k, Math.max(0, r.fim)]; })) }; };
      U.grafico($("#c-graf"), [ser("sac", b), ser("price", a), ser("sam", c)], A.n, R.PV, "Saldo devedor ao longo do prazo nos três cenários");
      var nomes = { base: "Sem pagamento extra", prazo: "Reduzindo o prazo", prestacao: "Reduzindo a prestação" };
      $("#c-tabs").innerHTML = ["base", "prazo", "prestacao"].map(function (x) { return '<button class="chip" type="button" data-cen="' + x + '" aria-pressed="' + (st.cen === x) + '">' + nomes[x] + "</button>"; }).join("");
      var S = st.cen === "base" ? b : st.cen === "prazo" ? a : c, tj = 0, ta = 0, tp = 0, tx = 0, tt = 0, pe = 0;
      var corpo = S.rows.map(function (r) { tj += r.juros; ta += r.amort; tp += r.parcela; tx += r.extra; tt += r.total; pe += r.pagExtra; return '<tr' + (r.pagExtra ? ' class="hl"' : "") + "><td>" + r.k + "</td><td>" + dt(r.data) + "</td><td>" + brl.format(zero(r.ini)) + "</td><td>" + brl.format(r.juros) + "</td><td>" + brl.format(r.amort) + "</td><td>" + brl.format(r.parcela) + "</td><td>" + brl.format(r.extra) + "</td><td>" + brl.format(r.total) + "</td><td>" + (r.pagExtra ? brl.format(r.pagExtra) : "—") + "</td><td>" + brl.format(zero(r.fim)) + "</td></tr>"; }).join("");
      $("#c-tab").innerHTML = tabela(["Nº", "Data", "Saldo inicial", "Juros", "Amortização", "Parcela", "Seguro + tarifa", "Total a pagar", "Pagamento extra", "Saldo final"], corpo,
        '<tfoot><tr><th scope="row" colspan="3">Total</th><td>' + brl.format(tj) + "</td><td>" + brl.format(ta) + "</td><td>" + brl.format(tp) + "</td><td>" + brl.format(tx) + "</td><td>" + brl.format(tt) + "</td><td>" + brl.format(pe) + "</td><td></td></tr></tfoot>");
    }
    function xlsx(logo) {
      var A = st.res, R = A.R, wb = new window.ExcelJS.Workbook(); wb.creator = "LEGARA"; wb.created = new Date(); wb.title = "LEGARA | Amortização antecipada";
      var kit = U.criarKit(wb, logo);
      folhaPremissas(wb, kit, "LEGARA | Amortização antecipada", [
        ["Valor financiado", R.PV, X.F_MONEY], ["Taxa mensal efetiva", R.i, X.F_PCT], ["Prazo (meses)", A.n, "0"], ["Sistema de amortização", NOME_SIS[st.sis]],
        ["Seguro + tarifa por mês", R.extra, X.F_MONEY], ["Data da 1ª parcela", st.p.data, X.F_DATE], ["Pagamento extra informado", st.E, X.F_MONEY], ["Pagamento extra considerado", A.Ef, X.F_MONEY], ["Feito após a parcela nº", A.k, "0"]],
        "Observações", ["Valores calculados no simulador (sem fórmulas). Juros compostos sobre o saldo, períodos mensais iguais, sem indexador, IOF ou pro rata dia.", "Reduzir o prazo: mantém a parcela (Price) ou a amortização (SAC) e antecipa o término. Reduzir a prestação: mantém o prazo e recalcula as parcelas seguintes."]);
      var b = A.base, a = A.prazo, c = A.prestacao;
      folha(wb, kit, "Resumo", "LEGARA | Comparativo dos cenários", "Efeito do pagamento extraordinário", ["Cenário", "Nº de parcelas", "Parcela seguinte ao extra", "Última parcela", "Total de juros", "Total pago (inclui o extra)", "Economia de juros", "Economia no total pago"],
        [["Sem pagamento extra", b.np, b.seg, b.ultima, b.tj, b.tt, 0, 0], ["Reduzindo o prazo", a.np, a.seg, a.ultima, a.tj, a.tt, b.tj - a.tj, b.tt - a.tt], ["Reduzindo a prestação", c.np, c.seg, c.ultima, c.tj, c.tt, b.tj - c.tj, b.tt - c.tt]],
        [null, "0", X.F_MONEY, X.F_MONEY, X.F_MONEY, X.F_MONEY, X.F_MONEY, X.F_MONEY], [30, 14, 20, 18, 18, 22, 18, 20]);
      [["Sem extra", "Sem pagamento extra", b], ["Reduzir prazo", "Reduzindo o prazo", a], ["Reduzir prestacao", "Reduzindo a prestação", c]].forEach(function (z) {
        var rows = z[2].rows.map(function (r) { var l = [r.k, r.data, r.ini, r.juros, r.amort, r.parcela, r.extra, r.total, r.pagExtra, r.fim]; if (r.pagExtra) l.destaque = true; return l; });
        folha(wb, kit, z[0], "LEGARA | " + z[1], "Tabela de amortização", ["Nº", "Data", "Saldo inicial", "Juros", "Amortização", "Parcela", "Seguro + tarifa", "Total a pagar", "Pagamento extra", "Saldo final"], rows, ["0", X.F_DATE, X.F_MONEY, X.F_MONEY, X.F_MONEY, X.F_MONEY, X.F_MONEY, X.F_MONEY, X.F_MONEY, X.F_MONEY], [7, 13, 17, 15, 17, 16, 16, 17, 17, 17]);
      });
      return wb;
    }
    root.addEventListener("input", function (e) { if (e.target.closest("#c-form")) atualizar(); });
    root.addEventListener("change", function (e) { if (e.target.closest("#c-form")) atualizar(); });
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cen]"); if (b) { st.cen = b.dataset.cen; if (st.res) render(); }
      if (e.target.closest("#c-baixar") && st.res) U.entregar(xlsx, "LEGARA-amortizacao-antecipada.xlsx", $("#c-baixar"), $("#c-status"));
    });
    atualizar();
  }

  /* =====================================================================
     2) Conferência da evolução do financiamento
     ===================================================================== */
  var LAYOUTS = {
    ps: { nome: "Nº, Parcela, Saldo devedor", cols: ["k", "parcela", "saldo"] },
    japs: { nome: "Nº, Juros, Amortização, Parcela, Saldo devedor", cols: ["k", "juros", "amort", "parcela", "saldo"] },
    pjas: { nome: "Nº, Parcela, Juros, Amortização, Saldo devedor", cols: ["k", "parcela", "juros", "amort", "saldo"] }
  };
  var LIMITES = [
    "O cálculo usa juros compostos sobre o saldo devedor, em períodos mensais iguais, sem pro rata por dias corridos.",
    "Não considera indexadores (como TR ou IPCA), IOF, multas, juros de mora, atrasos, renegociações, portabilidade ou amortizações extraordinárias.",
    "Instituições costumam arredondar valores a cada parcela; por isso existe uma tolerância em reais, que você pode ajustar.",
    "Uma diferença apontada aqui não comprova erro ou cobrança indevida: pode vir de cláusulas, encargos ou critérios que o simulador não reproduz.",
    "A análise de um caso concreto exige o contrato, o histórico de pagamentos e a metodologia da instituição, examinados por profissional habilitado."
  ];
  function numBR(t) {
    t = String(t).replace(/R\$|\s/g, ""); if (!t) return NaN;
    if (/^[-+]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, "").replace(",", "."); else if (t.indexOf(",") >= 0) t = t.replace(",", ".");
    return /^[-+]?\d*\.?\d+$/.test(t) ? Number(t) : NaN;
  }
  function lerTabela(txt, layout) {
    var cols = LAYOUTS[layout].cols, out = [], erros = [];
    String(txt).split(/\r?\n/).forEach(function (linha, idx) {
      if (!linha.trim()) return;
      var cel = linha.indexOf("\t") >= 0 ? linha.split("\t") : linha.indexOf(";") >= 0 ? linha.split(";") : linha.trim().split(/\s+/).filter(function (x) { return x !== "R$"; });
      cel = cel.map(function (x) { return x.trim(); }).filter(function (x, q, arr) { return !(x === "" && q === arr.length - 1); });
      if (isNaN(numBR(cel[0]))) { if (out.length === 0) return; }
      if (cel.length < cols.length) { erros.push("Linha " + (idx + 1) + ": esperadas " + cols.length + " colunas, encontradas " + cel.length + "."); return; }
      var r = {}, ok = true;
      cols.forEach(function (c, q) { var v = numBR(cel[q]); if (isNaN(v)) ok = false; r[c] = v; });
      if (!ok) { erros.push("Linha " + (idx + 1) + ": há valor que não é número."); return; }
      if (r.k !== Math.round(r.k) || r.k < 1) { erros.push("Linha " + (idx + 1) + ": o número da parcela deve ser inteiro e maior que zero."); return; }
      out.push(r);
    });
    return { linhas: out, erros: erros };
  }
  function f2(v) { return v.toFixed(2).replace(".", ","); }

  function mountConferencia(el, C, cfg) {
    root = el; var st = { res: null, soDiv: false };
    root.innerHTML = cabecalhoPagina(cfg, C) +
      '<div class="sim-grid"><form id="c-form" class="form-card" novalidate onsubmit="return false"><p class="label">Parâmetros do contrato <span class="hint">(valores de exemplo; use os do seu contrato)</span></p><div class="sim-fields">' +
      camposBase({ pv: 280000, taxa: 11.5, prazo: 180 }) +
      campo("sis", "Sistema de amortização", '<select id="c-sis"><option value="price">Price</option><option value="sac">SAC</option><option value="sam">SAM</option><option value="americano">Americano</option></select>') +
      campo("carencia", "Carência de amortização (meses)", inp("carencia", 0, ' step="1"')) +
      camposExtras() +
      campo("incl", "A parcela informada inclui seguro e tarifa?", '<select id="c-incl"><option value="nao">Não, só juros e amortização</option><option value="sim">Sim, é o valor total pago</option></select>') +
      campo("tol", "Tolerância de diferença (R$)", inp("tol", 0.05), "Diferenças até esse valor contam como compatíveis (arredondamentos).") +
      '</div></form><div class="sim-out"><div class="form-card sim-colar"><p class="label">Valores da sua planilha</p>' +
      campo("lay", "Ordem das colunas", '<select id="c-lay">' + Object.keys(LAYOUTS).map(function (k) { return '<option value="' + k + '">' + LAYOUTS[k].nome + "</option>"; }).join("") + "</select>") +
      campo("txt", "Cole aqui as linhas (copie do Excel ou de um CSV)", '<textarea id="c-txt" rows="7" spellcheck="false" placeholder="1&#9;2.611,49&#9;279.842,10"></textarea>', "Uma linha por parcela, na ordem escolhida. Aceita tabulação, ponto e vírgula ou espaços; números no padrão brasileiro (1.234,56). A linha de título é ignorada.") +
      '<div class="sim-acoes"><button class="btn btn-outline" id="c-exemplo" type="button">Carregar exemplo fictício</button><label class="btn btn-outline" for="c-arq">Abrir arquivo CSV</label><input id="c-arq" type="file" accept=".csv,.txt,text/csv,text/plain" class="sr-only"><button class="btn btn-outline" id="c-limpar" type="button">Limpar</button></div></div>' +
      '<p class="empty" id="c-vazio">Preencha os parâmetros e cole os valores da sua planilha para ver a comparação.</p><div id="c-res" hidden>' +
      '<dl class="sim-resumo" id="c-resumo"></dl><div class="sim-insight" id="c-insight"></div>' +
      '<h2>Comparação linha a linha</h2><label class="consent-inline"><input type="checkbox" id="c-so"> Mostrar só linhas com divergência</label><div class="scroll tall"><table class="tbl" id="c-tab"></table></div>' +
      '<h2>Premissas do cálculo</h2><ul class="sim-lista" id="c-prem"></ul><h2>Limitações</h2><ul class="sim-lista">' + LIMITES.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>" +
      '<div class="sim-dl"><button class="btn btn-primary" id="c-baixar" type="button">Baixar planilha Excel <span class="arrow" aria-hidden="true">→</span></button><div class="status" id="c-status" role="status" aria-live="polite" hidden></div></div>' +
      '<aside class="sim-promo"><div><p class="eyebrow">Análise técnica</p><p>Diferenças encontradas precisam ser examinadas com o contrato e o histórico de pagamentos. A LEGARA pode ajudar a compreender a origem de cada uma.</p></div><a class="btn btn-primary" href="#contato">Solicitar atendimento <span class="arrow" aria-hidden="true">→</span></a></aside>' +
      '<p class="note">' + esc(C.simulador.aviso) + "</p></div></div></div>";

    var METS = { parcela: "Parcela", saldo: "Saldo devedor", juros: "Juros", amort: "Amortização" };
    function atualizar() {
      var e = {}, p = lerBase(e, true), tol = num("tol");
      if (!(tol >= 0)) e.tol = "Informe zero ou um valor positivo.";
      var temP = mostrarErros(e, ["pv", "taxa", "prazo", "carencia", "seguro", "tarifa", "data", "tol"]);
      var txt = $("#c-txt").value, msg = $("#c-e-txt"); msg.textContent = ""; $("#c-txt").closest(".field").dataset.invalid = "false";
      if (temP || !txt.trim()) { $("#c-res").hidden = true; $("#c-vazio").hidden = false; st.res = null; return; }
      var lay = $("#c-lay").value, T = lerTabela(txt, lay);
      if (T.erros.length || !T.linhas.length) { msg.textContent = T.erros.length ? T.erros.slice(0, 3).join(" ") + (T.erros.length > 3 ? " (e mais " + (T.erros.length - 3) + ")" : "") : "Nenhuma linha numérica encontrada."; $("#c-txt").closest(".field").dataset.invalid = "true"; $("#c-res").hidden = true; $("#c-vazio").hidden = false; st.res = null; return; }
      var sis = $("#c-sis").value, incl = $("#c-incl").value === "sim", R = LS.calc(p), S = R.sist[sis], cols = LAYOUTS[lay].cols.slice(1);
      var linhas = T.linhas.map(function (inf) {
        var ex = inf.k <= R.n ? S.rows[inf.k - 1] : null, o = { k: inf.k, fora: !ex, mets: {}, div: false };
        cols.forEach(function (c) { var esp = ex ? (c === "parcela" ? (incl ? ex.total : ex.parcela) : c === "saldo" ? ex.fim : c === "juros" ? ex.juros : ex.amort) : NaN; var d = inf[c] - esp; o.mets[c] = { inf: inf[c], esp: esp, dif: d }; if (ex && Math.abs(d) > tol + 1e-9) o.div = true; });
        if (!ex) o.div = true; return o;
      });
      st.res = { p: p, R: R, sis: sis, incl: incl, tol: tol, cols: cols, linhas: linhas, lay: lay }; render();
    }
    function render() {
      var A = st.res, L = A.linhas, div = L.filter(function (l) { return l.div; }), maxd = 0, sd = 0;
      L.forEach(function (l) { A.cols.forEach(function (c) { var d = l.mets[c].dif; if (isFinite(d) && Math.abs(d) > maxd) maxd = Math.abs(d); }); if (isFinite(l.mets.parcela.dif)) sd += l.mets.parcela.dif; });
      var ult = L[L.length - 1], dsd = ult.mets.saldo.dif;
      $("#c-res").hidden = false; $("#c-vazio").hidden = true;
      $("#c-resumo").innerHTML = [["Linhas comparadas", String(L.length)], ["Linhas com divergência", div.length + " de " + L.length], ["Maior diferença encontrada", brl.format(maxd)], ["Diferença do saldo na parcela " + ult.k, isFinite(dsd) ? sgn(dsd) : "fora do prazo"]]
        .map(function (x) { return "<div><dt>" + x[0] + "</dt><dd>" + x[1] + "</dd></div>"; }).join("");
      var it = [];
      it.push(div.length ? "A primeira divergência acima da tolerância ocorre na parcela nº " + div[0].k + "." : "Todas as linhas ficaram dentro da tolerância de " + brl.format(A.tol) + " para os parâmetros informados.");
      if (div.length) it.push("A soma das diferenças de parcela (informado menos esperado) nas linhas comparadas é " + sgn(sd) + ".");
      if (L.some(function (l) { return l.fora; })) it.push("Há linhas com número de parcela maior que o prazo informado; elas não têm valor esperado.");
      it.push("Diferença não é prova de irregularidade. Veja as premissas e as limitações abaixo.");
      $("#c-insight").innerHTML = "<ul>" + it.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>";
      var head = ["Nº"]; A.cols.forEach(function (c) { head.push(METS[c] + " informado", METS[c] + " esperado", "Diferença"); }); head.push("Situação");
      var lista = st.soDiv ? div : L;
      $("#c-tab").innerHTML = tabela(head, lista.map(function (l) {
        var h = "<tr" + (l.div ? ' class="hl"' : "") + "><td>" + l.k + "</td>";
        A.cols.forEach(function (c) { var m = l.mets[c]; h += "<td>" + brl.format(m.inf) + "</td><td>" + (isFinite(m.esp) ? brl.format(m.esp) : "—") + "</td><td>" + (isFinite(m.dif) ? sgn(m.dif) : "—") + "</td>"; });
        return h + '<td><span class="pill ' + (l.div ? "div" : "ok") + '">' + (l.fora ? "Fora do prazo" : l.div ? "Divergente" : "Compatível") + "</span></td></tr>";
      }).join("") || '<tr><td colspan="' + head.length + '">Nenhuma linha divergente.</td></tr>');
      $("#c-prem").innerHTML = premissas(A).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
    }
    function premissas(A) {
      var R = A.R, p = A.p;
      return ["Sistema de amortização: " + NOME_SIS[A.sis] + ".", "Valor financiado: " + brl.format(R.PV) + ". Prazo: " + R.n + " meses" + (R.c ? " (" + R.c + " de carência)" : "") + ".",
        "Taxa informada: " + String(p.taxa).replace(".", ",") + "% " + (p.per === "anual" ? "ao ano, convertida para a taxa mensal efetiva equivalente de " + pct(R.i, 6) + "." : "ao mês."),
        "Seguro e tarifa: " + brl.format(R.extra) + " por mês. A parcela informada " + (A.incl ? "inclui" : "não inclui") + " esses valores.", "Primeira parcela em " + dt(p.data) + ". Valores esperados calculados sem arredondamento por parcela.", "Tolerância adotada: " + brl.format(A.tol) + "."];
    }
    function xlsx(logo) {
      var A = st.res, R = A.R, wb = new window.ExcelJS.Workbook(); wb.creator = "LEGARA"; wb.created = new Date(); wb.title = "LEGARA | Conferência da evolução do financiamento";
      var kit = U.criarKit(wb, logo);
      folhaPremissas(wb, kit, "LEGARA | Conferência do financiamento", [
        ["Sistema de amortização", NOME_SIS[A.sis]], ["Valor financiado", R.PV, X.F_MONEY], ["Taxa mensal efetiva", R.i, X.F_PCT], ["Prazo (meses)", R.n, "0"], ["Carência (meses)", R.c, "0"],
        ["Seguro + tarifa por mês", R.extra, X.F_MONEY], ["Parcela informada inclui seguro e tarifa?", A.incl ? "Sim" : "Não"], ["Data da 1ª parcela", A.p.data, X.F_DATE], ["Tolerância (R$)", A.tol, X.F_MONEY]],
        "Limitações do cálculo", LIMITES);
      var head = ["Nº"], fm = ["0"], w = [7]; A.cols.forEach(function (c) { head.push(METS[c] + " informado", METS[c] + " esperado", "Diferença"); fm.push(X.F_MONEY, X.F_MONEY, X.F_MONEY); w.push(18, 18, 14); }); head.push("Situação"); fm.push(null); w.push(16);
      var rows = A.linhas.map(function (l) { var r = [l.k]; A.cols.forEach(function (c) { var m = l.mets[c]; r.push(m.inf, isFinite(m.esp) ? m.esp : null, isFinite(m.dif) ? m.dif : null); }); r.push(l.fora ? "Fora do prazo" : l.div ? "Divergente" : "Compatível"); if (l.div) r.destaque = true; return r; });
      folha(wb, kit, "Conferência", "LEGARA | Conferência linha a linha", "Informado na planilha x esperado pelos parâmetros do contrato", head, rows, fm, w);
      return wb;
    }
    function exemplo() {
      var e = {}, p = lerBase(e, true); if (Object.keys(e).length) return;
      var R = LS.calc(p), S = R.sist[$("#c-sis").value], incl = $("#c-incl").value === "sim", n = Math.min(24, R.n), out = [], lay = $("#c-lay").value;
      for (var q = 0; q < n; q++) { var r = S.rows[q], drift = q >= 12 ? 3.5 : 0, par = (incl ? r.total : r.parcela) + drift, sal = r.fim + (q >= 12 ? 3.5 * (q - 11) : 0);
        var campos = { k: String(r.k), parcela: f2(par), saldo: f2(sal), juros: f2(r.juros), amort: f2(r.amort) }; out.push(LAYOUTS[lay].cols.map(function (c) { return campos[c]; }).join("\t")); }
      $("#c-txt").value = out.join("\n"); atualizar();
    }
    root.addEventListener("input", function (e) { if (e.target.closest("#c-form") || e.target.id === "c-txt" || e.target.id === "c-lay") atualizar(); });
    root.addEventListener("change", function (e) {
      if (e.target.closest("#c-form") || e.target.id === "c-lay") atualizar();
      if (e.target.id === "c-so") { st.soDiv = e.target.checked; if (st.res) render(); }
      if (e.target.id === "c-arq" && e.target.files[0]) { var fr = new FileReader(); fr.onload = function () { $("#c-txt").value = String(fr.result); atualizar(); }; fr.readAsText(e.target.files[0]); }
    });
    root.addEventListener("click", function (e) {
      if (e.target.closest("#c-exemplo")) exemplo();
      if (e.target.closest("#c-limpar")) { $("#c-txt").value = ""; atualizar(); }
      if (e.target.closest("#c-baixar") && st.res) U.entregar(xlsx, "LEGARA-conferencia-financiamento.xlsx", $("#c-baixar"), $("#c-status"));
    });
    atualizar();
  }

  window.LegaraCalc = { mountAntecipacao: mountAntecipacao, mountConferencia: mountConferencia, antecipar: antecipar, lerTabela: lerTabela, numBR: numBR };
})();
