(() => {
  if (window.__tiLoaded) return;
  window.__tiLoaded = true;

  // ── Constants ──────────────────────────────────────────────────────────────
  const MIN_WORDS    = 25;
  const MAX_BLOCKS   = 30;
  const FIELD_TYPES  = 'input[type="text"],input[type="email"],input[type="tel"],input[type="search"],input[type="url"],textarea,input:not([type])';

  // ── State ──────────────────────────────────────────────────────────────────
  let textResults  = [];   // analyzed page text blocks
  let fieldResults = [];   // analyzed form fields
  let fieldCounter = 0;

  // ── On load: scan text blocks immediately ──────────────────────────────────
  setTimeout(scanTextBlocks, 800);

  // ── Watch for dynamic form fields ─────────────────────────────────────────
  document.querySelectorAll(FIELD_TYPES).forEach(attachField);
  new MutationObserver(muts => {
    muts.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType !== 1) return;
      if (n.matches?.(FIELD_TYPES)) attachField(n);
      n.querySelectorAll?.(FIELD_TYPES).forEach(attachField);
    }));
  }).observe(document.body, { childList: true, subtree: true });

  // ══════════════════════════════════════════════════════════════════════════
  //  TEXT BLOCK ANALYSIS
  // ══════════════════════════════════════════════════════════════════════════

  function scanTextBlocks() {
    textResults = [];
    const blocks = gatherBlocks();
    blocks.forEach((b, i) => {
      const r = analyzeText(b.text, b.words);
      textResults.push({
        type: "text",
        index: i,
        excerpt: b.text.trim().slice(0, 90).replace(/\s+/g, " ") + "…",
        tag: b.el.tagName.toLowerCase(),
        ...r,
      });
    });
  }

  function gatherBlocks() {
    const TAGS = ["article", "p", "blockquote", "section", "li", "h1", "h2", "h3", "div"];
    const seenEl  = new Set();
    const seenTxt = new Set();
    const out = [];

    for (const tag of TAGS) {
      for (const el of document.querySelectorAll(tag)) {
        if (seenEl.has(el)) continue;
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;

        const text = getDirectText(el);
        const words = text.trim().split(/\s+/).filter(Boolean);
        if (words.length < MIN_WORDS) continue;
        if (seenTxt.has(text)) continue;

        seenEl.add(el);
        seenTxt.add(text);
        out.push({ el, text, words });
        if (out.length >= MAX_BLOCKS) return out;
      }
    }
    return out;
  }

  function getDirectText(el) {
    let t = "";
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) t += node.textContent;
      else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        if (!["p","div","section","article","blockquote"].includes(tag))
          t += node.textContent;
      }
    }
    return t.trim() || el.innerText?.trim() || "";
  }

  // ── AI vs Human linguistic detection ──────────────────────────────────────
  function analyzeText(text, words) {
    const signals = [];
    let aiScore = 0, humanScore = 0;
    const lower = text.toLowerCase();
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    // 1. Sentence length uniformity
    if (sentences.length >= 4) {
      const lens = sentences.map(s => s.trim().split(/\s+/).length);
      const mean = lens.reduce((a,b)=>a+b,0)/lens.length;
      const cv   = Math.sqrt(lens.reduce((s,v)=>s+(v-mean)**2,0)/lens.length) / mean;
      if (cv < 0.20) { aiScore += 22; signals.push({ text: "Uniform sentence lengths", side: "ai" }); }
      else if (cv > 0.45) { humanScore += 15; signals.push({ text: "Natural sentence variation", side: "human" }); }
    }

    // 2. AI filler phrases
    const aiPhrases = [
      "in conclusion","to summarize","it is worth noting","it is important to note",
      "furthermore","moreover","in today's","in the realm of","dive into","delve into",
      "as an ai","as a language model","certainly!","absolutely!","great question",
      "in this article, we will","let's explore","it's crucial","it's essential",
      "shed light on","in the world of","first and foremost","last but not least",
      "in summary","needless to say","on the other hand","a testament to",
    ];
    const found = aiPhrases.filter(p => lower.includes(p));
    if (found.length >= 2) { aiScore += 15 + found.length*4; signals.push({ text: `AI phrases: "${found.slice(0,2).join('", "')}"`, side: "ai" }); }
    else if (found.length === 1) { aiScore += 8; signals.push({ text: `AI phrase: "${found[0]}"`, side: "ai" }); }

    // 3. Hedging language
    const hedges = ["however","although","nevertheless","nonetheless","consequently","therefore","thus","hence","subsequently"];
    const hCount = hedges.filter(w => lower.includes(w)).length;
    if (hCount >= 4) { aiScore += 18; signals.push({ text: `Heavy hedging (${hCount} words)`, side: "ai" }); }
    else if (hCount === 0 && words.length > 80) { humanScore += 8; signals.push({ text: "No excessive hedging", side: "human" }); }

    // 4. Passive voice
    const passiveRatio = (text.match(/\b(is|are|was|were|be|been)\s+\w+ed\b/gi)||[]).length / sentences.length;
    if (passiveRatio > 0.6) { aiScore += 14; signals.push({ text: `High passive voice (${passiveRatio.toFixed(1)}x/sentence)`, side: "ai" }); }

    // 5. Punctuation diversity
    const punctScore = [/—|–/.test(text), /\.{3}|…/.test(text), /\(.*?\)/.test(text), /!/.test(text)].filter(Boolean).length;
    if (punctScore >= 2) { humanScore += 12; signals.push({ text: "Rich punctuation variety", side: "human" }); }
    else if (punctScore === 0 && words.length > 100) { aiScore += 10; signals.push({ text: "Flat punctuation", side: "ai" }); }

    // 6. First-person voice
    const fpCount = (text.match(/\b(I|I'm|I've|I'll|I'd|my|me)\b/g)||[]).length;
    const fpRatio  = fpCount / words.length;
    if (fpRatio > 0.04) { humanScore += 16; signals.push({ text: "Strong first-person voice", side: "human" }); }
    else if (fpRatio < 0.005 && words.length > 80) { aiScore += 10; signals.push({ text: "Impersonal / no first-person", side: "ai" }); }

    // 7. Vocabulary diversity (TTR)
    const ttr = new Set(words.map(w=>w.toLowerCase().replace(/[^a-z]/g,""))).size / words.length;
    if (ttr < 0.45 && words.length > 80) { aiScore += 12; signals.push({ text: `Low vocab diversity (TTR ${ttr.toFixed(2)})`, side: "ai" }); }
    else if (ttr > 0.72) { humanScore += 10; signals.push({ text: `Rich vocabulary (TTR ${ttr.toFixed(2)})`, side: "human" }); }

    // 8. Contractions
    const contrRatio = (text.match(/\b\w+'\w+\b/g)||[]).length / sentences.length;
    if (contrRatio > 0.8) { humanScore += 12; signals.push({ text: "Natural contractions", side: "human" }); }
    else if (contrRatio < 0.1 && words.length > 60) { aiScore += 10; signals.push({ text: "No contractions (formal style)", side: "ai" }); }

    // 9. Avg word length
    const awl = words.reduce((s,w)=>s+w.replace(/[^a-zA-Z]/g,"").length,0)/words.length;
    if (awl > 5.8) { aiScore += 8; signals.push({ text: `Long avg word (${awl.toFixed(1)} chars)`, side: "ai" }); }
    else if (awl < 4.2) { humanScore += 8; signals.push({ text: `Short casual words (${awl.toFixed(1)} chars)`, side: "human" }); }

    // 10. Numbered structure
    const numLines = (text.match(/^\s*\d+[\.\)]/gm)||[]).length;
    if (numLines >= 3) { aiScore += 10; signals.push({ text: `Numbered list (${numLines} points)`, side: "ai" }); }

    // ── Verdict ────────────────────────────────────────────────────────────
    const total = aiScore + humanScore;
    let verdict, confidence;
    if (total === 0) { verdict = "unclear"; confidence = 40; }
    else {
      const r = aiScore / total;
      if      (r >= 0.62) { verdict = "ai";    confidence = Math.round(50 + r * 44); }
      else if (r <= 0.38) { verdict = "human"; confidence = Math.round(50 + (1-r) * 44); }
      else                { verdict = "mixed"; confidence = Math.round(35 + Math.abs(r-0.5)*50); }
    }
    return { verdict, confidence: Math.min(confidence, 96), signals, aiScore, humanScore };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  FORM FIELD ANALYSIS
  // ══════════════════════════════════════════════════════════════════════════

  function attachField(el) {
    if (el._tiAttached) return;
    el._tiAttached = true;
    const id = `tf-${++fieldCounter}`;
    el._tiId = id;

    const state = {
      id,
      label: getFieldLabel(el),
      keystrokes: [],
      pasteEvents: [],
      dragEvents: [],
      focusAt: null,
      totalFocus: 0,
      snapshots: [],
      snapTimer: null,
    };

    el.addEventListener("focus", () => {
      state.focusAt = Date.now();
      state.snapTimer = setInterval(() => state.snapshots.push({ t: Date.now(), len: el.value.length }), 100);
    });

    el.addEventListener("blur", () => {
      if (state.focusAt) { state.totalFocus += Date.now() - state.focusAt; state.focusAt = null; }
      clearInterval(state.snapTimer);
      if (el.value.trim().length > 0) {
        const result = analyzeField(state, el.value);
        const existing = fieldResults.findIndex(f => f.id === id);
        const entry = { type: "field", id, label: state.label, value: el.value, ...result };
        if (existing >= 0) fieldResults[existing] = entry;
        else fieldResults.push(entry);
      }
    });

    el.addEventListener("keydown", e => state.keystrokes.push({ t: Date.now(), key: e.key }));
    el.addEventListener("paste",   e => state.pasteEvents.push({ t: Date.now(), len: (e.clipboardData?.getData("text")||"").length }));
    el.addEventListener("drop",    e => { const t = e.dataTransfer?.getData("text")||""; if (t) state.dragEvents.push({ t: Date.now(), len: t.length }); });
  }

  function getFieldLabel(el) {
    if (el.placeholder) return el.placeholder;
    if (el.id) { const l = document.querySelector(`label[for="${el.id}"]`); if (l) return l.innerText.trim().slice(0,40); }
    return el.name || el.type || "field";
  }

  function analyzeField(state, value) {
    const signals = [];
    let pasteScore = 0, typeScore = 0;
    const totalLen = value.length;

    // Paste events
    const pastedChars = state.pasteEvents.reduce((s,p)=>s+p.len,0);
    const pasteFrac = totalLen > 0 ? pastedChars/totalLen : 0;
    if (state.pasteEvents.length > 0) {
      const pts = Math.min(50, pasteFrac*60);
      pasteScore += pts;
      signals.push({ text: `${state.pasteEvents.length} paste event(s) — ${Math.round(pasteFrac*100)}% of content`, side: "pasted" });
    }

    // Drag-drop
    if (state.dragEvents.length > 0) {
      pasteScore += 40;
      signals.push({ text: "Drag-and-drop detected", side: "pasted" });
    }

    // Typing speed + variance
    const typedKeys = state.keystrokes.filter(k=>k.key.length===1);
    if (typedKeys.length >= 3) {
      const intervals = [];
      for (let i=1;i<typedKeys.length;i++) {
        const g = typedKeys[i].t - typedKeys[i-1].t;
        if (g>0&&g<5000) intervals.push(g);
      }
      if (intervals.length > 1) {
        const avg = intervals.reduce((a,b)=>a+b,0)/intervals.length;
        const wpm = Math.round(60000/avg/5);
        const mean=avg, cv=Math.sqrt(intervals.reduce((s,v)=>s+(v-mean)**2,0)/intervals.length)/mean;
        if (wpm>220 && state.pasteEvents.length===0) {
          pasteScore += 35; signals.push({ text: `Suspicious speed: ~${wpm} WPM`, side: "pasted" });
        } else if (wpm>=20&&wpm<=200&&cv>0.3) {
          typeScore += 25; signals.push({ text: `Natural typing: ~${wpm} WPM`, side: "typed" });
        } else if (cv<0.15&&intervals.length>4) {
          pasteScore += 20; signals.push({ text: `Robotic uniform timing (CV=${cv.toFixed(2)})`, side: "pasted" });
        }
      }
    } else if (totalLen>10 && typedKeys.length<3) {
      pasteScore += 30; signals.push({ text: `${totalLen} chars, only ${typedKeys.length} keystrokes`, side: "pasted" });
    }

    // Time-to-fill
    const msPerChar = totalLen>0 ? state.totalFocus/totalLen : 0;
    if (totalLen>15 && state.totalFocus<600 && state.pasteEvents.length===0) {
      pasteScore += 30; signals.push({ text: `${totalLen} chars in ${state.totalFocus}ms`, side: "pasted" });
    } else if (msPerChar>80&&msPerChar<2000&&totalLen>5) {
      typeScore += 15; signals.push({ text: `${Math.round(msPerChar)}ms per char (human range)`, side: "typed" });
    }

    // Value growth jump
    if (state.snapshots.length>=3) {
      let maxJump=0;
      for (let i=1;i<state.snapshots.length;i++) maxJump=Math.max(maxJump, state.snapshots[i].len-state.snapshots[i-1].len);
      if (maxJump>15&&state.pasteEvents.length===0) { pasteScore+=25; signals.push({ text:`Content jumped +${maxJump} chars instantly`, side:"pasted" }); }
      else if (maxJump<=3&&typedKeys.length>5)       { typeScore+=10;  signals.push({ text:"Gradual character-by-character growth", side:"typed" }); }
    }

    // Keystroke-to-content ratio
    const allKeys = state.keystrokes.filter(k=>k.key.length===1||k.key==="Backspace"||k.key==="Delete");
    const ratio = totalLen>0 ? allKeys.length/totalLen : 0;
    if (ratio>=0.7&&allKeys.length>5)   { typeScore+=20;  signals.push({ text:`Key/char ratio ${ratio.toFixed(2)} (typed)`, side:"typed" }); }
    else if (ratio<0.1&&totalLen>10)    { pasteScore+=20; signals.push({ text:`Key/char ratio ${ratio.toFixed(2)} (too low)`, side:"pasted" }); }

    // Verdict
    const total=pasteScore+typeScore;
    let verdict, confidence;
    if (total===0) { verdict="typed"; confidence=50; }
    else {
      const r=pasteScore/total;
      if (r>=0.65)      { verdict="pasted"; confidence=Math.round(50+r*45); }
      else if (r<=0.35) { verdict="typed";  confidence=Math.round(50+(1-r)*45); }
      else              { verdict="mixed";  confidence=Math.round(40+Math.abs(r-0.5)*60); }
    }
    return { verdict, confidence: Math.min(confidence, 97), signals };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  MESSAGE BRIDGE
  // ══════════════════════════════════════════════════════════════════════════
  chrome.runtime.onMessage.addListener((msg, _, reply) => {
    if (msg.type === "GET_ALL") {
      reply({ textResults, fieldResults });
    }
    if (msg.type === "RESCAN") {
      scanTextBlocks();
      setTimeout(() => reply({ textResults, fieldResults }), 900);
    }
    return true;
  });
})();
