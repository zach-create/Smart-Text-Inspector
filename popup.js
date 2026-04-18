let currentTab = "text";
let allData = { textResults: [], fieldResults: [] };

const listEl       = document.getElementById("list");
const toggle       = document.getElementById("toggle");
const rescanBtn    = document.getElementById("rescanBtn");
const tTextCount   = document.getElementById("tTextCount");
const tFieldCount  = document.getElementById("tFieldCount");

// ── Load settings ──────────────────────────────────────────────────────────
chrome.storage.sync.get(["enabled"], (r) => {
  const on = r.enabled !== false;
  toggle.classList.toggle("on", on);
});

toggle.addEventListener("click", () => {
  const on = toggle.classList.toggle("on");
  chrome.storage.sync.set({ enabled: on });
});

// ── Tabs ───────────────────────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    currentTab = tab.dataset.tab;
    renderList();
  });
});

// ── Rescan ─────────────────────────────────────────────────────────────────
rescanBtn.addEventListener("click", () => {
  listEl.innerHTML = `<div class="state-box"><div class="spinner"></div><div class="state-text">Rescanning…</div></div>`;
  sendToTab({ type: "RESCAN" }, (res) => {
    if (res) { allData = res; renderAll(); }
  });
});

// ── Initial load ───────────────────────────────────────────────────────────
sendToTab({ type: "GET_ALL" }, (res) => {
  if (res) { allData = res; renderAll(); }
  else {
    listEl.innerHTML = `<div class="state-box"><div class="state-icon">⚠️</div><div class="state-text">Could not connect to this page.<br>Try refreshing the tab.</div></div>`;
  }
});

// ── Render ─────────────────────────────────────────────────────────────────
function renderAll() {
  const { textResults, fieldResults } = allData;

  // Summary counts
  const tc = { human:0, ai:0, mixed:0, unclear:0 };
  textResults.forEach(r => { if(tc[r.verdict]!==undefined) tc[r.verdict]++; });
  const pasted = fieldResults.filter(f => f.verdict === "pasted").length;

  document.getElementById("cHuman").textContent  = tc.human;
  document.getElementById("cAI").textContent      = tc.ai;
  document.getElementById("cMixed").textContent   = tc.mixed + tc.unclear;
  document.getElementById("cPasted").textContent  = pasted;

  // Tab badges
  tTextCount.textContent  = textResults.length  ? `(${textResults.length})`  : "";
  tFieldCount.textContent = fieldResults.length ? `(${fieldResults.length})` : "";

  renderList();
}

function renderList() {
  const items = currentTab === "text" ? allData.textResults : allData.fieldResults;

  if (!items || items.length === 0) {
    listEl.innerHTML = `
      <div class="state-box">
        <div class="state-icon">${currentTab === "text" ? "📄" : "📝"}</div>
        <div class="state-text">${currentTab === "text"
          ? "No substantial text blocks found.<br>Try a page with articles or blog posts."
          : "No form fields detected yet.<br>Fill in a form — results appear after you leave each field."
        }</div>
      </div>`;
    return;
  }

  listEl.innerHTML = items.map(item => renderItem(item)).join("");
}

function renderItem(item) {
  const isText  = item.type === "text";
  const verdict = item.verdict;

  const pillLabel = {
    human: "Human", ai: "AI-generated", mixed: "Mixed",
    typed: "Typed", pasted: "Pasted", unclear: "Unclear",
  }[verdict] || verdict;

  const topSignals = (item.signals || []).slice(0, 3);
  const sigHtml = topSignals.map(s => `
    <span class="signal ${s.side}">${esc(s.text)}</span>`).join("");

  const labelLine = isText
    ? `<span class="item-label">&lt;${esc(item.tag)}&gt; block</span>`
    : `<span class="item-label">${esc(item.label)}</span>`;

  const excerptLine = isText
    ? `<div class="excerpt">${esc(item.excerpt)}</div>`
    : (item.value ? `<div class="excerpt">${esc(item.value.slice(0, 80))}…</div>` : "");

  return `
    <div class="item">
      <div class="item-header">
        <span class="pill ${verdict}">${pillLabel}</span>
        ${labelLine}
        <span class="item-conf">${item.confidence}%</span>
      </div>
      ${excerptLine}
      <div class="signals">${sigHtml}</div>
    </div>`;
}

// ── Utils ──────────────────────────────────────────────────────────────────
function sendToTab(msg, cb) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) { cb && cb(null); return; }
    chrome.tabs.sendMessage(tabs[0].id, msg, (res) => {
      if (chrome.runtime.lastError) { cb && cb(null); return; }
      cb && cb(res);
    });
  });
}

function esc(s) {
  return String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
