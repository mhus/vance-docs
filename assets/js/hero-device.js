/* Hero device on the landing page — a small looping think-process (stays English).
   Each run mirrors a real walk-through or feature page; the whole card —
   engine, assignment, scope, link — swaps per run, then the log types. */
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var log = document.getElementById("log");
  var pill = document.getElementById("pill");
  var pillText = document.getElementById("pill-text");
  if (!log) return;

  var engineEl = document.getElementById("engine");
  var assignEl = document.getElementById("assignment");
  var scopeEl  = document.getElementById("scope");
  var device   = document.getElementById("device");

  var runs = [
    {
      engine: "marvin",
      assignment: "“Research the properties of iron”",
      scope: 'project <span class="doc">iron-research</span> · session <span class="doc">#a77e</span>',
      href: "/howtos/uc-iron/",
      steps: [
        { g: "plan",  html: "decompose into 5 areas" },
        { g: "spawn", html: '<span class="doc">web-research</span> · sources' },
        { g: "tool",  html: "research_investigate ✓" },
        { g: "write", html: 'report + <span class="doc">mindmap</span>', caret: true },
        { g: "done",  html: '<span class="ok">✓ report · sources cited</span>', ok: true }
      ]
    },
    {
      engine: "wowbagger",
      assignment: "“Tag every support ticket from Q3”",
      scope: 'project <span class="doc">support-triage</span> · run <span class="doc">#w19c</span>',
      href: "/agents/#bulk",
      steps: [
        { g: "check", html: "wowbagger_check · 4,812 records ✓" },
        { g: "pool",  html: "8 workers · <span class=\"doc\">zem</span> + light-llm" },
        { g: "chunk", html: "published 31 / 49", caret: true },
        { g: "wake",  html: "progress · 3 retried, 0 lost" },
        { g: "done",  html: '<span class="ok">✓ 4,812 tagged · cost report</span>', ok: true }
      ]
    },
    {
      engine: "arthur",
      assignment: "“Size up Apple (AAPL)”",
      scope: 'project <span class="doc">market-analysis</span> · session <span class="doc">#ca54</span>',
      href: "/howtos/uc-stock/",
      steps: [
        { g: "find",  html: "research_search · yearly prices" },
        { g: "chart", html: '<span class="doc">candlestick</span> 2015–2025' },
        { g: "think", html: "assess trend + valuation", caret: true },
        { g: "done",  html: '<span class="ok">✓ grounded verdict</span>', ok: true }
      ]
    },
    {
      engine: "trillian",
      assignment: "“Claude Code asks: what’s still open?”",
      scope: 'door <span class="doc">agents MCP</span> · hub <span class="doc">release-desk</span>',
      href: "/connect/#doors",
      steps: [
        { g: "door",  html: "OAuth ✓ · gate admits" },
        { g: "head",  html: "conversation head #2" },
        { g: "read",  html: '<span class="doc">release-notes</span> · issues', caret: true },
        { g: "done",  html: '<span class="ok">✓ answered · idle close</span>', ok: true }
      ]
    },
    {
      engine: "zaphod",
      assignment: "“Stress-test the pitch”",
      scope: 'project <span class="doc">got-talent</span> · session <span class="doc">#3efa</span>',
      href: "/howtos/uc-talent/",
      steps: [
        { g: "spawn", html: "4 persona heads" },
        { g: "poll",  html: "verdicts · 4 / 4" },
        { g: "merge", html: "synthesise", caret: true },
        { g: "done",  html: '<span class="ok">✓ YES-IF</span>', ok: true }
      ]
    }
  ];

  function setPill(state, text) { pill.className = "pill " + state; pillText.textContent = text; }
  function loadRun(run) {
    if (engineEl) engineEl.textContent = run.engine;
    if (assignEl) assignEl.innerHTML = run.assignment;
    if (scopeEl)  scopeEl.innerHTML = run.scope;
    if (device)   device.setAttribute("href", run.href);
  }
  function lineEl(s, allowCaret) {
    var line = document.createElement("div");
    line.className = "line";
    var caret = (allowCaret && s.caret) ? '<span class="caret"></span>' : "";
    line.innerHTML = '<span class="g">' + s.g.padEnd(5, " ") + '</span><span class="t">' + s.html + caret + '</span>';
    return line;
  }

  if (reduce) {
    var r0 = runs[0]; loadRun(r0); setPill("done", "DONE"); log.innerHTML = "";
    r0.steps.forEach(function (s) { log.appendChild(lineEl(s, false)); });
    return;
  }

  var r = 0, i = 0;
  function tick() {
    var run = runs[r];
    if (i === 0) { loadRun(run); log.innerHTML = ""; setPill("init", "INIT"); }
    if (i === 1) setPill("running", "RUNNING");

    log.appendChild(lineEl(run.steps[i], true));
    if (run.steps[i].ok) setPill("done", "DONE");
    i++;

    if (i < run.steps.length) {
      setTimeout(tick, 900);
    } else {
      setTimeout(function () { r = (r + 1) % runs.length; i = 0; tick(); }, 3400);
    }
  }
  setTimeout(tick, 500);
})();
