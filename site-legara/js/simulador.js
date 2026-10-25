/* Simulador de sistemas de amortização da LEGARA: Price, SAC, SAM e Americano.
   Cálculo em JavaScript puro; a planilha Excel usa ExcelJS (carregado do cdnjs apenas ao clicar em "Baixar"). */
(function () {
  "use strict";
  var NOMES = { price: "Price", sac: "SAC", sam: "SAM", americano: "Americano" };
  var ORDEM = ["price", "sac", "sam", "americano"];
  var DESCR = {
    price: "Parcelas iguais. Os juros diminuem e a amortização cresce ao longo do prazo.",
    sac: "Amortização constante. A parcela começa maior e diminui a cada mês.",
    sam: "Sistema de Amortização Misto: média aritmética das parcelas Price e SAC.",
    americano: "Só juros durante o prazo; o principal é pago de uma vez na última parcela."
  };

  /* ---------- Cálculo ---------- */
  function addMonths(d, m) {
    var x = new Date(d.getFullYear(), d.getMonth() + m, 1), dia = d.getDate();
    var ult = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
    x.setDate(Math.min(dia, ult)); return x;
  }
  function calc(p) {
    var PV = p.bem - p.entrada;
    var i = p.per === "anual" ? Math.pow(1 + p.taxa / 100, 1 / 12) - 1 : p.taxa / 100;
    var n = p.unid === "anos" ? p.prazo * 12 : p.prazo, c = p.carencia, m = n - c;
    var extra = p.seguro + p.tarifa;
    var pmt = i === 0 ? PV / m : PV * i / (1 - Math.pow(1 + i, -m));
    var am = { price: [], sac: [], sam: [], americano: [] }, sp = PV, k;
    for (k = 1; k <= n; k++) {
      var j = sp * i, a = k <= c ? 0 : pmt - j; sp -= a;
      am.price.push(a);
      am.sac.push(k <= c ? 0 : PV / m);
      am.americano.push(k === n ? PV : 0);
    }
    for (k = 0; k < n; k++) am.sam.push((am.price[k] + am.sac[k]) / 2);
    var out = { PV: PV, i: i, n: n, c: c, extra: extra, pmtPrice: pmt, sist: {} };
    ORDEM.forEach(function (s) {
      var rows = [], saldo = PV, tj = 0, ta = 0, tp = 0, tt = 0;
      for (var q = 0; q < n; q++) {
        var juros = saldo * i, amort = am[s][q], parcela = juros + amort, total = parcela + extra;
        var fim = saldo - amort;
        rows.push({ k: q + 1, data: addMonths(p.data, q), ini: saldo, juros: juros, amort: amort, parcela: parcela, extra: extra, total: total, fim: fim });
        saldo = fim; tj += juros; ta += amort; tp += parcela; tt += total;
      }
      out.sist[s] = { rows: rows, tj: tj, ta: ta, tp: tp, tt: tt, cetM: tir(PV, rows) };
      out.sist[s].cetA = Math.pow(1 + out.sist[s].cetM, 12) - 1;
    });
    return out;
  }
  /* Custo efetivo aproximado: taxa mensal que iguala o valor liberado ao valor presente dos pagamentos (TIR). */
  function tir(PV, rows) {
    function vp(r) { var s = -PV; for (var q = 0; q < rows.length; q++) s += rows[q].total / Math.pow(1 + r, q + 1); return s; }
    var lo = -0.99, hi = 5, mid;
    if (vp(lo) < 0 || vp(hi) > 0) return NaN;
    for (var t = 0; t < 200; t++) { mid = (lo + hi) / 2; if (vp(mid) > 0) lo = mid; else hi = mid; }
    return mid;
  }

  /* ---------- Formatação ---------- */
  var brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  var brlCurto = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
  function pct(v, d) { return isFinite(v) ? (v * 100).toLocaleString("pt-BR", { minimumFractionDigits: d || 4, maximumFractionDigits: d || 4 }) + "%" : "n/d"; }
  function dt(d) { return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear(); }
  function zero(v) { return Math.abs(v) < 1e-6 ? 0 : v; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function isoHoje() { var d = addMonths(new Date(), 1); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }

  /* ---------- Interface ---------- */
  var root, state = { sistema: "price", res: null, params: null, ordem: ORDEM, cfg: null };
  function $(s) { return root.querySelector(s); }

  function lerParametros() {
    var v = function (id) { return $("#sim-" + id).value; };
    var num = function (id) { var s = String(v(id)).replace(",", "."); return s === "" ? NaN : Number(s); };
    var p = { bem: num("bem"), entrada: num("entrada"), taxa: num("taxa"), per: v("per"), prazo: num("prazo"), unid: v("unid"), carencia: num("carencia"), seguro: num("seguro"), tarifa: num("tarifa"), data: null };
    var e = {};
    if (!(p.bem > 0)) e.bem = "Informe um valor maior que zero.";
    if (!(p.entrada >= 0)) e.entrada = "Informe zero ou um valor positivo.";
    else if (p.entrada >= p.bem) e.entrada = "A entrada deve ser menor que o valor do bem.";
    if (!(p.taxa >= 0)) e.taxa = "Informe uma taxa de zero ou mais.";
    else if (p.taxa > 1000) e.taxa = "Taxa fora de uma faixa plausível.";
    var meses = p.unid === "anos" ? p.prazo * 12 : p.prazo;
    if (!(p.prazo > 0) || meses > 600 || meses !== Math.round(meses)) e.prazo = "Informe um prazo inteiro de 1 a 600 meses (ou até 50 anos).";
    if (!(p.carencia >= 0) || p.carencia !== Math.round(p.carencia)) e.carencia = "Informe um número inteiro de meses, de zero em diante.";
    else if (!e.prazo && p.carencia >= meses) e.carencia = "A carência deve ser menor que o prazo.";
    if (!(p.seguro >= 0)) e.seguro = "Informe zero ou um valor positivo.";
    if (!(p.tarifa >= 0)) e.tarifa = "Informe zero ou um valor positivo.";
    var ds = v("data").split("-");
    if (ds.length === 3 && Number(ds[0]) > 1900) p.data = new Date(Number(ds[0]), Number(ds[1]) - 1, Number(ds[2])); else e.data = "Informe a data da primeira parcela.";
    return { p: p, e: e };
  }

  function atualizar() {
    var r = lerParametros(), ids = ["bem", "entrada", "taxa", "prazo", "carencia", "seguro", "tarifa", "data"], tem = false;
    ids.forEach(function (id) {
      var msg = r.e[id] || ""; $("#sim-e-" + id).textContent = msg; $("#sim-" + id).closest(".field").dataset.invalid = msg ? "true" : "false"; if (msg) tem = true;
    });
    $("#sim-resultado").hidden = tem; $("#sim-vazio").hidden = !tem;
    if (tem) { state.res = null; return; }
    state.params = r.p; state.res = calc(r.p);
    renderResultado();
  }

  function renderResultado() {
    var R = state.res, P = state.params;
    $("#sim-resumo").innerHTML = [
      ["Valor financiado", brl.format(R.PV)],
      ["Taxa mensal efetiva", pct(R.i)],
      ["Prazo", R.n + " meses" + (R.c ? " (" + R.c + " de carência)" : "")],
      ["Seguro + tarifa por mês", brl.format(R.extra)]
    ].map(function (x) { return '<div><dt>' + x[0] + "</dt><dd>" + x[1] + "</dd></div>"; }).join("");

    $("#sim-comp").innerHTML = "<thead><tr><th scope=\"col\">Sistema</th><th scope=\"col\">1ª parcela</th><th scope=\"col\">Última parcela</th><th scope=\"col\">Total de juros</th><th scope=\"col\">Total pago</th><th scope=\"col\">Custo efetivo (mês / ano)</th></tr></thead><tbody>" +
      state.ordem.map(function (s) {
        var S = R.sist[s], r1 = S.rows[0], rn = S.rows[S.rows.length - 1];
        return '<tr><th scope="row"><span class="sw sw-' + s + '"></span>' + NOMES[s] + "</th><td>" + brl.format(r1.total) + "</td><td>" + brl.format(rn.total) + "</td><td>" + brl.format(S.tj) + "</td><td>" + brl.format(S.tt) + "</td><td>" + pct(S.cetM, 4) + " / " + pct(S.cetA, 2) + "</td></tr>";
      }).join("") + "</tbody>";

    $("#sim-tabs").innerHTML = state.ordem.map(function (s) { return '<button class="chip" type="button" data-sis="' + s + '" aria-pressed="' + (state.sistema === s) + '">' + NOMES[s] + "</button>"; }).join("");
    $("#sim-descr").textContent = DESCR[state.sistema] + (state.sistema === "americano" && R.c ? " A carência informada não se aplica a este sistema." : "");
    var S = R.sist[state.sistema];
    $("#sim-tabela").innerHTML = "<thead><tr><th scope=\"col\">Nº</th><th scope=\"col\">Data</th><th scope=\"col\">Saldo inicial</th><th scope=\"col\">Juros</th><th scope=\"col\">Amortização</th><th scope=\"col\">Parcela</th><th scope=\"col\">Seguro + tarifa</th><th scope=\"col\">Total a pagar</th><th scope=\"col\">Saldo final</th></tr></thead><tbody>" +
      S.rows.map(function (x) { return "<tr><td>" + x.k + "</td><td>" + dt(x.data) + "</td><td>" + brl.format(zero(x.ini)) + "</td><td>" + brl.format(x.juros) + "</td><td>" + brl.format(x.amort) + "</td><td>" + brl.format(x.parcela) + "</td><td>" + brl.format(x.extra) + "</td><td>" + brl.format(x.total) + "</td><td>" + brl.format(zero(x.fim)) + "</td></tr>"; }).join("") +
      '</tbody><tfoot><tr><th scope="row" colspan="3">Total</th><td>' + brl.format(S.tj) + "</td><td>" + brl.format(S.ta) + "</td><td>" + brl.format(S.tp) + "</td><td>" + brl.format(R.extra * R.n) + "</td><td>" + brl.format(S.tt) + "</td><td></td></tr></tfoot>";
    desenharGraficos();
    if (state.cfg.insight) $("#sim-insight").innerHTML = insight(R);
  }

  /* Gráfico de linhas genérico. series: [{cls, pts:[[x,y],...]}] */
  function grafico(dest, series, xMax, yMax, aria) {
    var W = 760, H = 300, L = 72, Rr = 16, T = 16, B = 40;
    if (!(yMax > 0)) yMax = 1;
    var x = function (k) { return L + (W - L - Rr) * k / xMax; }, y = function (v) { return T + (H - T - B) * (1 - v / yMax); };
    var g = "";
    for (var t = 0; t <= 4; t++) { var v = yMax * t / 4; g += '<line x1="' + L + '" x2="' + (W - Rr) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="gl"/><text x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end" class="gt">' + esc(brlCurto.format(v)) + "</text>"; }
    for (var u = 0; u <= 5; u++) { var kk = Math.round(xMax * u / 5); g += '<text x="' + x(kk) + '" y="' + (H - 16) + '" text-anchor="middle" class="gt">' + kk + "</text>"; }
    g += '<text x="' + ((L + W - Rr) / 2) + '" y="' + (H - 2) + '" text-anchor="middle" class="gt">mês</text>';
    series.forEach(function (sr) { g += '<polyline points="' + sr.pts.map(function (p) { return x(p[0]) + "," + y(p[1]); }).join(" ") + '" class="ln ln-' + sr.cls + '"/>'; });
    dest.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(aria) + '">' + g + "</svg>";
  }
  function desenharGraficos() {
    var R = state.res, ord = state.ordem;
    grafico($("#sim-grafico"), ord.map(function (s) { return { cls: s, pts: [[0, R.PV]].concat(R.sist[s].rows.map(function (r) { return [r.k, Math.max(0, r.fim)]; })) }; }), R.n, R.PV, "Saldo devedor ao longo do prazo");
    var box = $("#sim-bloco2");
    if (box) {
      var sem = ord.indexOf("americano") < 0; box.hidden = !sem;
      if (sem) { var mx = 0; ord.forEach(function (s) { R.sist[s].rows.forEach(function (r) { if (r.total > mx) mx = r.total; }); });
        grafico($("#sim-grafico2"), ord.map(function (s) { return { cls: s, pts: R.sist[s].rows.map(function (r) { return [r.k, r.total]; }) }; }), R.n, mx * 1.05, "Parcela total ao longo do prazo"); }
    }
  }
  /* Leitura comparativa SAC x Price, feita só com os números calculados. */
  function insight(R) {
    var P = R.sist.price, S = R.sist.sac, itens = [];
    var dj = P.tj - S.tj;
    itens.push("Na 1ª parcela, o SAC é " + brl.format(Math.abs(S.rows[0].total - P.rows[0].total)) + (S.rows[0].total >= P.rows[0].total ? " maior" : " menor") + " que o Price (" + brl.format(S.rows[0].total) + " contra " + brl.format(P.rows[0].total) + ").");
    var cruz = null; for (var q = 0; q < R.n; q++) if (S.rows[q].total < P.rows[q].total - 1e-9) { cruz = q; break; }
    itens.push(cruz === null ? "Neste cenário, a parcela do SAC não chega a ficar abaixo da do Price." : "A parcela do SAC passa a ser menor que a do Price a partir da parcela nº " + S.rows[cruz].k + " (" + dt(S.rows[cruz].data) + ").");
    itens.push("O total de juros do " + (dj >= 0 ? "Price" : "SAC") + " é " + brl.format(Math.abs(dj)) + " maior que o do " + (dj >= 0 ? "SAC" : "Price") + " (Price " + brl.format(P.tj) + "; SAC " + brl.format(S.tj) + ").");
    itens.push("A amortização do Price na 1ª parcela é " + brl.format(P.rows[0].amort) + "; no SAC é " + brl.format(S.rows[0].amort) + " em todas as parcelas.");
    return "<ul>" + itens.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>";
  }

  /* ---------- Planilha Excel ---------- */
  function carregarExcelJS() {
    return new Promise(function (ok, falha) {
      if (window.ExcelJS) return ok();
      var s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";
      s.onload = function () { window.ExcelJS ? ok() : falha(new Error("ExcelJS indisponível")); };
      s.onerror = function () { falha(new Error("Não foi possível carregar a biblioteca de planilhas.")); };
      document.head.appendChild(s);
    });
  }
  function logoBase64() {
    return new Promise(function (ok) {
      var src = window.LEGARA_LOGO_SRC; if (!src) return ok(null);
      var img = new Image();
      img.onload = function () { try { var c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext("2d").drawImage(img, 0, 0); ok(c.toDataURL("image/png")); } catch (e) { ok(null); } };
      img.onerror = function () { ok(null); }; img.src = src;
    });
  }

  var NAVY = "FF0B1A33", GOLD = "FFB08D4C", GOLD_L = "FFD9BA7E", IVORY = "FFFBFAF7", GRAY = "FFF3F1EC", INK = "FF0E1B33";
  var F_MONEY = '"R$" #,##0.00', F_PCT = "0.0000%", F_DATE = "dd/mm/yyyy";
  var AVISO = [
    "Simulação gerada por inteligência artificial, de caráter informativo e educativo.",
    "Os resultados dependem das premissas informadas e não incluem todos os encargos, indexadores (como TR ou IPCA), tributos (como IOF) e condições contratuais de cada operação.",
    "O custo efetivo aqui calculado é a taxa interna de retorno do fluxo informado e não substitui o CET oficial da instituição financeira.",
    "Este material não é laudo, perícia, parecer nem proposta de crédito. Em caso de dúvidas ou para maiores informações, entre em contato com a LEGARA."
  ];

  function criarKit(wb, logo) {
    var imgId = logo ? wb.addImage({ base64: logo, extension: "png" }) : null;
    var fill = function (c) { return { type: "pattern", pattern: "solid", fgColor: { argb: c } }; };
    var thin = { style: "thin", color: { argb: "FFDCD8CD" } }, borda = { top: thin, left: thin, bottom: thin, right: thin };
    function cabecalho(ws, titulo, sub, ate) {
      for (var r = 1; r <= 3; r++) { ws.getRow(r).height = 26; for (var c = 1; c <= ate; c++) ws.getRow(r).getCell(c).fill = fill(NAVY); }
      if (imgId !== null) ws.addImage(imgId, { tl: { col: 0.15, row: 0.1 }, ext: { width: 124, height: 75 } });
      ws.mergeCells(1, 3, 1, ate); ws.mergeCells(2, 3, 2, ate);
      var a = ws.getCell(1, 3); a.value = titulo; a.font = { name: "Georgia", size: 20, color: { argb: GOLD_L } }; a.alignment = { vertical: "middle" };
      var b = ws.getCell(2, 3); b.value = sub; b.font = { name: "Calibri", size: 11, color: { argb: "FFD8DEEA" } }; b.alignment = { vertical: "middle" };
      ws.getRow(4).height = 8;
    }
    function rodape(ws, linha, ate) {
      ws.mergeCells(linha, 1, linha, ate);
      var c = ws.getCell(linha, 1); c.value = AVISO[0] + " Em caso de dúvidas, entre em contato com a LEGARA."; c.font = { name: "Calibri", size: 9, italic: true, color: { argb: "FF4B556B" } }; c.alignment = { wrapText: true, vertical: "top" }; ws.getRow(linha).height = 28;
    }
    return { fill: fill, borda: borda, cabecalho: cabecalho, rodape: rodape };
  }

  function construirXlsx(P, R, logo, opts) {
    var wb = new window.ExcelJS.Workbook();
    wb.creator = "LEGARA"; wb.created = new Date(); wb.title = "LEGARA | Simulação de amortização";
    var n = R.n, OP = opts || {}, SIS = OP.sistemas || ORDEM, TIT = OP.titulo || "Simulação de amortização";
    var kit = criarKit(wb, logo), fill = kit.fill, borda = kit.borda, cabecalho = kit.cabecalho, rodape = kit.rodape;

    /* Premissas */
    var wp = wb.addWorksheet("Premissas", { properties: { tabColor: { argb: GOLD } }, views: [{ showGridLines: false }], pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
    wp.columns = [{ width: 3 }, { width: 38 }, { width: 22 }, { width: 62 }, { width: 4 }];
    cabecalho(wp, "LEGARA | " + TIT, "Perícia Patrimonial e Societária", 4);
    wp.mergeCells("B5:D5"); var t5 = wp.getCell("B5"); t5.value = "Premissas da simulação"; t5.font = { name: "Georgia", size: 15, color: { argb: INK } };
    var linhas = [
      ["Valor do bem", P.bem, F_MONEY, true, "Editável."],
      ["Entrada", P.entrada, F_MONEY, true, "Editável."],
      ["Valor financiado", { formula: "C6-C7", result: R.PV }, F_MONEY, false, "Calculado: valor do bem menos entrada."],
      ["Taxa de juros informada", P.per === "anual" ? P.taxa / 100 : P.taxa / 100, F_PCT, true, "Editável. Informe no período escolhido abaixo."],
      ["Período da taxa", P.per, null, true, "Editável: mensal ou anual."],
      ["Taxa mensal efetiva", { formula: 'IF(C10="anual",(1+C9)^(1/12)-1,C9)', result: R.i }, F_PCT, false, "Calculado. Taxa anual convertida pela equivalência composta."],
      ["Prazo (meses)", n, "0", false, "Definido na simulação. Para mudar o prazo, gere a planilha novamente no site."],
      ["Carência de amortização (meses)", R.c, "0", false, "Definido na simulação. Durante a carência, só os juros são pagos (não se aplica ao Americano)."],
      ["Seguro mensal (R$)", P.seguro, F_MONEY, true, "Editável. Valor fixo somado a cada parcela."],
      ["Tarifa mensal (R$)", P.tarifa, F_MONEY, true, "Editável. Valor fixo somado a cada parcela."],
      ["Data da 1ª parcela", P.data, F_DATE, false, "Definida na simulação."]
    ];
    linhas.forEach(function (l, q) {
      var r = 6 + q, a = wp.getCell(r, 2), b = wp.getCell(r, 3), d = wp.getCell(r, 4);
      a.value = l[0]; a.font = { name: "Calibri", size: 11, bold: true, color: { argb: INK } }; a.border = borda; a.fill = fill(IVORY);
      b.value = l[1]; if (l[2]) b.numFmt = l[2]; b.border = borda; b.alignment = { horizontal: "right" };
      b.font = { name: "Calibri", size: 11, color: { argb: l[3] ? "FF1B3F8F" : INK }, bold: !!l[3] }; b.fill = fill(l[3] ? "FFFFFFFF" : GRAY);
      d.value = l[4]; d.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF4B556B" } }; d.alignment = { wrapText: true, vertical: "middle" };
    });
    wp.getCell("C10").dataValidation = { type: "list", allowBlank: false, formulae: ['"mensal,anual"'] };
    wp.mergeCells("B19:D19"); var ta = wp.getCell("B19"); ta.value = "Aviso importante"; ta.font = { name: "Georgia", size: 14, color: { argb: INK } };
    AVISO.forEach(function (t, q) { var r = 20 + q; wp.mergeCells(r, 2, r, 4); var c = wp.getCell(r, 2); c.value = t; c.alignment = { wrapText: true, vertical: "top" }; c.font = { name: "Calibri", size: 10.5, color: { argb: INK } }; wp.getRow(r).height = 32; });
    wp.mergeCells("B25:D25"); var lg = wp.getCell("B25"); lg.value = "Células com fonte azul e fundo branco são editáveis; as demais são calculadas ou definidas na simulação."; lg.font = { name: "Calibri", size: 9.5, italic: true, color: { argb: "FF4B556B" } };

    var PV = "Premissas!$C$8", I = "Premissas!$C$11", N = "Premissas!$C$12", CC = "Premissas!$C$13", SEG = "Premissas!$C$14", TAR = "Premissas!$C$15", DT = "Premissas!$C$16";
    var colunas = ["Nº", "Data", "Saldo inicial", "Juros", "Amortização", "Parcela", "Seguro + tarifa", "Total a pagar", "Saldo final", "", "Fluxo (para custo efetivo)"];
    var abas = { price: "Price", sac: "SAC", sam: "SAM", americano: "Americano" };
    var primeira = 7, ultima = n + 6, tot = n + 7;

    SIS.forEach(function (s) {
      var ws = wb.addWorksheet(abas[s], { properties: { tabColor: { argb: s === "price" ? GOLD : NAVY } }, views: [{ showGridLines: false, state: "frozen", ySplit: 5 }], pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
      ws.columns = [{ width: 7 }, { width: 13 }, { width: 17 }, { width: 15 }, { width: 17 }, { width: 16 }, { width: 16 }, { width: 17 }, { width: 17 }, { width: 3 }, { width: 22 }];
      cabecalho(ws, "Sistema " + NOMES[s], DESCR[s], 11);
      var h = ws.getRow(5); h.height = 30;
      colunas.forEach(function (t, q) { var c = h.getCell(q + 1); if (!t) return; c.value = t; c.font = { name: "Calibri", size: 11, bold: true, color: { argb: GOLD_L } }; c.fill = fill(NAVY); c.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; });
      var S = R.sist[s];
      /* linha 6: liberação do crédito (k = 0) */
      ws.getCell("A6").value = 0; ws.getCell("I6").value = { formula: PV, result: R.PV }; ws.getCell("K6").value = { formula: PV, result: R.PV };
      S.rows.forEach(function (x, q) {
        var r = primeira + q, prev = r - 1;
        ws.getCell("A" + r).value = x.k;
        ws.getCell("B" + r).value = { formula: "EDATE(" + DT + ",A" + r + "-1)", result: x.data };
        ws.getCell("C" + r).value = { formula: "I" + prev, result: x.ini };
        ws.getCell("D" + r).value = { formula: "C" + r + "*" + I, result: x.juros };
        var fe;
        if (s === "price") fe = "IF(A" + r + "<=" + CC + ",0,-PMT(" + I + "," + N + "-" + CC + "," + PV + ")-D" + r + ")";
        else if (s === "sac") fe = "IF(A" + r + "<=" + CC + ",0," + PV + "/(" + N + "-" + CC + "))";
        else if (s === "sam") fe = "(Price!E" + r + "+SAC!E" + r + ")/2";
        else fe = "IF(A" + r + "=" + N + "," + PV + ",0)";
        ws.getCell("E" + r).value = { formula: fe, result: x.amort };
        ws.getCell("F" + r).value = { formula: "D" + r + "+E" + r, result: x.parcela };
        ws.getCell("G" + r).value = { formula: SEG + "+" + TAR, result: x.extra };
        ws.getCell("H" + r).value = { formula: "F" + r + "+G" + r, result: x.total };
        ws.getCell("I" + r).value = { formula: "C" + r + "-E" + r, result: x.fim };
        ws.getCell("K" + r).value = { formula: "-H" + r, result: -x.total };
      });
      for (var r = 6; r <= ultima; r++) {
        var zebra = r % 2 === 0 ? IVORY : "FFFFFFFF";
        for (var c = 1; c <= 11; c++) {
          if (c === 10) continue; var cell = ws.getCell(r, c); cell.border = borda; cell.fill = fill(zebra); cell.font = { name: "Calibri", size: 10.5, color: { argb: INK } };
          cell.numFmt = c === 1 ? "0" : c === 2 ? F_DATE : F_MONEY; if (c === 1 || c === 2) cell.alignment = { horizontal: "center" };
        }
      }
      var T = ws.getRow(tot);
      T.getCell(1).value = "Total"; ws.mergeCells(tot, 1, tot, 3);
      [["D", S.tj], ["E", S.ta], ["F", S.tp], ["G", R.extra * n], ["H", S.tt]].forEach(function (z) { ws.getCell(z[0] + tot).value = { formula: "SUM(" + z[0] + primeira + ":" + z[0] + ultima + ")", result: z[1] }; });
      for (var c2 = 1; c2 <= 9; c2++) { var tc = T.getCell(c2); tc.fill = fill(NAVY); tc.font = { name: "Calibri", size: 11, bold: true, color: { argb: GOLD_L } }; if (c2 >= 4) tc.numFmt = F_MONEY; }
      rodape(ws, tot + 2, 11);
    });

    /* Comparativo */
    var wc = wb.addWorksheet("Comparativo", { properties: { tabColor: { argb: GOLD_L } }, views: [{ showGridLines: false }], pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
    wc.columns = [{ width: 3 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 20 }, { width: 20 }];
    cabecalho(wc, "LEGARA | Comparativo dos sistemas", "Resultados calculados a partir das premissas", 8);
    var hc = ["Sistema", "1ª parcela (total)", "Última parcela (total)", "Total de juros", "Total pago", "Custo efetivo mensal", "Custo efetivo anual"];
    hc.forEach(function (t, q) { var c = wc.getCell(6, q + 2); c.value = t; c.font = { name: "Calibri", size: 11, bold: true, color: { argb: GOLD_L } }; c.fill = fill(NAVY); c.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; });
    wc.getRow(6).height = 32;
    SIS.forEach(function (s, q) {
      var r = 7 + q, a = abas[s], S = R.sist[s], rn = S.rows[n - 1];
      var vals = [NOMES[s], { formula: a + "!H" + primeira, result: S.rows[0].total }, { formula: a + "!H" + ultima, result: rn.total }, { formula: a + "!D" + tot, result: S.tj }, { formula: a + "!H" + tot, result: S.tt }, { formula: "IRR(" + a + "!K6:K" + ultima + ",0.01)", result: S.cetM }, { formula: "(1+G" + r + ")^12-1", result: S.cetA }];
      vals.forEach(function (v, z) { var c = wc.getCell(r, z + 2); c.value = v; c.border = borda; c.fill = fill(q % 2 ? IVORY : "FFFFFFFF"); c.font = { name: "Calibri", size: 11, bold: z === 0, color: { argb: INK } }; c.numFmt = z === 0 ? "@" : z >= 5 ? "0.0000%" : F_MONEY; if (z === 0) c.alignment = { horizontal: "left" }; });
    });
    wc.mergeCells("B12:H12"); wc.getCell("B12").value = "O custo efetivo é a taxa interna de retorno do fluxo (valor liberado e pagamentos, incluindo seguro e tarifa). Não substitui o CET oficial da instituição financeira.";
    wc.getCell("B12").font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF4B556B" } }; wc.getCell("B12").alignment = { wrapText: true, vertical: "top" }; wc.getRow(12).height = 30;
    rodape(wc, 14, 8);
    wb.eachSheet(function (ws) { ws.headerFooter.oddFooter = "&LLEGARA | Perícia Patrimonial e Societária&RSimulação gerada por IA, apenas informativa"; });
    wb.views = [{ activeTab: 0 }];
    return wb;
  }

  /* Gera e entrega uma planilha. montar(logo) devolve o workbook do ExcelJS. */
  function entregar(montar, nome, btn, st) {
    btn.disabled = true; st.hidden = false; st.dataset.kind = "info"; st.textContent = "Gerando a planilha...";
    return Promise.all([carregarExcelJS(), logoBase64()]).then(function (v) {
      return montar(v[1]).xlsx.writeBuffer();
    }).then(function (buf) {
      var blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      var viewer = window.claude && window.claude.use ? window.claude.use("downloads").catch(function () { return null; }) : Promise.resolve(null);
      return viewer.then(function (d) {
        if (d) return d.save({ filename: nome, data: blob }).then(function () { st.dataset.kind = "ok"; st.textContent = "Planilha salva: " + nome + "."; }, function (e) { st.dataset.kind = "info"; st.textContent = e && e.code === "declined" ? "Download cancelado." : "Não foi possível salvar o arquivo neste ambiente."; });
        var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome;
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
        st.dataset.kind = "ok"; st.textContent = "Planilha gerada: " + nome + ".";
      });
    }).catch(function (e) { st.dataset.kind = "err"; st.textContent = "Não foi possível gerar a planilha. " + (e && e.message ? e.message : "") + " Tente novamente."; })
      .then(function () { btn.disabled = false; });
  }
  function baixar() {
    if (!state.res) return;
    entregar(function (logo) { return construirXlsx(state.params, state.res, logo, { sistemas: state.ordem, titulo: state.cfg.tituloXlsx }); }, state.cfg.arquivo, $("#sim-baixar"), $("#sim-status"));
  }

  /* ---------- Montagem ---------- */
  function campo(id, rotulo, extra, dica) {
    return '<div class="field"><label for="sim-' + id + '">' + rotulo + "</label>" + extra + (dica ? '<p class="hint">' + dica + "</p>" : "") + '<p class="err" id="sim-e-' + id + '" aria-live="polite"></p></div>';
  }
  function mount(el, C, cfg) {
    root = el; var S = C.simulador;
    cfg = cfg || { id: "todos", titulo: "Simulador de amortização", intro: "", sistemas: ORDEM, arquivo: "LEGARA-simulacao-amortizacao.xlsx", tituloXlsx: "Simulação de amortização" };
    state = { sistema: cfg.sistemas[0], res: null, params: null, ordem: cfg.sistemas, cfg: cfg };
    root.innerHTML =
      '<p class="crumbs"><a href="#inicio">Início</a> / <a href="#simuladores">Simuladores</a> / ' + esc(cfg.titulo) + '</p><h1>' + esc(cfg.titulo) + '</h1><p class="lead">' + esc(cfg.intro) + "</p>" +
      '<aside class="callout sim-aviso" role="note"><strong>Aviso.</strong> ' + esc(S.aviso) + ' <a href="#contato">Falar com a LEGARA</a></aside>' +
      '<div class="sim-grid"><form id="sim-form" class="form-card" novalidate onsubmit="return false">' +
      '<p class="label">Dados do financiamento <span class="hint">(valores de exemplo; edite todos os campos)</span></p><div class="sim-fields">' +
      campo("bem", "Valor do bem (R$)", '<input id="sim-bem" type="number" inputmode="decimal" step="any" min="0" value="350000">') +
      campo("entrada", "Entrada (R$)", '<input id="sim-entrada" type="number" inputmode="decimal" step="any" min="0" value="70000">') +
      campo("taxa", "Taxa de juros (%)", '<div class="pair"><input id="sim-taxa" type="number" inputmode="decimal" step="any" min="0" value="11.5"><select id="sim-per" aria-label="Período da taxa"><option value="anual">ao ano</option><option value="mensal">ao mês</option></select></div>') +
      campo("prazo", "Prazo", '<div class="pair"><input id="sim-prazo" type="number" inputmode="numeric" step="1" min="1" value="180"><select id="sim-unid" aria-label="Unidade do prazo"><option value="meses">meses</option><option value="anos">anos</option></select></div>') +
      campo("carencia", "Carência de amortização (meses)", '<input id="sim-carencia" type="number" inputmode="numeric" step="1" min="0" value="0">', "Só juros nesse período.") +
      campo("data", "Data da 1ª parcela", '<input id="sim-data" type="date" value="' + isoHoje() + '">') +
      campo("seguro", "Seguro mensal (R$)", '<input id="sim-seguro" type="number" inputmode="decimal" step="any" min="0" value="0">') +
      campo("tarifa", "Tarifa mensal (R$)", '<input id="sim-tarifa" type="number" inputmode="decimal" step="any" min="0" value="0">') +
      '</div></form><div class="sim-out"><p class="empty" id="sim-vazio" hidden>Corrija os campos destacados para ver o resultado.</p><div id="sim-resultado">' +
      '<dl class="sim-resumo" id="sim-resumo"></dl>' +
      '<h2>Comparativo</h2><div class="scroll"><table class="tbl" id="sim-comp"></table></div>' +
      (cfg.insight ? '<h2>Leitura do comparativo</h2><div class="sim-insight" id="sim-insight"></div>' : '') +
      '<div class="sim-leg">' + cfg.sistemas.map(function (s) { return '<span><span class="sw sw-' + s + '"></span>' + NOMES[s] + "</span>"; }).join("") + '</div>' +
      '<h2>Saldo devedor ao longo do prazo</h2><div id="sim-grafico" class="sim-chart"></div>' +
      '<div id="sim-bloco2"><h2>Parcela ao longo do prazo</h2><div id="sim-grafico2" class="sim-chart"></div></div>' +
      '<h2>Tabela de amortização</h2><div class="chips" id="sim-tabs" role="group" aria-label="Sistema exibido"></div><p class="hint" id="sim-descr"></p><div class="scroll tall"><table class="tbl" id="sim-tabela"></table></div>' +
      '<div class="sim-dl"><button class="btn btn-primary" id="sim-baixar" type="button">Baixar planilha Excel <span class="arrow" aria-hidden="true">→</span></button><div class="status" id="sim-status" role="status" aria-live="polite" hidden></div></div>' +
      '<p class="note">' + esc(S.aviso) + ' <a href="#contato">Entre em contato</a> para maiores informações.</p>' +
      "</div></div></div>";
    root.addEventListener("input", function (e) { if (e.target.closest("#sim-form")) atualizar(); });
    root.addEventListener("change", function (e) { if (e.target.closest("#sim-form")) atualizar(); });
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-sis]"); if (b) { state.sistema = b.dataset.sis; if (state.res) renderResultado(); }
      if (e.target.closest("#sim-baixar")) baixar();
    });
    atualizar();
  }

  window.LegaraSim = { mount: mount, calc: calc, tir: tir, construirXlsx: construirXlsx,
    util: { brl: brl, brlCurto: brlCurto, pct: pct, dt: dt, esc: esc, zero: zero, addMonths: addMonths, isoHoje: isoHoje, grafico: grafico, entregar: entregar, criarKit: criarKit, campo: campo, NOMES: NOMES, DESCR: DESCR, ORDEM: ORDEM,
      xl: { NAVY: NAVY, GOLD: GOLD, GOLD_L: GOLD_L, IVORY: IVORY, GRAY: GRAY, INK: INK, F_MONEY: F_MONEY, F_PCT: F_PCT, F_DATE: F_DATE, AVISO: AVISO } } };
})();
