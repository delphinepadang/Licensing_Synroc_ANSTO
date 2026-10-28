/* =====================================================================
   Licensing Synroc — interactive components
   Reads the JSON that R writes into the page (R/site_data.R), so every
   number comes from the R model. No Shiny server, no external libraries.
   ===================================================================== */
(function () {
  "use strict";

  const D = JSON.parse(document.getElementById("synroc-data").textContent);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const SVGNS = "http://www.w3.org/2000/svg";
  const C = { ink: "#3c1a21", soft: "#6a5157", mint: "#d3eee7", mint2: "#bfe6dc",
              teal: "#5fb3a3", tealDark: "#2f7f70", blue: "#dcebf3", blue2: "#8cc3d6",
              blueDark: "#3f7f99", lilac: "#e8e0f2", pink: "#f6d9e4", pink2: "#eeb7c9" };
  const cite = (n) => `<a class="cite" href="references.html#r${n}">[${n}]</a>`;
  const fmt = (x, d = 1) => Number(x).toFixed(d);

  function svgEl(tag, attrs, parent) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function svgText(parent, x, y, txt, attrs = {}) {
    const t = svgEl("text", Object.assign({ x, y }, attrs), parent);
    t.textContent = txt;
    return t;
  }

  /* ---------------- Reveal on scroll + counters + active nav --------- */
  const io = new IntersectionObserver((ents) => {
    ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  $$(".reveal").forEach((el) => io.observe(el));

  const countIO = new IntersectionObserver((ents) => {
    ents.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target, end = +el.dataset.count, suf = el.dataset.suffix || "";
      const t0 = performance.now(), dur = 1200;
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
        el.textContent = v + suf;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      countIO.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$("[data-count]").forEach((el) => countIO.observe(el));

  const navLinks = $$(".nav-links a[href^='#']");
  const secIO = new IntersectionObserver((ents) => {
    ents.forEach((e) => {
      if (e.isIntersecting) navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$("section[id]").forEach((s) => secIO.observe(s));

  /* ---------------- 01 Problem: cubes drawn to true volume ----------- */
  function cube(g, cx, base, s, fill, dashed) {
    const d = s * 0.45, x = cx - (s + d) / 2, y = base;
    const stroke = { stroke: C.ink, "stroke-width": 1.6, "stroke-linejoin": "round" };
    if (dashed) Object.assign(stroke, { "stroke-dasharray": "4 4", fill: "none" });
    const pts = (a) => a.map((p) => p.join(",")).join(" ");
    svgEl("polygon", Object.assign({ points: pts([[x, y - s], [x + d, y - s - d], [x + s + d, y - s - d], [x + s, y - s]]),
      fill: dashed ? "none" : shade(fill, 1.08) }, stroke), g);
    svgEl("polygon", Object.assign({ points: pts([[x + s, y], [x + s + d, y - d], [x + s + d, y - s - d], [x + s, y - s]]),
      fill: dashed ? "none" : shade(fill, 0.86) }, stroke), g);
    svgEl("rect", Object.assign({ x, y: y - s, width: s, height: s, fill: dashed ? "none" : fill }, stroke), g);
  }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
    return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
  }
  function drawCubes() {
    const V = +$("#vol").value, svg = $("#cubes");
    svg.innerHTML = "";
    const k = 190 / Math.cbrt(25 * 15), side = (v) => k * Math.cbrt(v);
    const base = 232, cols = [95, 290, 470];
    cube(svg, cols[0], base, side(V), C.blue2);
    cube(svg, cols[1], base, side(25 * V), C.pink2);
    cube(svg, cols[2], base, side(1 * V), C.teal, true);
    cube(svg, cols[2], base, side(0.25 * V), C.teal);
    const lab = (x, a, b) => { svgText(svg, x, 262, a, { class: "cube-label", "text-anchor": "middle" });
                               svgText(svg, x, 282, b, { class: "cube-sub", "text-anchor": "middle" }); };
    lab(cols[0], "Liquid waste", fmt(V) + " m³");
    lab(cols[1], "Cemented", fmt(25 * V, 0) + " m³");
    lab(cols[2], "Synroc", fmt(0.25 * V, 2) + "–" + fmt(V) + " m³");
    $("#volOut").textContent = fmt(V) + " m³";
    $("#cemOut").textContent = fmt(25 * V, 0) + " m³";
    $("#synOut").textContent = fmt(0.25 * V, 2) + "–" + fmt(V) + " m³";
  }
  $("#vol").addEventListener("input", drawCubes);
  drawCubes();

  /* ---------------- 02 Where: country chips + detail ----------------- */
  const ST = { "Potential market": "st-Proceeds", "No waste data": "st-Evidence", "Benchmark": "st-Benchmark",
               "No matching waste": "st-Excluded", "Revisit later": "st-Excluded" };
  const stClass = (s) => ST[s] || "st-Excluded";
  const chips = $("#chips");
  D.countries.forEach((c, i) => {
    const b = document.createElement("button");
    b.className = "chip " + stClass(c.stage1);
    b.innerHTML = `${c.name}<small>${c.stage1}</small>`;
    b.addEventListener("click", () => showCountry(i));
    chips.appendChild(b);
  });
  function meter(label, v, cls) {
    return `<div class="meter"><span>${label}</span><div class="track"><div class="fill ${cls}" style="width:${v * 20}%"></div></div><b>${v}</b></div>`;
  }
  function showCountry(i) {
    const c = D.countries[i];
    $$(".chip", chips).forEach((el, j) => el.classList.toggle("sel", j === i));
    $("#countryDetail").innerHTML = `
      <div class="grid-2" style="align-items:center">
        <div>
          <span class="tag ${stClass(c.stage1)}">${c.stage1}</span><span class="tag" style="background:rgba(60,26,33,.07)">${c.bloc}</span>
          <h3 style="margin-top:12px">${c.name}</h3>
          <p style="margin:0 0 6px"><b>${c.site}</b></p>
          <p style="margin:0">${c.note}</p>
        </div>
        <div>
          <p style="margin:0 0 4px"><b>Waste stream (RQ1):</b> ${c.stream}</p>
          ${meter("Legal score", c.legal, "")}
          ${meter("Political score", c.political, "pol")}
          <p class="note" style="margin-top:6px">Law and politics (RQ3) = ${fmt(c.rq3)} / 5</p>
        </div>
      </div>`;
  }
  showCountry(0);

  /* ---------------- 03 Research questions ---------------------------- */
  const RQ = [
    { k: "RQ1", t: "Technical fit", sub: "Which waste fits?",
      aim: "Which medical-isotope waste fits Synroc, and how ready is the technology for it?",
      app: "Compared waste chemistry, yearly volume, durability evidence and readiness (TRL) across 8 countries, with ANSTO as the reference " + cite(9) + ".",
      ans: "Potential markets: liquid waste from fission Mo-99 at Petten (NL) and Fleurus (BE). South Africa has matching waste but no volume data. Provisional TRL 6 " + cite(2) + ".",
      ev: "A Synroc glass-ceramic held 26% of this waste by weight and passed the leach test set for high-level-waste glass " + cite(2) + ".",
      risk: "Other producers' chemistry differs slightly and SyMo is still commissioning " + cite(5) + ", so each producer's real waste must be tested first." },
    { k: "RQ2", t: "Economics", sub: "Where does it pay?",
      aim: "Where is Synroc cheaper than cement, and should ANSTO license it or build plants?",
      app: "Present-value costing per m³ of waste, with 20,000 Monte Carlo scenarios " + cite(10) + ".",
      ans: "A small but valuable market (2.6–15 m³ of liquid Mo-99 waste a year worldwide). Licensing is cheaper than cement in 96% of Dutch and 81% of Belgian scenarios, and beats building a plant everywhere.",
      ev: "Licensing pays from 0.5 m³ a year (NL) and 1.0 m³ (BE). In the UK and Canada, disposal is 25–50 years away, so Synroc wins in at most 16% of scenarios.",
      risk: "The Dutch volume is unpublished: 29% less and licensing no longer pays there." },
    { k: "RQ3", t: "Law and politics", sub: "Can it be licensed?",
      aim: "Can Synroc be licensed in each country, and will governments support it?",
      app: "Each country's law checked against the same questions, then politics scored with Kingdon's policy-window model " + cite(7) + ".",
      ans: "No jurisdiction legally blocks Synroc. Law and politics together favour the Netherlands and Belgium, where the state already funds isotope supply or its waste " + cite(13) + ", " + cite(14) + ".",
      ev: "Only the UK can assess a new wasteform before a repository exists " + cite(24) + ". France backs its own vitrification " + cite(15) + "; South Africa's producer was halted for a year " + cite(16) + ".",
      risk: "Neither COVRA nor ONDRAF has acceptance criteria for a new wasteform yet " + cite(23) + ", and policy can reverse, as at Kimba " + cite(18) + "." },
    { k: "RQ4", t: "Social licence", sub: "Will hosts accept it?",
      aim: "Will host communities accept compact treatment, and does that change where Synroc can go?",
      app: "The social licence to operate framework: legitimacy, credibility and trust " + cite(8) + ".",
      ans: "Acceptance is earned site by site, so it cannot rank countries yet. Under a licence, treatment stays on already-licensed sites, and the licensee holds the social licence.",
      ev: "Canada sited its repository after a decade of engagement " + cite(17) + "; Kimba was set aside in 2023 " + cite(18) + ".",
      risk: "No survey compares attitudes to treatment with disposal " + cite(21) + "; Petten and Fleurus carry history " + cite(19) + ", " + cite(20) + "." }
  ];
  const tabs = $("#rqTabs");
  RQ.forEach((r, i) => {
    const b = document.createElement("button");
    b.className = "tab";
    b.innerHTML = `${r.k} · ${r.t}<small>${r.sub}</small>`;
    b.addEventListener("click", () => showRQ(i));
    tabs.appendChild(b);
  });
  function showRQ(i) {
    const r = RQ[i];
    $$(".tab", tabs).forEach((el, j) => el.classList.toggle("on", j === i));
    $("#rqPanel").innerHTML = [["Question", r.aim], ["How we tested it", r.app], ["Finding", r.ans], ["Evidence", r.ev], ["What could go wrong", r.risk]]
      .map(([h, t]) => `<div class="rq-cell"><b>${h}</b>${t}</div>`).join("");
  }
  showRQ(0);

  /* ---------------- 04 Decision model -------------------------------- */
  const crit = [["rq1", "Technical"], ["rq2", "Economic"], ["rq3", "Law and politics"], ["rq4", "Social licence"]];
  const wc = $("#weightControls");
  crit.forEach(([k, lab]) => {
    wc.insertAdjacentHTML("beforeend",
      `<div class="control"><label for="w_${k}">${lab} <output id="o_${k}"></output></label>
       <input type="range" id="w_${k}" min="0" max="100" step="1" value="25"></div>`);
  });
  const names = { NL: "Netherlands", BE: "Belgium", ZA: "South Africa" };
  const barCol = { NL: C.teal, BE: C.blue2, ZA: C.lilac };
  let curW = [0.25, 0.25, 0.25, 0.25];
  let ncReady = false;
  function decide() {
    const raw = crit.map(([k]) => +$("#w_" + k).value);
    const tot = raw.reduce((a, b) => a + b, 0) || 1;
    const w = raw.map((v) => v / tot);
    curW = w;
    if (ncReady) scoreNew();
    crit.forEach(([k], j) => { $("#o_" + k).textContent = Math.round(w[j] * 100) + "%"; });
    $("#wsum").textContent = "Weights are rescaled to sum to 100%.";
    const vals = D.scores.map((s) => {
      const x = crit.map(([k]) => s[k]);
      const missing = x.some((v) => v === null);
      return { id: s.id, missing, v: missing ? null : x.reduce((a, xi, j) => a + w[j] * xi, 0) };
    });
    $("#rankBars").innerHTML = vals.map((r) => r.missing
      ? `<div class="bar-row gap"><span>${names[r.id]}</span><div class="track"><div class="fill" style="width:100%;background:repeating-linear-gradient(45deg,#ece7ee 0 8px,#f7f4f8 8px 16px)"></div></div><span class="val">?</span></div>`
      : `<div class="bar-row"><span>${names[r.id]}</span><div class="track"><div class="fill" style="width:${r.v / 5 * 100}%;background:${barCol[r.id]}"></div></div><span class="val">${fmt(r.v, 2)}</span></div>`
    ).join("") + `<p class="note" style="margin-top:0">Score out of 5. South Africa cannot be ranked until its economics are modelled.</p>`;
    const nl = vals.find((r) => r.id === "NL").v, be = vals.find((r) => r.id === "BE").v;
    $("#verdict").innerHTML = Math.abs(nl - be) < 1e-9
      ? "A tie: you have put all the weight on social licence, where the two sites score the same."
      : (nl > be ? "<b>The Netherlands ranks first.</b> It scores at least as well as Belgium on every criterion, so no weighting puts Belgium ahead."
                 : "<b>Belgium ranks first.</b>");
    $("#verdict").style.background = Math.abs(nl - be) < 1e-9 ? C.blue : C.mint;
  }
  crit.forEach(([k]) => $("#w_" + k).addEventListener("input", () => { $$("#presets button").forEach((b) => b.classList.remove("on")); decide(); }));
  $$("#presets button").forEach((b) => b.addEventListener("click", () => {
    b.dataset.w.split(",").forEach((v, j) => { $("#w_" + crit[j][0]).value = v; });
    $$("#presets button").forEach((x) => x.classList.toggle("on", x === b));
    decide();
  }));
  $("#smaaNote").innerHTML = `Across ${D.n_draws.toLocaleString()} random weightings (SMAA-2 ${cite(11)}), the Netherlands ranked first in ${Math.round(D.smaa.NL * 100)}%. Our threshold for a robust leader was 75%.`;
  decide();

  /* ---------------- 04b Score a new country (reusable framework) ----- */
  const ncSl = $("#ncSliders");
  const ncHelp = {
    rq1: "1 = no matching waste · 5 = proven on its waste",
    rq2: "1 = costs more than cement · 5 = large saving",
    rq3: "1 = hostile law/politics · 5 = clear route and support",
    rq4: "1 = strong local opposition · 5 = strong local support"
  };
  crit.forEach(([k, lab]) => {
    ncSl.insertAdjacentHTML("beforeend",
      `<div class="control"><label for="nc_${k}">${lab} <output id="nco_${k}">3</output></label>
       <input type="range" id="nc_${k}" min="1" max="5" step="0.5" value="3">
       <div class="hint">${ncHelp[k]}</div></div>`);
  });
  const NC_EX = {
    za:    { name: "South Africa", s: [3, 3, 2.5, 3], m: [true, true, true],
             note: "Example only: South Africa's cost score is assumed (3) because its economics have not been modelled." },
    fr:    { name: "France", s: [1, 2, 2.5, 3], m: [false, true, true],
             note: "Example: France has no operating Mo-99 producer, so it fails the first must-have." },
    blank: { name: "New country", s: [3, 3, 3, 3], m: [true, true, true], note: "" }
  };
  let ncNote = "";
  function rng(seed) {   // small seeded generator so the result is stable
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function robustness(rows, idx) {
    const r = rng(2026), N = 2000;
    let first = 0, top2 = 0;
    for (let n = 0; n < N; n++) {
      const g = [0, 0, 0, 0].map(() => -Math.log(1 - r()));      // Dirichlet(1) weights
      const s = g.reduce((a, b) => a + b, 0);
      const v = rows.map((x) => x.s.reduce((a, xi, j) => a + xi * g[j] / s, 0));
      const better = v.filter((x, j) => j !== idx && x > v[idx] + 1e-12).length;
      if (better === 0) first++;
      if (better <= 1) top2++;
    }
    return { first: first / N, top2: top2 / N, N };
  }
  function scoreNew() {
    const name = ($("#ncName").value || "New country").trim().slice(0, 40) || "New country";
    const s = crit.map(([k]) => +$("#nc_" + k).value);
    crit.forEach(([k], j) => { $("#nco_" + k).textContent = s[j]; });
    const musts = ["#ncM1", "#ncM2", "#ncM3"].map((id) => $(id).checked);
    const mustLab = ["no matching fission Mo-99 waste", "a legal block", "too little volume to pay for a licence"];
    const ref = D.scores.filter((x) => x.rq2 !== null).map((x) => ({ id: x.id, name: names[x.id], s: crit.map(([k]) => x[k]), col: barCol[x.id] }));
    const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const nm = esc(name);
    const val = (sc) => sc.reduce((a, xi, j) => a + curW[j] * xi, 0);
    if (musts.includes(false)) {
      const why = musts.map((ok, j) => ok ? null : mustLab[j]).filter(Boolean).join(" and ");
      $("#ncBars").innerHTML = ref.map((r) => `<div class="bar-row"><span>${r.name}</span><div class="track"><div class="fill" style="width:${val(r.s) / 5 * 100}%;background:${r.col}"></div></div><span class="val">${fmt(val(r.s), 2)}</span></div>`).join("")
        + `<div class="bar-row gap"><span>${nm}</span><div class="track"><div class="fill" style="width:100%;background:repeating-linear-gradient(45deg,#ece7ee 0 8px,#f7f4f8 8px 16px)"></div></div><span class="val">–</span></div>`;
      $("#ncVerdict").innerHTML = `<b>${nm} is screened out</b> at Stage 1: ${why}. A must-have cannot be traded off, so no weighting can rank it. Recommendation stays: the Netherlands first, Belgium second.`;
      $("#ncVerdict").style.background = C.pink;
      $("#ncRobust").innerHTML = ncNote;
      return;
    }
    const rows = ref.concat([{ id: "NEW", name: nm, s, col: C.pink2 }]);
    rows.forEach((r) => { r.v = val(r.s); });
    const order = rows.slice().sort((a, b) => b.v - a.v);
    $("#ncBars").innerHTML = order.map((r) => `<div class="bar-row${r.id === "NEW" ? " newc-row" : ""}"><span>${r.name}</span><div class="track"><div class="fill" style="width:${r.v / 5 * 100}%;background:${r.col}"></div></div><span class="val">${fmt(r.v, 2)}</span></div>`).join("");
    const pos = order.findIndex((r) => r.id === "NEW") + 1;
    const ord = ["1st", "2nd", "3rd"][pos - 1];
    const lead = order[0];
    const rb = robustness(rows, rows.length - 1);
    $("#ncVerdict").innerHTML = pos === 1
      ? `<b>Based on these inputs, the tool recommends ${nm} first</b>, ahead of ${order[1].id === "NL" ? "the Netherlands" : order[1].name} (${fmt(rows[rows.length - 1].v, 2)} vs ${fmt(order[1].v, 2)} out of 5).`
      : `<b>Based on these inputs, ${nm} ranks ${ord} of 3</b> (${fmt(rows[rows.length - 1].v, 2)} out of 5). The tool still recommends ${lead.id === "NL" ? "the Netherlands" : lead.name} first.`;
    $("#ncVerdict").style.background = pos === 1 ? C.mint : C.blue;
    $("#ncRobust").innerHTML = `Stress test: across ${rb.N.toLocaleString()} random weightings, ${nm} ranks first in ${Math.round(rb.first * 100)}% and in the top two in ${Math.round(rb.top2 * 100)}%. ` + ncNote;
  }
  crit.forEach(([k]) => $("#nc_" + k).addEventListener("input", scoreNew));
  ["#ncM1", "#ncM2", "#ncM3"].forEach((id) => $(id).addEventListener("change", scoreNew));
  $("#ncName").addEventListener("input", scoreNew);
  $$("#ncExamples button").forEach((b) => b.addEventListener("click", () => {
    const ex = NC_EX[b.dataset.ex];
    $("#ncName").value = ex.name;
    crit.forEach(([k], j) => { $("#nc_" + k).value = ex.s[j]; });
    ["#ncM1", "#ncM2", "#ncM3"].forEach((id, j) => { $(id).checked = ex.m[j]; });
    ncNote = ex.note ? `<br><i>${ex.note}</i>` : "";
    $$("#ncExamples button").forEach((x) => x.classList.toggle("on", x === b));
    scoreNew();
  }));
  ncReady = true;
  scoreNew();

  /* ---------------- 05 Economics ------------------------------------- */
  let econIdx = 0;
  const seg = $("#econCountry");
  D.econ.forEach((e, i) => {
    const b = document.createElement("button");
    b.textContent = e.name;
    if (i === 0) b.classList.add("on");
    b.addEventListener("click", () => {
      econIdx = i; $$("button", seg).forEach((x, j) => x.classList.toggle("on", j === i));
      $("#econVol").value = e.volume; econ();
    });
    seg.appendChild(b);
  });
  function econ() {
    const e = D.econ[econIdx], V = +$("#econVol").value, B = e.breakeven;
    $("#econVolOut").textContent = fmt(V) + " m³/yr";
    const svg = $("#econSvg"); svg.innerHTML = "";
    const x0 = 20, x1 = 540, max = 5, X = (v) => x0 + (x1 - x0) * v / max, y = 62;
    svgEl("rect", { x: x0, y: y - 18, width: X(B) - x0, height: 36, rx: 8, fill: C.pink }, svg);
    svgEl("rect", { x: X(B), y: y - 18, width: x1 - X(B), height: 36, rx: 8, fill: C.mint }, svg);
    if (e.id === "NL") {
      svgEl("rect", { x: X(0.7), y: y - 5, width: X(4.0) - X(0.7), height: 10, rx: 5, fill: C.mint2, stroke: C.tealDark, "stroke-width": 1 }, svg);
      svgText(svg, X(2.35), y + 36, "plausible Dutch range 0.7–4.0", { "text-anchor": "middle", class: "cube-sub" });
    }
    svgEl("line", { x1: X(B), x2: X(B), y1: y - 26, y2: y + 22, stroke: C.ink, "stroke-width": 2.5 }, svg);
    svgText(svg, X(B), y - 32, `break-even ${fmt(B)} m³/yr`, { class: "cube-sub", "text-anchor": X(B) < 90 ? "start" : "middle" });
    svgText(svg, x0, y + 36, "doesn't pay", { class: "cube-sub" });
    svgText(svg, x1, y + 36, "pays", { class: "cube-sub", "text-anchor": "end" });
    svgEl("circle", { cx: X(V), cy: y, r: 11, fill: C.ink, stroke: "#fff", "stroke-width": 3 }, svg);
    for (let t = 0; t <= max; t++) svgText(svg, X(t), 124, t, { "text-anchor": "middle", class: "cube-sub" });
    svgText(svg, x1, 146, "m³ of liquid waste per year", { "text-anchor": "end", class: "cube-sub" });
    $("#kSave").textContent = "A$" + fmt(e.saving_per_m3 * V) + "m";
    $("#kHead").textContent = V >= B ? Math.round((1 - B / V) * 100) + "%" : "below";
    $("#kHead").style.color = V >= B ? C.ink : "#a2445c";
    $("#kP").textContent = Math.round(e.p_cheaper * 100) + "%";
  }
  $("#econVol").addEventListener("input", econ);
  econ();

  function pv() {
    const t = +$("#years").value, r = D.discount_rate, f = Math.pow(1 + r, -t);
    $("#yearsOut").textContent = t + (t === 1 ? " year" : " years");
    const svg = $("#pvSvg"); svg.innerHTML = "";
    const x0 = 62, x1 = 545, y0 = 190, y1 = 24, X = (v) => x0 + (x1 - x0) * v / 60, Y = (v) => y0 - (y0 - y1) * v;
    svgEl("rect", { x: X(25), y: y1, width: X(50) - X(25), height: y0 - y1, fill: C.pink, opacity: 0.7 }, svg);
    svgText(svg, X(37.5), y1 + 18, "UK and Canada: 25–50 yrs", { "text-anchor": "middle", class: "cube-sub" });
    [0, 0.25, 0.5, 0.75, 1].forEach((v) => {
      svgEl("line", { x1: x0, x2: x1, y1: Y(v), y2: Y(v), stroke: "rgba(60,26,33,.1)" }, svg);
      svgText(svg, x0 - 8, Y(v) + 4, "$" + v.toFixed(2), { "text-anchor": "end", class: "cube-sub" });
    });
    let d = "";
    for (let s = 0; s <= 60; s++) d += (s ? "L" : "M") + X(s) + "," + Y(Math.pow(1 + r, -s));
    svgEl("path", { d, fill: "none", stroke: C.tealDark, "stroke-width": 3 }, svg);
    svgEl("circle", { cx: X(0), cy: Y(1), r: 7, fill: C.teal, stroke: C.ink, "stroke-width": 2 }, svg);
    svgText(svg, X(0) + 16, Y(1) + 40, "NL and BE: paid at hand-over", { class: "cube-sub" });
    svgEl("line", { x1: X(t), x2: X(t), y1: Y(f), y2: y0, stroke: C.ink, "stroke-dasharray": "4 4" }, svg);
    svgEl("circle", { cx: X(t), cy: Y(f), r: 9, fill: C.ink, stroke: "#fff", "stroke-width": 3 }, svg);
    [0, 10, 20, 30, 40, 50, 60].forEach((v) => svgText(svg, X(v), y0 + 20, v, { "text-anchor": "middle", class: "cube-sub" }));
    $("#pvText").innerHTML = `A$1 of disposal charge avoided ${t ? `but paid in <b>${t} years</b>` : "<b>at hand-over</b>"} is worth <b>A$${f.toFixed(2)}</b> today.`;
  }
  $("#years").addEventListener("input", pv);
  pv();

  /* ---------------- 06 Risk matrix ----------------------------------- */
  let riskMode = "inherent", riskSel = "R1";
  const lv = ["", "Low", "Medium", "High"];
  const sev = (L, I) => (L * I >= 6 ? "High" : L * I >= 3 ? "Medium" : "Low");
  function matrix() {
    const m = $("#matrix"); m.innerHTML = "";
    const Lk = riskMode === "inherent" ? "L" : "RL", Ik = riskMode === "inherent" ? "I" : "RI";
    for (let L = 3; L >= 1; L--) for (let I = 1; I <= 3; I++) {
      const cell = document.createElement("div");
      cell.className = "cell sev-" + sev(L, I);
      cell.innerHTML = `<span class="sev">${sev(L, I)}</span>`;
      D.risks.filter((r) => r[Lk] === L && r[Ik] === I).forEach((r) => {
        const b = document.createElement("button");
        b.className = "rchip" + (r.id === riskSel ? " sel" : "");
        b.textContent = r.id; b.title = r.risk;
        b.addEventListener("click", () => { riskSel = r.id; matrix(); });
        cell.appendChild(b);
      });
      m.appendChild(cell);
    }
    const r = D.risks.find((x) => x.id === riskSel);
    const gate = ["R1", "R6", "R7"].includes(r.id);
    $("#riskDetail").innerHTML = `
      <div class="id">${r.id}</div><h3>${r.risk}</h3>
      <p style="margin:10px 0">
        <span class="lvl">Likelihood: ${lv[r.L]} → ${lv[r.RL]}</span>
        <span class="lvl">Impact: ${lv[r.I]} → ${lv[r.RI]}</span>
        ${gate ? '<span class="lvl" style="background:var(--pink)">Stops the plan: gated</span>' : ""}
      </p>
      <p><b>Our response:</b> ${r.response}</p>
      <p class="note">Ratings before → after treatment. Click any risk in the matrix.</p>`;
  }
  $$("#riskMode button").forEach((b) => b.addEventListener("click", () => {
    riskMode = b.dataset.m; $$("#riskMode button").forEach((x) => x.classList.toggle("on", x === b)); matrix();
  }));
  matrix();

  /* ---------------- 07 Plan stepper ---------------------------------- */
  const STEPS = [
    { k: "Now", t: "Open talks", d: "Characterisation, agency dialogue and community engagement need no operating plant, so they start now. Confirm the Petten volume." },
    { k: "G1", t: "Formulation qualified", d: "Simulant, then active tests on each producer's real waste, including any residue left after uranium recovery (RECUMO) " + cite(12) + "." },
    { k: "G2", t: "Package accepted", d: "COVRA and ONDRAF accept the Synroc package and confirm their tariffs. Neither has acceptance criteria for a new wasteform yet " + cite(23) + "." },
    { k: "G3", t: "SyMo licensed", d: "ARPANSA licenses SyMo to operate, so ANSTO sells a working reference plant. If this slips past 2029, re-time offers to Petten's move to PALLAS in 2030 " + cite(22) + "." },
    { k: "Sign", t: "Licences, NL first", d: "License COVRA first and ONDRAF in parallel, priced on the disposal cost each avoids, with an upfront fee and a minimum annual payment." }
  ];
  const stepper = $("#stepper");
  STEPS.forEach((s, i) => {
    const b = document.createElement("button");
    b.className = "step";
    b.innerHTML = `<div class="dot">${s.k}</div><div class="t">${s.t}</div>`;
    b.addEventListener("click", () => showStep(i));
    stepper.appendChild(b);
  });
  function showStep(i) {
    $$(".step", stepper).forEach((el, j) => el.classList.toggle("on", j === i));
    $("#stepDetail").innerHTML = `<span class="kicker">${STEPS[i].k === "Now" ? "Start now" : STEPS[i].k === "Sign" ? "Only after all three gates" : "Gate " + STEPS[i].k.slice(1)}</span><h3>${STEPS[i].t}</h3><p style="margin:0">${STEPS[i].d}</p>`;
  }
  showStep(0);

})();
