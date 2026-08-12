/* consult-live.js - the Northbridge storyline scorer (learn-ai-consulting-with-phoebe)
   Scores REAL text with real measures: answer-first governing thought, quantified support,
   so-what density, weasel words, client anchors, length discipline - plus a confidentiality
   gate that overrides everything. The drafts are scripted (each lever loads a rewrite);
   every score is computed live from the text in front of you, including anything you paste.
   No dependencies. Modes via data-mode: storyline | deck | confidential | capstone */
(function () {
  "use strict";
  var mount = document.getElementById("consult-live");
  if (!mount) return;
  var modeAttr = mount.getAttribute("data-mode");
  var MODE = (modeAttr === null || modeAttr === "") ? "storyline" : modeAttr;

  /* ---------- case facts: Cadence engagement (client anchors the scorer looks for) ---------- */
  var ANCHORS = [/cadence/i, /enterprise/i, /\bseat[s]?\b/i, /churn/i, /pilot/i, /note-?tak/i, /procurement/i, /security review/i];
  var VERBS = /(should|recommend|launch|expand|reprice|price|target|invest|focus|shift|prioriti[sz]e|move)/i;
  var NUMRE = /(\d[\d,.]*\s*(%|percent|k\b|m\b|x\b)?|\$\s?\d)/i;
  var SOWHAT = /(because|\bso\b|which means|which puts|driving|worth|delivering|saving|unlock|freeing|closing)/i;
  var WEASELS = [/leverage synerg/i, /world-?class/i, /holistic/i, /robust/i, /cutting-?edge/i, /innovative/i, /best-?in-?class/i, /state-?of-?the-?art/i, /\bvarious\b/i, /\bnumerous\b/i, /potentially/i, /\bexplore\b/i, /significant(?!ly \d)/i, /transformative/i, /paradigm/i, /synergy/i, /dynamic landscape/i, /ever-?evolving/i, /in today'?s/i, /game-?chang/i];
  /* confidentiality gate: things that must never leave the building */
  var FORBIDDEN = [
    { re: /meridian bank/i, label: "the client's client named (Meridian Bank)" },
    { re: /elena voss/i, label: "a real person named (Elena Voss, Cadence CRO)" },
    { re: /\$4\.2m|\$4,200,000/i, label: "an unreleased contract value ($4.2M)" },
    { re: /q3 board deck|board-?confidential/i, label: "board-confidential material referenced" },
    { re: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i, label: "an email address" }
  ];

  /* ---------- the real measures ---------- */
  function splitLines(t) { return t.split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean); }
  function bullets(t) { return splitLines(t).filter(function (l) { return /^[-•·*]|^\d+[.)]/.test(l); }); }
  function words(t) { return (t.match(/\S+/g) || []).length; }

  function score(text) {
    var m = {}, lines = splitLines(text), bl = bullets(text);
    var first = lines[0] || "";
    /* gate first */
    var leaks = FORBIDDEN.filter(function (f) { return f.re.test(text); });
    /* M1 answer-first governing thought: first line has a verb of recommendation AND a number */
    m.answer = (VERBS.test(first) ? 10 : 0) + (NUMRE.test(first) ? 10 : 0);
    /* M2 quantified support: share of bullets carrying a number */
    var q = bl.length ? bl.filter(function (b) { return NUMRE.test(b); }).length / bl.length : 0;
    m.quant = Math.round(20 * q);
    /* M3 so-what density: share of bullets carrying a consequence marker */
    var s = bl.length ? bl.filter(function (b) { return SOWHAT.test(b); }).length / bl.length : 0;
    m.sowhat = Math.round(15 * s);
    /* M4 weasel penalty: start at 15, -3 each hit */
    var wz = 0; WEASELS.forEach(function (w) { if (w.test(text)) wz++; });
    m.weasel = Math.max(0, 15 - 3 * wz);
    m.weaselCount = wz;
    /* M5 client anchors: 3 pts per distinct anchor, max 15 */
    var an = 0; ANCHORS.forEach(function (a) { if (a.test(text)) an++; });
    m.anchor = Math.min(15, 3 * an);
    m.anchorCount = an;
    /* M6 length discipline: 90-160 words full 15; fall off outside */
    var w = words(text);
    m.len = w >= 90 && w <= 160 ? 15 : (w >= 60 && w <= 220 ? 8 : (w > 0 ? 3 : 0));
    m.words = w;
    var total = m.answer + m.quant + m.sowhat + m.weasel + m.anchor + m.len;
    if (bl.length === 0) total = Math.min(total, 40); /* no argument structure at all */
    m.leaks = leaks;
    m.total = leaks.length ? Math.min(total, 15) : total;
    m.rawTotal = total;
    return m;
  }

  /* ---------- the scripted drafts (levers load these; scoring is always live) ---------- */
  var D = {};
  D.intern = "Cadence has big opportunities in the enterprise market and should potentially explore various options to leverage synergies in today's dynamic landscape.\n" +
    "- The market is significant and growing, with numerous players\n" +
    "- A holistic, innovative go-to-market approach could be transformative\n" +
    "- We should explore robust partnerships and cutting-edge positioning";
  D.answerFirst = "Cadence should launch an enterprise tier at $30 per seat in Q1, targeting the 210 pilot accounts already inside security review.\n" +
    "- The market is significant and growing, with numerous players\n" +
    "- A holistic, innovative go-to-market approach could be transformative\n" +
    "- We should explore robust partnerships and cutting-edge positioning";
  D.quantified = "Cadence should launch an enterprise tier at $30 per seat in Q1, targeting the 210 pilot accounts already inside security review.\n" +
    "- 62% of trial teams hit the 5-seat cap within 3 weeks, and 210 accounts entered procurement or security review unprompted\n" +
    "- Enterprise seats retain at 94% vs 71% for individual plans - churn concentrates in single-seat users\n" +
    "- Competitors price enterprise note-taking at $38-45 per seat, leaving room to undercut at $30 while lifting ARPU 2.1x";
  D.sowhat = "Cadence should launch an enterprise tier at $30 per seat in Q1, targeting the 210 pilot accounts already inside security review.\n" +
    "- 62% of trial teams hit the 5-seat cap within 3 weeks, which means demand is already organized into buying units\n" +
    "- Enterprise seats retain at 94% vs 71% for individual plans, so every converted account compounds instead of churning\n" +
    "- Competitors price at $38-45 per seat, so a $30 entry undercuts the category while still lifting ARPU 2.1x";
  D.deweaseled = D.sowhat; /* sowhat draft is already weasel-free; lever exists for the intern path */
  D.anchored = "Cadence should launch an enterprise tier at $30 per seat in Q1, targeting the 210 pilot accounts already inside security review.\n" +
    "- 62% of Cadence trial teams hit the 5-seat cap within 3 weeks, which means enterprise demand is already organized into buying units\n" +
    "- Enterprise seats retain at 94% vs 71% churn-prone individual plans, so each converted pilot compounds recurring revenue\n" +
    "- Rival note-takers price enterprise at $38-45 per seat, so a $30 entry undercuts the category while lifting Cadence ARPU 2.1x\n" +
    "Procurement is the bottleneck: pre-built security-review packets shorten the pilot-to-contract cycle.";
  D.aiSlop = "In today's rapidly evolving business landscape, artificial intelligence presents a transformative opportunity for organizations seeking to unlock value. A holistic go-to-market strategy, grounded in best-in-class practices, can position the company for sustainable growth.\n" +
    "- Embrace innovative, cutting-edge solutions to drive synergy across the organization\n" +
    "- Explore various strategic partnerships to leverage emerging opportunities\n" +
    "- Adopt a robust, dynamic approach to capture significant market potential";
  D.leaky = "Cadence should launch an enterprise tier at $30 per seat in Q1: Meridian Bank's $4.2M contract discussion (per Elena Voss, and the Q3 board deck) proves enterprise appetite.\n" +
    "- 62% of trial teams hit the 5-seat cap within 3 weeks, which means demand is already organized into buying units\n" +
    "- Enterprise seats retain at 94% vs 71% for individual plans, so every converted account compounds\n" +
    "- Competitors price at $38-45 per seat, so a $30 entry undercuts the category while lifting ARPU 2.1x";
  D.anonymized = "Cadence should launch an enterprise tier at $30 per seat in Q1: a major financial-services prospect in late-stage talks (contract in the low millions) proves enterprise appetite.\n" +
    "- 62% of trial teams hit the 5-seat cap within 3 weeks, which means demand is already organized into buying units\n" +
    "- Enterprise seats retain at 94% vs 71% for individual plans, so every converted account compounds\n" +
    "- Competitors price at $38-45 per seat, so a $30 entry undercuts the category while lifting ARPU 2.1x";

  /* ---------- theming + UI ---------- */
  var css = getComputedStyle(document.documentElement);
  function v(nm, fb) { var x = css.getPropertyValue(nm).trim(); return x || fb; }
  var TH = { accent: v("--indigo", "#1B3A6B"), deep: v("--indigo-deep", "#122A4F"), mid: v("--indigo-mid", "#4A6B9C"),
    soft: v("--indigo-soft", "#A8BDD9"), tint: v("--indigo-50", "#EDF2F9"), ink: v("--ink", "#1A2230"),
    muted: v("--muted", "#626E80"), hairline: v("--hairline", "#E2E7EF"), warm: v("--amber", "#8896A9"),
    warmTint: v("--amber-50", "#F1F4F8"), warmInk: v("--amber-ink", "#26303D"),
    red: "#991B1B", redSoft: "#FCA5A5", redTint: "#FEF2F2", green: "#0B7A4B", greenTint: "#E7F6EE" };

  var style = document.createElement("style");
  style.textContent =
    "#consult-live{border:1px solid " + TH.hairline + ";border-radius:14px;background:#fff;padding:1rem 1.1rem 1.2rem;font-feature-settings:'tnum'}" +
    "#consult-live .co-hint{font-size:.85rem;color:" + TH.muted + ";margin:0 0 .7rem}" +
    "#consult-live .co-row{display:flex;gap:1rem;flex-wrap:wrap;align-items:flex-start}" +
    "#consult-live .co-doc{flex:1 1 330px;min-width:300px;border:1px solid " + TH.hairline + ";border-radius:10px;background:" + TH.tint + ";padding:.9rem 1rem;font-size:.88rem;line-height:1.7;white-space:pre-wrap}" +
    "#consult-live .co-doc.leak{border-color:" + TH.redSoft + ";background:" + TH.redTint + "}" +
    "#consult-live textarea{flex:1 1 330px;min-width:300px;min-height:170px;border:1px solid " + TH.hairline + ";border-radius:10px;padding:.9rem 1rem;font:inherit;font-size:.88rem;line-height:1.6}" +
    "#consult-live .co-side{flex:1 1 240px;min-width:230px}" +
    "#consult-live .co-btn{border:none;border-radius:999px;padding:.42rem 1rem;font:inherit;font-weight:800;background:" + TH.accent + ";color:#fff;cursor:pointer;margin:.15rem .3rem .15rem 0}" +
    "#consult-live .co-btn:hover{background:" + TH.deep + "}" +
    "#consult-live .co-btn.warn{background:" + TH.warm + ";color:" + TH.warmInk + "}" +
    "#consult-live .co-btn.danger{background:" + TH.red + "}" +
    "#consult-live .co-score{display:flex;align-items:baseline;gap:.6rem;margin:.5rem 0}" +
    "#consult-live .co-score b{font-size:2.4rem;font-weight:800;color:" + TH.deep + ";line-height:1}" +
    "#consult-live .co-score b.bad{color:" + TH.red + "}" +
    "#consult-live .co-score span{font-size:.75rem;color:" + TH.muted + ";font-weight:700;text-transform:uppercase;letter-spacing:.05em}" +
    "#consult-live .co-meter{height:10px;border-radius:999px;background:" + TH.hairline + ";overflow:hidden;margin-bottom:.7rem}" +
    "#consult-live .co-meter i{display:block;height:100%;background:" + TH.accent + ";transition:width .3s}" +
    "#consult-live .co-meter i.bad{background:" + TH.red + "}" +
    "#consult-live table{width:100%;border-collapse:collapse;font-size:.8rem}" +
    "#consult-live th{font-size:.66rem;text-transform:uppercase;letter-spacing:.05em;color:" + TH.muted + ";text-align:left;padding:.25rem .4rem;border-bottom:1px solid " + TH.hairline + "}" +
    "#consult-live td{padding:.3rem .4rem;border-bottom:1px solid " + TH.hairline + "}" +
    "#consult-live td.g{color:" + TH.green + ";font-weight:700}" +
    "#consult-live td.b{color:" + TH.red + ";font-weight:700}" +
    "#consult-live .co-read{margin-top:.7rem;font-size:.85rem;color:" + TH.ink + ";border-left:3px solid " + TH.warm + ";padding:.5rem .8rem;background:" + TH.warmTint + ";border-radius:0 8px 8px 0}" +
    "#consult-live .co-alarm{margin-top:.7rem;font-size:.86rem;font-weight:700;color:" + TH.red + ";border:1.5px solid " + TH.redSoft + ";padding:.6rem .8rem;background:" + TH.redTint + ";border-radius:10px}" +
    "#consult-live .co-rail{font-size:.73rem;color:" + TH.muted + ";margin-top:.8rem;padding-top:.55rem;border-top:1px dashed " + TH.hairline + "}";
  document.head.appendChild(style);

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  var hints = {
    storyline: "Each lever rewrites the exec summary; the score is re-measured from the actual text every time (the meters never lie about what is on the page). Climb the ladder, read WHY each move pays.",
    deck: "Two ways to use AI on the same summary. Press both and read the measure table - especially the client-anchors row. Fluent is not the same as specific.",
    confidential: "This draft would score in the 90s on craft. Read the alarm before you admire the prose. Then anonymize and watch the gate open.",
    capstone: "The whole storyline ladder in four presses - then paste your OWN summary in the box and let the same measures grade it. The scorer does not know you; that is the point."
  };
  mount.innerHTML = "";
  mount.appendChild(el("p", "co-hint", hints[MODE] || hints.storyline));
  var row = el("div", "co-row"); mount.appendChild(row);
  var doc = el("div", "co-doc"); row.appendChild(doc);
  var side = el("div", "co-side"); row.appendChild(side);
  var scoreBox = el("div"); side.appendChild(scoreBox);
  var read = el("div", "co-read", "Load a draft to begin.");
  mount.appendChild(read);
  mount.appendChild(el("div", "co-rail",
    "Honesty rail: the drafts are scripted teaching rewrites, but every score is computed live from the text shown (or pasted) - the measures are real pattern checks, and they run in your browser only. Nothing you paste leaves this page."));

  function labelFor(k) { return { answer: "Answer-first opening", quant: "Quantified support", sowhat: "So-what density", weasel: "Weasel-word discipline", anchor: "Client anchors", len: "Length discipline" }[k]; }
  function maxFor(k) { return { answer: 20, quant: 20, sowhat: 15, weasel: 15, anchor: 15, len: 15 }[k]; }

  function render(text, note) {
    var m = score(text);
    doc.textContent = text;
    doc.className = "co-doc" + (m.leaks.length ? " leak" : "");
    scoreBox.innerHTML = "";
    var sc = el("div", "co-score");
    sc.appendChild(el("b", m.leaks.length ? "bad" : "", String(m.total)));
    sc.appendChild(el("span", null, "of 100"));
    scoreBox.appendChild(sc);
    var meter = el("div", "co-meter"); var bar = el("i", m.leaks.length ? "bad" : "");
    bar.style.width = m.total + "%"; meter.appendChild(bar); scoreBox.appendChild(meter);
    var t = el("table");
    t.innerHTML = "<tr><th>measure</th><th>pts</th></tr>";
    ["answer", "quant", "sowhat", "weasel", "anchor", "len"].forEach(function (k) {
      var tr = document.createElement("tr");
      var cls = m[k] >= maxFor(k) * .8 ? "g" : (m[k] <= maxFor(k) * .3 ? "b" : "");
      tr.innerHTML = "<td>" + labelFor(k) + "</td><td class='" + cls + "'>" + m[k] + " / " + maxFor(k) + "</td>";
      t.appendChild(tr);
    });
    var extra = document.createElement("tr");
    extra.innerHTML = "<td style='color:" + TH.muted + "'>words " + m.words + " · weasels " + m.weaselCount + " · anchors " + m.anchorCount + "</td><td></td>";
    t.appendChild(extra);
    scoreBox.appendChild(t);
    var old = mount.querySelector(".co-alarm"); if (old) old.remove();
    if (m.leaks.length) {
      var al = el("div", "co-alarm", "⛔ CONFIDENTIALITY GATE - score capped at 15 regardless of craft (" + m.rawTotal + " on prose alone). Found: " + m.leaks.map(function (l) { return l.label; }).join("; ") + ". This text never enters a prompt, a deck, or an email outside the team.");
      mount.insertBefore(al, read);
    }
    read.innerHTML = note || "";
    return m;
  }

  function btn(label, cls, fn) { var b = el("button", "co-btn" + (cls ? " " + cls : ""), label); b.onclick = fn; side.insertBefore(b, scoreBox); return b; }

  if (MODE === "storyline") {
    btn("0 · The intern's draft", null, function () { render(D.intern,
      "<b>The floor.</b> No answer in the first line, zero numbers, four weasels, and only one client anchor. This is what 'sounds like strategy' looks like to a scorer that only reads what is on the page."); });
    btn("1 · Answer first", null, function () { render(D.answerFirst,
      "<b>The governing thought lands:</b> a recommendation verb plus real numbers in line one. Minto's rule - the answer goes first, the support follows. The bullets are still fluff; the opening no longer is."); });
    btn("2 · Quantify every claim", null, function () { render(D.quantified,
      "<b>Every bullet now carries a number</b> - 62%, 94% vs 71%, $38-45. Notice the weasel count collapsed too: vague words die naturally when a number takes their seat."); });
    btn("3 · So-what every bullet", null, function () { render(D.sowhat,
      "<b>Each fact now ends in a consequence</b> - 'which means', 'so'. A fact without a so-what is homework the partner has to finish; these bullets finish it themselves."); });
    btn("4 · Anchor to the client", null, function () { render(D.anchored,
      "<b>Ceiling reached.</b> Cadence named, the pilot-to-procurement mechanics visible, the bottleneck called. This summary could open Northbridge's readout tomorrow - and every point of the climb is measurable on the page."); });
  }

  if (MODE === "deck") {
    btn("✨ Let AI write it all", "warn", function () { var m = render(D.aiSlop,
      "<b>Read it aloud - it flows beautifully.</b> Now read the table: client anchors 0 of 15, quantified support 0, weasel count " + score(D.aiSlop).weaselCount + ". Fluency without specifics is the regression-to-average trap: this paragraph fits every company on earth, which is exactly why it helps none of them. The measures cannot be charmed."); });
    btn("🤝 AI drafts, consultant owns", null, function () { render(D.anchored,
      "<b>Same tools, different contract:</b> AI accelerates the draft, the consultant supplies the client's numbers, the so-whats, and the judgment - then signs it. The score difference against the slop button is the entire argument of this session, computed live."); });
  }

  if (MODE === "confidential") {
    btn("Load the leaky draft", "danger", function () { render(D.leaky,
      "<b>Craft-wise this is a 90s draft</b> - answer first, quantified, so-whats. The gate does not care. Client names, a person's name, an unreleased contract value, board material: any ONE of these in a prompt to a consumer tool is a Samsung-shaped incident."); });
    btn("🧹 Anonymize, then use", null, function () { render(D.anonymized,
      "<b>Gate open, score restored.</b> 'A major financial-services prospect in late-stage talks' carries the analytical weight without the identity. Anonymize-then-prompt is the working pattern; enterprise-tier tools with no-training contracts are the architectural one. You need both."); });
  }

  if (MODE === "capstone") {
    btn("1 · Intern draft", null, function () { render(D.intern, "<b>The floor</b> - vague, unanchored, weasel-dense."); });
    btn("2 · Answer + numbers", null, function () { render(D.quantified, "<b>Governing thought + quantified bullets</b> - the structural moves."); });
    btn("3 · So-what + anchors", null, function () { render(D.anchored, "<b>The ceiling</b> - consequences drawn, client named, bottleneck called."); });
    var ta = document.createElement("textarea");
    ta.placeholder = "Paste YOUR exec summary here (first line = your governing thought, then 3 bullets)...";
    row.insertBefore(ta, side);
    doc.style.display = "none";
    btn("📏 Score my draft", "warn", function () {
      doc.style.display = "none";
      var m = score(ta.value || "");
      /* render against the textarea content without replacing it */
      var fake = ta.value || "";
      doc.textContent = fake;
      var msg;
      if (!fake.trim()) msg = "Paste something first - the scorer only reads what exists.";
      else if (m.leaks.length) msg = "<b>Gate closed on your own text.</b> Fix the leak before admiring the craft.";
      else if (m.total >= 80) msg = "<b>" + m.total + " - readout-grade.</b> Check the table for the last points: usually anchors or so-whats.";
      else if (m.total >= 50) msg = "<b>" + m.total + " - solid skeleton.</b> The table shows where the points are hiding: quantify the naked claims, end each bullet in a consequence.";
      else msg = "<b>" + m.total + " - intern territory.</b> Answer first with a number, then rebuild each bullet as fact + so-what.";
      /* score the textarea text */
      var mm = render(fake || " ", msg);
      doc.style.display = "none";
    });
    read.innerHTML = "Walk the three presses, then paste your own.";
  }

  /* auto-load the first state per mode */
  var first = side.querySelector(".co-btn"); if (first && MODE !== "capstone") first.click();
})();
