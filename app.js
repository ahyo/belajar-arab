/* Lisan – aplikasi belajar bahasa Arab (Amiyah Saudi & Fusha). Vanilla JS, tanpa build. */
(() => {
  "use strict";

  // ---------- Data ----------
  const ALL = [];
  CATEGORIES.forEach((c) => c.items.forEach((it, i) => ALL.push({ ...it, pid: `${c.key}:${i}`, cat: c })));
  const byCat = (key) => (key === "all" ? ALL : key === "star" ? ALL.filter((x) => S.known[x.pid]) : ALL.filter((x) => x.cat.key === key));

  // ---------- Storage (aman bila localStorage diblokir) ----------
  const KEY = "lisan.v1";
  const defaults = { mode: "both", known: {}, box: {}, quizBest: 0, xp: 0, streak: { last: "", count: 0 }, showTr: true };
  let S;
  try { S = { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { S = { ...defaults }; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
  const today = () => new Date().toISOString().slice(0, 10);
  function touch(xp = 1) {
    const t = today();
    if (S.streak.last !== t) {
      const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      S.streak.count = S.streak.last === y ? S.streak.count + 1 : 1;
      S.streak.last = t;
    }
    S.xp += xp;
    save();
  }

  // ---------- Helpers ----------
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const first = (s) => s.split(" / ")[0];
  const primary = () => (S.mode === "fusha" ? "fusha" : "amiyah");
  const arOf = (it, v) => (v === "fusha" ? it.fa : it.aa);
  const latOf = (it, v) => (v === "fusha" ? it.ft : it.at);
  const app = $("#app");
  let toastT;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2600);
  }

  // ---------- Suara (Text-to-Speech) ----------
  let arVoice = null;
  function pickVoice() {
    const vs = speechSynthesis.getVoices();
    arVoice = vs.find((v) => v.lang === "ar-SA") || vs.find((v) => v.lang && v.lang.startsWith("ar")) || null;
  }
  if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function say(text, rate = 0.85) {
    if (!("speechSynthesis" in window)) return toast("Browser ini belum mendukung suara.");
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(first(text));
    u.lang = "ar-SA"; u.rate = rate;
    if (arVoice) u.voice = arVoice;
    else toast("Suara Arab belum terpasang di perangkat; hasil bisa kurang tepat.");
    speechSynthesis.speak(u);
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-say]");
    if (b) { e.stopPropagation(); say(b.dataset.say, b.dataset.slow ? 0.6 : 0.85); touch(0); }
  });

  // ---------- Mode ----------
  function renderMode() {
    document.querySelectorAll(".mode button").forEach((b) => b.classList.toggle("on", b.dataset.mode === S.mode));
  }
  document.querySelectorAll(".mode button").forEach((b) =>
    b.addEventListener("click", () => { S.mode = b.dataset.mode; save(); renderMode(); route(); })
  );

  // ---------- Komponen ----------
  const variant = (it, v) => `
    <div class="v ${v}">
      <div class="head"><span class="tag">${v === "fusha" ? "Fusha · baku" : "Amiyah · Saudi"}</span>
        <button class="icon-btn" data-say="${esc(arOf(it, v))}" aria-label="Dengarkan">🔊</button></div>
      <span class="ar" lang="ar">${esc(arOf(it, v))}</span>
      <span class="lat">${esc(latOf(it, v))}</span>
    </div>`;

  function phraseCard(it) {
    const vs = S.mode === "both" ? ["amiyah", "fusha"] : [S.mode];
    return `<article class="card phrase">
      <div class="meaning"><span>${esc(it.id)}</span>
        <button class="icon-btn star ${S.known[it.pid] ? "on" : ""}" data-star="${it.pid}" aria-label="Tandai hafal" title="Tandai sudah hafal">⭐</button></div>
      <div class="variants">${vs.map((v) => variant(it, v)).join("")}</div>
      ${it.note ? `<div class="note">💡 ${esc(it.note)}</div>` : ""}
    </article>`;
  }
  app.addEventListener("click", (e) => {
    const s = e.target.closest("[data-star]");
    if (!s) return;
    const id = s.dataset.star;
    if (S.known[id]) delete S.known[id]; else { S.known[id] = 1; touch(2); }
    save(); s.classList.toggle("on", !!S.known[id]);
  });

  const catProgress = (c) => {
    const n = c.items.filter((_, i) => S.known[`${c.key}:${i}`]).length;
    return { n, pct: Math.round((n / c.items.length) * 100) };
  };

  // ---------- Halaman ----------
  function viewHome() {
    const known = Object.keys(S.known).length;
    const next = CATEGORIES.find((c) => catProgress(c).pct < 100) || CATEGORIES[0];
    app.innerHTML = `
      <section class="hero">
        <div class="bigar" aria-hidden="true">لسان</div>
        <h1>Ahlan! Siap ngobrol dengan orang Arab?</h1>
        <p>Belajar <b>Amiyah Saudi</b> (bahasa pasar di Makkah, Madinah, Jeddah) berdampingan dengan <b>Fusha</b> (bahasa baku), supaya kamu paham dan bisa menjawab.</p>
        <div class="row"><a class="btn light" href="#/materi/${next.key}">Lanjut: ${esc(next.title)} →</a>
          <a class="btn ghost" style="background:rgba(255,255,255,.15);color:#fff" href="#/kuis">Kuis cepat</a></div>
        <div class="stats">
          <div class="stat"><b>${known}/${ALL.length}</b><span>frasa hafal</span></div>
          <div class="stat"><b>🔥 ${S.streak.last === today() || S.streak.last === new Date(Date.now() - 864e5).toISOString().slice(0, 10) ? S.streak.count : 0}</b><span>hari beruntun</span></div>
          <div class="stat"><b>${S.xp}</b><span>poin XP</span></div>
        </div>
      </section>

      <div class="section"><h2>Mulai dari sini</h2>
        <div class="grid">
          <a class="card tile" href="#/pola"><div class="ic">🧩</div><h3>14 Pola Kunci Amiyah</h3><p>Perbedaan Fusha vs Amiyah yang paling sering terdengar</p></a>
          <a class="card tile" href="#/huruf"><div class="ic">🔤</div><h3>Huruf Hijaiyah</h3><p>28 huruf + cara baca versi Saudi</p></a>
          <a class="card tile" href="#/dialog"><div class="ic">🗣️</div><h3>Dialog Nyata</h3><p>Taksi, menawar, restoran, tanya jalan</p></a>
          <a class="card tile" href="#/bicara"><div class="ic">🎙️</div><h3>Latihan Bicara</h3><p>Ucapkan, lalu aplikasi menilai pelafalanmu</p></a>
        </div>
      </div>

      <div class="section"><h2>Materi per topik</h2>${catGrid()}</div>
      <p class="footer">Mode ragam di kanan atas berlaku untuk semua halaman. Progres tersimpan di browser ini.</p>`;
  }

  const catGrid = () => `<div class="grid">${CATEGORIES.map((c) => {
    const p = catProgress(c);
    return `<a class="card tile" href="#/materi/${c.key}"><div class="ic">${c.icon}</div><h3>${esc(c.title)}</h3><p>${esc(c.desc)}</p>
      <div class="bar"><i style="width:${p.pct}%"></i></div><div class="small" style="margin-top:4px">${p.n}/${c.items.length} hafal</div></a>`;
  }).join("")}</div>`;

  function viewMateri() {
    app.innerHTML = `<h1>Materi</h1><p class="sub">${ALL.length} frasa dalam ${CATEGORIES.length} topik. Ketuk ⭐ untuk menandai frasa yang sudah hafal.</p>
      <div class="chips"><a class="chip" href="#/pola">🧩 Pola Amiyah</a><a class="chip" href="#/huruf">🔤 Huruf Hijaiyah</a></div>${catGrid()}`;
  }

  function viewCategory(key) {
    const c = CATEGORIES.find((x) => x.key === key);
    if (!c) return viewMateri();
    const idx = CATEGORIES.indexOf(c);
    const nx = CATEGORIES[(idx + 1) % CATEGORIES.length];
    app.innerHTML = `
      <div class="chips">${CATEGORIES.map((x) => `<a class="chip ${x.key === key ? "on" : ""}" href="#/materi/${x.key}">${x.icon} ${esc(x.title)}</a>`).join("")}</div>
      <h1>${c.icon} ${esc(c.title)}</h1><p class="sub">${esc(c.desc)}</p>
      ${S.mode === "both" ? `<div class="legend"><span><i style="background:var(--amiyah)"></i>Amiyah: yang diucapkan orang lokal</span><span><i style="background:var(--fusha)"></i>Fusha: bahasa baku</span></div>` : ""}
      <div class="phrases ${S.mode === "both" ? "both" : ""}">${c.items.map((_, i) => phraseCard(ALL.find((a) => a.pid === `${key}:${i}`))).join("")}</div>
      <div class="row section">
        <a class="btn" href="#/flashcard?cat=${key}">🃏 Hafalkan dengan kartu</a>
        <a class="btn ghost" href="#/kuis?cat=${key}">🎯 Kuis topik ini</a>
        <span class="spacer"></span>
        <a class="btn ghost" href="#/materi/${nx.key}">${esc(nx.title)} →</a>
      </div>`;
  }

  function viewPola() {
    app.innerHTML = `<h1>🧩 Pola Kunci Amiyah</h1>
      <p class="sub">Kuasai pola-pola ini dan kamu bisa "menerjemahkan" Fusha ke bahasa pasar Saudi sendiri.</p>
      <div class="phrases">${GRAMMAR.map((g) => `<article class="card rule">
        <h3>${esc(g.title)}</h3>
        <div class="cmp"><div class="fusha" style="background:var(--fusha-bg)"><span class="tag">Fusha</span>${esc(g.fa)}</div>
        <div class="amiyah" style="background:var(--amiyah-bg)"><span class="tag">Amiyah</span>${esc(g.aa)}</div></div>
        <div class="row"><span class="ar" style="font-size:1.25rem">${esc(g.ex.split(" = ")[0])}</span>
          <span class="small">${g.ex.includes(" = ") ? "= " + esc(g.ex.split(" = ")[1]) : ""}</span>
          <span class="spacer"></span><button class="icon-btn" data-say="${esc(g.ex.split(" = ")[0].split(" · ")[0])}" aria-label="Dengarkan">🔊</button></div>
        <div class="note">${esc(g.tip)}</div></article>`).join("")}</div>`;
  }

  function viewHuruf() {
    app.innerHTML = `<h1>🔤 Huruf Hijaiyah</h1>
      <p class="sub">Ketuk huruf untuk mendengar. Catatan oranye menjelaskan perbedaan pelafalan di Saudi.</p>
      <div class="letters">${LETTERS.map(([h, n, b, c]) => `<button class="letter" data-say="${h}" data-slow="1" title="${esc(c)}">
        <span class="ar">${h}</span><b>${esc(n)}</b><small>${esc(b)}</small></button>`).join("")}</div>
      <div class="section card"><h2>Catatan pelafalan</h2>
      ${LETTERS.filter((l) => l[3]).map(([h, n, , c]) => `<div class="row" style="margin:6px 0"><span class="ar" style="font-size:1.5rem;width:30px">${h}</span><span><b>${esc(n)}</b>: ${esc(c)}</span></div>`).join("")}</div>`;
  }

  function viewDialogs(i) {
    if (i == null || !DIALOGS[i]) {
      app.innerHTML = `<h1>🗣️ Dialog</h1><p class="sub">Percakapan nyata dalam Amiyah Saudi, lengkap dengan versi Fusha-nya.</p>
        <div class="grid">${DIALOGS.map((d, k) => `<a class="card tile" href="#/dialog/${k}"><div class="ic">${d.icon}</div><h3>${esc(d.title)}</h3><p>${d.lines.length} baris</p></a>`).join("")}</div>`;
      return;
    }
    const d = DIALOGS[i];
    const v = S.mode;
    app.innerHTML = `<div class="chips">${DIALOGS.map((x, k) => `<a class="chip ${k == i ? "on" : ""}" href="#/dialog/${k}">${x.icon} ${esc(x.title)}</a>`).join("")}</div>
      <h1>${d.icon} ${esc(d.title)}</h1>
      <div class="row" style="margin-bottom:14px">
        <button class="btn" id="playall">▶ Putar semua</button>
        <button class="btn ghost" id="toggletr">${S.showTr ? "🙈 Sembunyikan arti" : "👁 Tampilkan arti"}</button>
      </div>
      <div class="chat ${S.showTr ? "" : "hidden-tr"}">${d.lines.map((l) => {
        const main = v === "fusha" ? l.fa : l.aa;
        return `<div class="bubble ${l.s === "Kamu" ? "me" : ""}">
          <div class="row"><span class="who">${esc(l.s)}</span><span class="spacer"></span><button class="icon-btn" data-say="${esc(main)}" aria-label="Dengarkan">🔊</button></div>
          <span class="ar" lang="ar">${esc(main)}</span>
          ${v !== "fusha" ? `<span class="lat">${esc(l.at)}</span>` : ""}
          ${v === "both" ? `<span class="ar fu" lang="ar">${esc(l.fa)}</span>` : ""}
          <div class="idt">${esc(l.id)}</div></div>`;
      }).join("")}</div>
      <p class="small section">${v === "both" ? "Teks biru = versi Fusha. " : ""}Tips: sembunyikan arti, lalu coba pahami dialog hanya dari suaranya. Peran "Kamu" bisa kamu latih di halaman Bicara.</p>`;
    $("#toggletr").onclick = () => { S.showTr = !S.showTr; save(); viewDialogs(i); };
    $("#playall").onclick = () => {
      if (!("speechSynthesis" in window)) return toast("Browser ini belum mendukung suara.");
      speechSynthesis.cancel();
      d.lines.forEach((l) => {
        const u = new SpeechSynthesisUtterance(v === "fusha" ? l.fa : l.aa);
        u.lang = "ar-SA"; u.rate = 0.85; if (arVoice) u.voice = arVoice;
        speechSynthesis.speak(u);
      });
      touch(1);
    };
  }

  // ---------- Flashcard (sistem kotak Leitner sederhana) ----------
  function catSelect(cur, withStar = true) {
    return `<select class="chip" id="catsel" aria-label="Pilih topik">
      <option value="all" ${cur === "all" ? "selected" : ""}>📚 Semua topik</option>
      ${withStar ? `<option value="star" ${cur === "star" ? "selected" : ""}>⭐ Yang sudah hafal (ulang)</option>` : ""}
      ${CATEGORIES.map((c) => `<option value="${c.key}" ${cur === c.key ? "selected" : ""}>${c.icon} ${esc(c.title)}</option>`).join("")}</select>`;
  }

  function viewFlashcard(q) {
    let cat = q.get("cat") || "all";
    let dir = q.get("dir") || "id"; // id: Indonesia → Arab, ar: Arab → Indonesia
    const v = primary();
    let deck = byCat(cat).slice().sort((a, b) => (S.box[a.pid] || 0) - (S.box[b.pid] || 0) || Math.random() - 0.5);
    if (!deck.length) { app.innerHTML = `<h1>🃏 Kartu Hafalan</h1><div class="chips">${catSelect(cat)}</div><div class="empty">Belum ada frasa di sini. Tandai ⭐ di halaman Materi dulu.</div>`; bindCat("flashcard", dir); return; }
    deck = deck.slice(0, 20);
    let i = 0, ok = 0;

    function draw() {
      if (i >= deck.length) {
        touch(5);
        app.innerHTML = `<h1>🃏 Selesai!</h1><div class="card empty"><div class="score">${ok}/${deck.length}</div><p>kartu kamu ingat. Kartu yang belum hafal akan muncul lebih dulu di sesi berikutnya.</p>
          <div class="row" style="justify-content:center"><button class="btn" id="again">Ulangi</button><a class="btn ghost" href="#/kuis?cat=${cat}">Lanjut kuis</a></div></div>`;
        $("#again").onclick = () => viewFlashcard(q);
        return;
      }
      const it = deck[i];
      const arSide = `<span class="tag" style="color:var(--${v})">${v === "fusha" ? "Fusha" : "Amiyah"}</span>
        <span class="ar" lang="ar">${esc(arOf(it, v))}</span><span class="lat" style="color:var(--muted);font-style:italic">${esc(latOf(it, v))}</span>
        ${S.mode === "both" ? `<span class="small" style="margin-top:8px">Fusha: <span class="ar" style="font-size:1.1rem">${esc(it.fa)}</span></span>` : ""}
        <button class="icon-btn" style="margin-top:10px" data-say="${esc(arOf(it, v))}">🔊</button>`;
      const idSide = `<span class="small">${it.cat.icon} ${esc(it.cat.title)}</span><h2 style="font-size:1.5rem;margin-top:8px">${esc(it.id)}</h2>`;
      app.innerHTML = `<h1>🃏 Kartu Hafalan</h1>
        <div class="chips">${catSelect(cat)}
          <button class="chip ${dir === "id" ? "on" : ""}" data-dir="id">Indonesia → Arab</button>
          <button class="chip ${dir === "ar" ? "on" : ""}" data-dir="ar">Arab → Indonesia</button></div>
        <p class="small" style="text-align:center">Kartu ${i + 1} dari ${deck.length} · kotak ${S.box[it.pid] || 0}/3</p>
        <div class="fc-wrap"><div class="fc" id="fc" role="button" tabindex="0" aria-label="Balik kartu">
          <div class="face front">${dir === "id" ? idSide : arSide}<span class="hint">Ketuk untuk membalik</span></div>
          <div class="face back">${dir === "id" ? arSide : idSide}${it.note ? `<div class="note" style="text-align:left">${esc(it.note)}</div>` : ""}</div>
        </div></div>
        <div class="fc-actions"><button class="btn bad" id="no">😕 Belum hafal</button><button class="btn good" id="yes">😎 Hafal</button></div>`;
      const fc = $("#fc");
      const flip = () => { fc.classList.toggle("flip"); if (fc.classList.contains("flip") && dir === "id") say(arOf(it, v)); };
      fc.onclick = flip;
      fc.onkeydown = (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); } };
      $("#yes").onclick = () => {
        S.box[it.pid] = Math.min(3, (S.box[it.pid] || 0) + 1);
        if (S.box[it.pid] >= 2) S.known[it.pid] = 1;
        ok++; i++; touch(1); draw();
      };
      $("#no").onclick = () => { S.box[it.pid] = 0; i++; save(); draw(); };
      app.querySelectorAll("[data-dir]").forEach((b) => (b.onclick = () => { location.hash = `#/flashcard?cat=${cat}&dir=${b.dataset.dir}`; }));
      bindCat("flashcard", dir);
    }
    draw();
  }
  function bindCat(page, dir) {
    const s = $("#catsel");
    if (s) s.onchange = () => { location.hash = `#/${page}?cat=${s.value}${dir ? `&dir=${dir}` : ""}`; };
  }

  // ---------- Kuis ----------
  const QTYPES = {
    id2ar: "Arti → Arab",
    ar2id: "Arab → Arti",
    f2a: "Fusha → Amiyah",
  };
  function viewKuis(q) {
    const cat = q.get("cat") || "all";
    const type = q.get("t") || "f2a";
    const pool = byCat(cat).filter((x) => type !== "f2a" || first(x.fa).replace(/[ً-ْ]/g, "") !== first(x.aa));
    app.innerHTML = `<h1>🎯 Kuis</h1>
      <div class="chips">${catSelect(cat, false)}${Object.entries(QTYPES).map(([k, l]) => `<a class="chip ${k === type ? "on" : ""}" href="#/kuis?cat=${cat}&t=${k}">${l}</a>`).join("")}</div>
      <div id="quiz"></div>`;
    bindCat("kuis", null);
    const sel = $("#catsel"); sel.onchange = () => { location.hash = `#/kuis?cat=${sel.value}&t=${type}`; };
    if (pool.length < 4) { $("#quiz").innerHTML = `<div class="empty">Topik ini terlalu sedikit untuk jenis kuis ini. Pilih topik lain.</div>`; return; }

    const v = primary();
    const qs = shuffle(pool).slice(0, 10);
    const res = [];
    let n = 0;

    function draw() {
      const box = $("#quiz");
      if (n >= qs.length) {
        const sc = res.filter(Boolean).length;
        const pct = Math.round((sc / qs.length) * 100);
        if (pct > S.quizBest) S.quizBest = pct;
        touch(sc * 2);
        box.innerHTML = `<div class="card empty q"><div class="score">${pct}%</div>
          <p>${sc} dari ${qs.length} benar. ${pct >= 80 ? "Mumtaz! ممتاز 🎉" : pct >= 50 ? "Zēn! Terus latihan 💪" : "Ulangi materinya dulu, yalla! 📚"}</p>
          <p class="small">Skor terbaik: ${S.quizBest}%</p>
          <div class="row" style="justify-content:center"><button class="btn" id="again">Kuis lagi</button><a class="btn ghost" href="#/flashcard?cat=${cat}">Kartu hafalan</a></div></div>`;
        $("#again").onclick = () => viewKuis(q);
        return;
      }
      const it = qs[n];
      const others = shuffle(ALL.filter((x) => x.pid !== it.pid && x.id !== it.id && (cat === "all" || x.cat.key === it.cat.key || pool.length < 8)));
      const opts = shuffle([it, ...others.slice(0, 3)]);
      let prompt, optHTML;
      if (type === "id2ar") {
        prompt = `<div class="small">Bagaimana mengucapkan ini dalam ${v === "fusha" ? "Fusha" : "Amiyah"}?</div><h2 style="font-size:1.5rem;margin-top:8px">${esc(it.id)}</h2>`;
        optHTML = (o) => `<span class="ar" lang="ar">${esc(arOf(o, v))}</span><span class="small">${esc(latOf(o, v))}</span>`;
      } else if (type === "ar2id") {
        prompt = `<div class="small">Apa artinya?</div><span class="ar" lang="ar">${esc(arOf(it, v))}</span><div class="lat small">${esc(latOf(it, v))}</div>
          <button class="icon-btn" data-say="${esc(arOf(it, v))}">🔊</button>`;
        optHTML = (o) => esc(o.id);
      } else {
        prompt = `<div class="small">Orang lokal biasanya mengucapkan ini bagaimana?</div><span class="ar" lang="ar" style="color:var(--fusha)">${esc(it.fa)}</span><div class="small">(${esc(it.id)})</div>`;
        optHTML = (o) => `<span class="ar" lang="ar">${esc(o.aa)}</span><span class="small">${esc(o.at)}</span>`;
      }
      box.innerHTML = `<div class="q">
        <div class="progress-dots">${qs.map((_, k) => `<i class="${k < n ? (res[k] ? "ok" : "no") : k === n ? "cur" : ""}"></i>`).join("")}</div>
        <div class="card prompt">${prompt}</div>
        <div class="opts">${opts.map((o, k) => `<button class="opt" data-k="${k}">${optHTML(o)}</button>`).join("")}</div>
        <div id="fb"></div></div>`;
      box.querySelectorAll(".opt").forEach((b) => (b.onclick = () => {
        if (box.querySelector(".opt.right")) return;
        const pick = opts[+b.dataset.k];
        const right = pick.pid === it.pid;
        res[n] = right;
        box.querySelectorAll(".opt").forEach((x) => { if (opts[+x.dataset.k].pid === it.pid) x.classList.add("right"); });
        if (!right) b.classList.add("wrong");
        const ans = type === "f2a" ? it.aa : arOf(it, v);
        say(ans);
        $("#fb").innerHTML = `<div class="card" style="margin-top:12px">
          <b>${right ? "✅ Benar!" : "❌ Kurang tepat."}</b> ${esc(it.id)}: <span class="ar" style="font-size:1.2rem">${esc(ans)}</span>
          ${it.note ? `<div class="note">${esc(it.note)}</div>` : ""}
          <div class="row" style="margin-top:10px;justify-content:flex-end"><button class="btn" id="next">Lanjut →</button></div></div>`;
        $("#next").onclick = () => { n++; draw(); };
        $("#next").focus();
      }));
    }
    draw();
  }

  // ---------- Latihan bicara (Speech Recognition) ----------
  const normAr = (s) => s
    .replace(/[ً-ٰٟـ]/g, "") // harakat & tatweel
    .replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
    .replace(/[^ء-ي ]/g, " ").replace(/\s+/g, " ").trim();
  function similarity(a, b) {
    a = normAr(a); b = normAr(b);
    if (!a.length || !b.length) return 0;
    const m = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) m[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return Math.max(0, 1 - m[a.length][b.length] / Math.max(a.length, b.length));
  }

  function viewBicara(q) {
    const cat = q.get("cat") || "all";
    const v = primary();
    const pool = byCat(cat);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    let it = pool[(Math.random() * pool.length) | 0];
    let rec = null;

    function draw(result) {
      const target = first(arOf(it, v));
      app.innerHTML = `<h1>🎙️ Latihan Bicara</h1>
        <p class="sub">Dengarkan, lalu tekan mikrofon dan ucapkan kalimatnya. ${v === "amiyah" ? "Mode Amiyah: latih logat lokal." : "Mode Fusha."}</p>
        <div class="chips">${catSelect(cat)}</div>
        <div class="card q" style="text-align:center">
          <div class="small">${it.cat.icon} ${esc(it.cat.title)}</div>
          <h2 style="margin-top:6px">${esc(it.id)}</h2>
          <span class="ar" lang="ar" style="font-size:2rem;line-height:1.8;display:block">${esc(target)}</span>
          <div class="small" style="font-style:italic">${esc(first(latOf(it, v)))}</div>
          <div class="row" style="justify-content:center;margin-top:10px">
            <button class="btn ghost" data-say="${esc(target)}">🔊 Normal</button>
            <button class="btn ghost" data-say="${esc(target)}" data-slow="1">🐢 Pelan</button></div>
          ${SR ? `<button class="mic" id="mic" aria-label="Mulai bicara">🎙️</button><div class="small" id="micst">Tekan lalu bicara</div>`
               : `<div class="note" style="text-align:left;margin-top:16px">Browser ini belum mendukung pengenalan suara. Pakai Google Chrome (Android/desktop) atau Safari terbaru untuk penilaian otomatis. Sementara itu, latih dengan cara <b>shadowing</b>: putar suara, ulangi keras-keras 3×.</div>`}
          ${result || ""}
          <div class="row" style="justify-content:center;margin-top:14px"><button class="btn" id="nextp">Frasa berikutnya →</button></div>
        </div>`;
      bindCat("bicara", null);
      $("#nextp").onclick = () => { it = pool[(Math.random() * pool.length) | 0]; draw(); };
      const mic = $("#mic");
      if (!mic) return;
      mic.onclick = () => {
        if (rec) { rec.stop(); return; }
        rec = new SR();
        rec.lang = "ar-SA"; rec.interimResults = false; rec.maxAlternatives = 5;
        mic.classList.add("rec"); $("#micst").textContent = "Mendengarkan…";
        rec.onresult = (e) => {
          const alts = Array.from(e.results[0]).map((r) => r.transcript);
          const cands = arOf(it, v).split(" / ").concat(v === "amiyah" ? [first(it.fa)] : []);
          let best = 0, heard = alts[0];
          alts.forEach((h) => cands.forEach((c) => { const s = similarity(h, c); if (s > best) { best = s; heard = h; } }));
          const pct = Math.round(best * 100);
          if (pct >= 60) { touch(3); if (pct >= 80) { S.known[it.pid] = 1; save(); } }
          draw(`<div class="card" style="margin-top:12px;background:var(--surface-2)">
            <div class="score" style="color:${pct >= 80 ? "var(--ok)" : pct >= 55 ? "var(--accent)" : "var(--bad)"}">${pct}%</div>
            <div class="small">Yang terdengar:</div><div class="heard">${esc(heard)}</div>
            <p>${pct >= 80 ? "Mumtaz! Orang lokal pasti paham 👏" : pct >= 55 ? "Hampir! Dengarkan versi pelan lalu coba lagi." : "Coba lagi pelan-pelan, perhatikan huruf tenggorokan (ع ح خ)."}</p></div>`);
        };
        rec.onerror = (e) => toast(e.error === "not-allowed" ? "Izinkan akses mikrofon dulu." : "Tidak terdengar, coba lagi.");
        rec.onend = () => { rec = null; mic.classList.remove("rec"); const st = $("#micst"); if (st) st.textContent = "Tekan lalu bicara"; };
        rec.start();
      };
    }
    draw();
  }

  // ---------- Router ----------
  function route() {
    const h = location.hash.replace(/^#\/?/, "");
    const [path, qs] = h.split("?");
    const parts = path.split("/").filter(Boolean);
    const q = new URLSearchParams(qs || "");
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    const tab = parts[0] || "home";
    document.querySelectorAll(".tabbar a").forEach((a) =>
      a.classList.toggle("on", a.dataset.tab === tab || (a.dataset.tab === "materi" && ["pola", "huruf"].includes(tab)))
    );
    switch (tab) {
      case "materi": parts[1] ? viewCategory(parts[1]) : viewMateri(); break;
      case "pola": viewPola(); break;
      case "huruf": viewHuruf(); break;
      case "dialog": viewDialogs(parts[1]); break;
      case "flashcard": viewFlashcard(q); break;
      case "kuis": viewKuis(q); break;
      case "bicara": viewBicara(q); break;
      default: viewHome();
    }
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  renderMode();
  route();
})();
