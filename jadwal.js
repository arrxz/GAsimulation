{
  const $ = (id) => document.getElementById(id);
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches,
    TAU = Math.PI * 2;
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const retrig = (el, c) => {
    el.classList.remove(c);
    void el.offsetWidth;
    el.classList.add(c);
  };
  const rnd = (k) => Math.floor(Math.random() * k);

  // ================= data =================
  const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
    TIMES = ["07:30", "10:00", "13:00", "15:30"],
    NT = 4,
    NS = 20;
  const ROOMS = [
    { id: "R301", type: "T", cap: 40 },
    { id: "R302", type: "T", cap: 40 },
    { id: "R303", type: "T", cap: 30 },
    { id: "Lab A", type: "L", cap: 40 },
    { id: "Lab B", type: "L", cap: 30 },
  ];
  const CLASSES = {
    "TI-2A": 38,
    "TI-2B": 32,
    "TI-2C": 30,
    "SI-2A": 36,
    "SI-2B": 28,
    "SI-2C": 26,
  };
  const CCOL = {
    "TI-2A": "#0a84ff",
    "TI-2B": "#5e5ce6",
    "TI-2C": "#40c8e0",
    "SI-2A": "#ff9f0a",
    "SI-2B": "#e5c100",
    "SI-2C": "#bf5af2",
  };
  const LECT = {
    Rina: { name: "Bu Rina" },
    Dedi: { name: "Pak Dedi" },
    Sari: { name: "Bu Sari" },
    Andi: { name: "Pak Andi", noDays: [0], note: "tidak bisa hari Senin" },
    Maya: {
      name: "Bu Maya",
      onlyTimes: [0, 1],
      note: "hanya bisa pagi (sebelum 13:00)",
    },
    Joko: { name: "Pak Joko", noDays: [4], note: "tidak bisa hari Jumat" },
    Hendra: { name: "Pak Hendra" },
  };
  const TI = [
    ["KB", "Kecerdasan Buatan", "Rina", "T"],
    ["PKB", "Prak. Kecerdasan Buatan", "Rina", "L"],
    ["SD", "Struktur Data", "Dedi", "T"],
    ["PSD", "Prak. Struktur Data", "Dedi", "L"],
    ["BD", "Basis Data", "Sari", "T"],
    ["JK", "Jaringan Komputer", "Andi", "L"],
    ["MD", "Matematika Diskrit", "Maya", "T"],
    ["PW", "Pemrograman Web", "Andi", "L"],
  ];
  const SI = [
    ["SIM", "Sistem Informasi Manajemen", "Joko", "T"],
    ["BD", "Basis Data", "Sari", "T"],
    ["PBD", "Prak. Basis Data", "Sari", "L"],
    ["APB", "Analisis Proses Bisnis", "Joko", "T"],
    ["STA", "Statistika", "Maya", "T"],
    ["PW", "Pemrograman Web", "Andi", "L"],
    ["EB", "E-Business", "Hendra", "T"],
  ];
  function buildSessions(level) {
    const out = [],
      CL =
        level === "ringan"
          ? ["TI-2A", "TI-2B", "SI-2A", "SI-2B"]
          : Object.keys(CLASSES),
      twice = level === "padat" ? ["KB", "SD", "SIM"] : [];
    const add = (cls, c, k) =>
      out.push({
        id: out.length,
        base: c[0],
        code: c[0] + (k > 1 ? "²" : ""),
        name: c[1] + (k > 1 ? " (pertemuan 2)" : ""),
        lect: c[2],
        type: c[3],
        cls,
        size: CLASSES[cls],
      });
    for (const cls of CL.filter((c) => c[0] === "T"))
      for (const c of TI) {
        add(cls, c, 1);
        if (twice.includes(c[0])) add(cls, c, 2);
      }
    for (const cls of CL.filter((c) => c[0] === "S"))
      for (const c of SI) {
        add(cls, c, 1);
        if (twice.includes(c[0])) add(cls, c, 2);
      }
    return out;
  }

  // ================= model =================
  function evaluate(S, ind, detail) {
    const n = S.length,
      V = detail ? [] : null;
    let hard = 0,
      soft = 0;
    const room = {},
      lec = {},
      cls = {},
      dayCls = {},
      dayLec = {};
    for (let i = 0; i < n; i++) {
      const s = ind.s[i],
        r = ind.r[i],
        x = S[i],
        d = Math.floor(s / NT),
        t = s % NT,
        R = ROOMS[r],
        L = LECT[x.lect];
      (room[s * 8 + r] = room[s * 8 + r] || []).push(i);
      (lec[s + "|" + x.lect] = lec[s + "|" + x.lect] || []).push(i);
      (cls[s + "|" + x.cls] = cls[s + "|" + x.cls] || []).push(i);
      dayCls[d + "|" + x.cls] = dayCls[d + "|" + x.cls] || [];
      dayCls[d + "|" + x.cls].push(i);
      dayLec[d + "|" + x.lect] = dayLec[d + "|" + x.lect] || [];
      dayLec[d + "|" + x.lect].push(i);
      if (x.type === "L" && R.type !== "L") {
        hard++;
        V &&
          V.push({
            h: 1,
            ids: [i],
            t: `${x.code} ${x.cls} butuh lab, tapi ditaruh di ${R.id}`,
          });
      }
      if (x.type === "T" && R.type === "L") {
        soft++;
        V &&
          V.push({
            h: 0,
            ids: [i],
            t: `${x.code} ${x.cls} (kuliah teori) memakai ${R.id}`,
          });
      }
      if (x.size > R.cap) {
        hard++;
        V &&
          V.push({
            h: 1,
            ids: [i],
            t: `${x.cls} (${x.size} mahasiswa) tidak muat di ${R.id} (${R.cap} kursi)`,
          });
      }
      if (
        (L.noDays && L.noDays.includes(d)) ||
        (L.onlyTimes && !L.onlyTimes.includes(t))
      ) {
        hard++;
        V &&
          V.push({
            h: 1,
            ids: [i],
            t: `${L.name} ${L.note}, tapi dijadwalkan ${DAYS[d]} ${TIMES[t]}`,
          });
      }
      if (d === 4 && t === 1) {
        soft++;
        V &&
          V.push({
            h: 0,
            ids: [i],
            t: `${x.code} ${x.cls} Jumat 10:00, terlalu dekat waktu salat Jumat`,
          });
      }
      if (t === 3) {
        soft++;
        V &&
          V.push({
            h: 0,
            ids: [i],
            t: `${x.code} ${x.cls} di jam terakhir (15:30)`,
          });
      }
    }
    const when = (i) => {
      const s = ind.s[i];
      return DAYS[Math.floor(s / NT)] + " " + TIMES[s % NT];
    };
    const clash = (map, fmt) => {
      for (const k in map) {
        const a = map[k];
        if (a.length > 1) {
          hard += a.length - 1;
          V && V.push({ h: 1, ids: a.slice(), t: fmt(a) });
        }
      }
    };
    clash(
      room,
      (a) =>
        `${ROOMS[ind.r[a[0]]].id} dipakai ${a.length} kelas sekaligus pada ${when(a[0])}: ${a.map((i) => S[i].code + " " + S[i].cls).join(", ")}`,
    );
    clash(
      lec,
      (a) =>
        `${LECT[S[a[0]].lect].name} harus mengajar ${a.length} kelas sekaligus pada ${when(a[0])}`,
    );
    clash(
      cls,
      (a) =>
        `${S[a[0]].cls} punya ${a.length} kuliah bersamaan pada ${when(a[0])}`,
    );
    for (const k in dayCls) {
      const a = dayCls[k];
      if (a.length > 3) {
        soft += a.length - 3;
        V &&
          V.push({
            h: 0,
            ids: a.slice(),
            t: `${k.split("|")[1]}: ${a.length} kuliah dalam sehari (${DAYS[+k.split("|")[0]]})`,
          });
      }
    }
    for (const k in dayLec) {
      const a = dayLec[k];
      if (a.length > 3) {
        soft += a.length - 3;
        V &&
          V.push({
            h: 0,
            ids: a.slice(),
            t: `${LECT[k.split("|")[1]].name}: ${a.length} kelas dalam sehari (${DAYS[+k.split("|")[0]]})`,
          });
      }
    }
    ind.hard = hard;
    ind.soft = soft;
    ind.f = hard * 10 + soft;
    if (V) {
      ind.V = V.sort((a, b) => b.h - a.h);
      const cs = new Set(),
        hs = new Set();
      for (const v of V)
        for (const i of v.ids) {
          cs.add(i);
          if (v.h) hs.add(i);
        }
      ind.cset = cs;
      ind.hset = hs;
    }
    return ind;
  }
  const randInd = (S) =>
    evaluate(
      S,
      {
        s: Int8Array.from(S, () => rnd(NS)),
        r: Int8Array.from(S, () => rnd(ROOMS.length)),
        id: ++uid,
      },
      true,
    );
  let uid = 0;
  function mutGene(c, i) {
    const m = Math.random();
    if (m < 0.45) c.s[i] = rnd(NS);
    else if (m < 0.8) c.r[i] = rnd(ROOMS.length);
    else {
      c.s[i] = rnd(NS);
      c.r[i] = rnd(ROOMS.length);
    }
  }
  function child(S, a, b, o) {
    const n = S.length,
      c = { s: new Int8Array(n), r: new Int8Array(n), id: ++uid },
      cx = Math.random() < 0.9,
      pick = {};
    for (let i = 0; i < n; i++) {
      let useB;
      if (o.block) {
        const k = S[i].cls;
        if (!(k in pick)) pick[k] = cx && Math.random() < 0.5;
        useB = pick[k];
      } else useB = cx && Math.random() < 0.5;
      const src = useB ? b : a;
      c.s[i] = src.s[i];
      c.r[i] = src.r[i];
    }
    for (let i = 0; i < n; i++) {
      const p = o.guided && a.cset.has(i) ? Math.min(0.6, o.pm * 6) : o.pm;
      if (Math.random() < p) mutGene(c, i);
    }
    return evaluate(S, c, true);
  }
  function nextGen(S, pop, o) {
    pop.sort((x, y) => x.f - y.f);
    const E = Math.min(o.e, pop.length),
      nx = pop.slice(0, E);
    const tour = () => {
      let b = null;
      for (let i = 0; i < o.k; i++) {
        const x = pop[rnd(pop.length)];
        if (!b || x.f < b.f) b = x;
      }
      return b;
    };
    while (nx.length < o.n) nx.push(child(S, tour(), tour(), o));
    return nx.sort((x, y) => x.f - y.f);
  }
  function localStep(S, cur, budget) {
    let best = null;
    for (let k = 0; k < budget; k++) {
      const c = { s: cur.s.slice(), r: cur.r.slice() },
        i = rnd(S.length);
      if (Math.random() < 0.5) c.s[i] = rnd(NS);
      else c.r[i] = rnd(ROOMS.length);
      if (Math.random() < 0.3) c.r[i] = rnd(ROOMS.length);
      evaluate(S, c);
      if (!best || c.f < best.f) best = c;
    }
    if (best.f < cur.f) {
      evaluate(S, best, true);
      best.stuck = 0;
      return best;
    }
    cur.stuck = (cur.stuck || 0) + 1;
    return cur;
  }

  // ================= state =================
  const D = { lambat: 1200, sedang: 380, cepat: 25 };
  let S = [],
    pop = [],
    ls = null,
    gen = 0,
    hist = [],
    running = false,
    busy = false,
    token = 0,
    firstLegal = 0,
    doneGen = 0,
    focus = "all",
    lastStats = {},
    hoverIds = null;
  const cfg = () => ({
    n: +$("jdN").value,
    pm: +$("jdPm").value / 1000,
    k: +$("jdK").value,
    e: +$("jdE").value,
    block: $("jdBlock").checked,
    guided: $("jdGuide").checked,
  });
  const spd = () => document.querySelector("input[name=jdspd]:checked").value;
  const sleep = (ms) =>
    new Promise((res, rej) => {
      const t = token;
      setTimeout(() => (t === token ? res() : rej(new Error("abort"))), ms);
    });
  function init() {
    S = buildSessions($("jdLvl").value);
    const c = cfg();
    pop = Array.from({ length: c.n }, () => randInd(S)).sort(
      (a, b) => a.f - b.f,
    );
    ls = randInd(S);
    ls.stuck = 0;
    gen = 1;
    hist = [];
    firstLegal = 0;
    doneGen = 0;
    record();
  }
  function record() {
    const f = pop.map((p) => p.f);
    hist.push({ b: f[0], a: f.reduce((s, v) => s + v, 0) / f.length, l: ls.f });
    if (!firstLegal && pop[0].hard === 0) firstLegal = gen;
    if (!doneGen && pop[0].f === 0) doneGen = gen;
  }
  function step() {
    pop = nextGen(S, pop, cfg());
    ls = localStep(S, ls, pop.length);
    gen++;
    record();
  }

  // ================= tampilan =================
  function buildFocus() {
    const opts = [
      ["all", "Semua"],
      ...Object.keys(CLASSES)
        .filter((k) => S.some((s) => s.cls === k))
        .map((k) => ["c:" + k, "Kelas " + k]),
      ...Object.keys(LECT).map((k) => ["l:" + k, LECT[k].name]),
      ...ROOMS.map((r, i) => ["r:" + i, "Ruang " + r.id]),
    ];
    $("jdFocus").innerHTML = opts
      .map((o) => `<option value="${o[0]}">${esc(o[1])}</option>`)
      .join("");
    $("jdFocus").value = focus = opts.some((o) => o[0] === focus)
      ? focus
      : "all";
  }
  function match(i, b) {
    if (focus === "all") return true;
    const [t, v] = focus.split(":"),
      x = S[i];
    return t === "c" ? x.cls === v : t === "l" ? x.lect === v : b.r[i] === +v;
  }
  function renderGrid() {
    const b = pop[0],
      g = $("jdGrid"),
      old = {};
    g.querySelectorAll(".ses").forEach(
      (e) => (old[e.dataset.i] = e.getBoundingClientRect()),
    );
    const cells = Array.from({ length: NS }, () => []);
    S.forEach((x, i) => cells[b.s[i]].push(i));
    let h =
      '<div class="gh"></div>' +
      DAYS.map((d) => `<div class="gh">${d}</div>`).join("");
    for (let t = 0; t < NT; t++) {
      h += `<div class="gt">${TIMES[t]}${t === 3 ? "<small>dihindari</small>" : ""}</div>`;
      for (let d = 0; d < 5; d++) {
        const s = d * NT + t,
          list = cells[s].sort((p, q) => b.r[p] - b.r[q]);
        h +=
          `<div class="cell${d === 4 && t === 1 ? " soft" : ""}" data-s="${s}">` +
          list
            .map((i) => {
              const x = S[i],
                bad = b.hset.has(i),
                warn = !bad && b.cset.has(i);
              return `<button type="button" class="ses${bad ? " bad" : ""}${warn ? " warn" : ""}${match(i, b) ? "" : " dim"}${hoverIds && hoverIds.includes(i) ? " hl" : ""}" data-i="${i}" style="--c:${CCOL[x.cls]}"><b>${esc(x.code)}</b><span>${esc(x.cls.replace("-2", ""))} · ${esc(ROOMS[b.r[i]].id)}</span></button>`;
            })
            .join("") +
          "</div>";
      }
    }
    g.innerHTML = h;
    if (RM || spd() === "cepat") return;
    g.querySelectorAll(".ses").forEach((e) => {
      const o = old[e.dataset.i];
      if (!o) return;
      const n = e.getBoundingClientRect(),
        dx = o.left - n.left,
        dy = o.top - n.top;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1)
        e.animate(
          [
            {
              transform: `translate(${dx}px,${dy}px)`,
              boxShadow: "0 8px 20px rgba(0,0,0,.45)",
            },
            { transform: "none" },
          ],
          { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" },
        );
    });
  }
  function renderViol() {
    const b = pop[0],
      V = b.V;
    $("jdVcount").textContent = `${b.hard} keras · ${b.soft} lunak`;
    $("jdViol").innerHTML = V.length
      ? V.slice(0, 60)
          .map(
            (v, k) =>
              `<li class="${v.h ? "h" : "s"}" data-k="${k}"><i></i>${esc(v.t)}</li>`,
          )
          .join("")
      : '<li class="ok">Tidak ada pelanggaran. Jadwal sempurna.</li>';
  }
  function setStat(id, val, sub) {
    const el = $(id);
    if (el.textContent !== String(val)) {
      el.textContent = val;
      if (lastStats[id] !== undefined && !RM && spd() !== "cepat")
        retrig(el.closest(".stat"), "bump");
      lastStats[id] = val;
    }
    if (sub != null) $(id + "S").innerHTML = sub;
  }
  function narrate() {
    const b = pop[0],
      c = cfg(),
      lsStuck = ls.stuck >= 6 && ls.f > 0;
    let h = "";
    if (gen <= 1)
      h = `Setiap individu adalah <b>satu jadwal lengkap</b>: ${S.length} sesi kuliah, tiap sesi punya dua gen (slot waktu dan ruang). Fitness = 10 × bentrok keras + pelanggaran lunak; makin kecil makin baik. Tekan <b>Mulai</b>.`;
    else {
      h +=
        b.f === 0
          ? `<b style="color:var(--ok)">Jadwal sempurna</b> ditemukan pada generasi ${doneGen}: tanpa bentrok dan semua preferensi terpenuhi. `
          : b.hard > 0
            ? `GA masih memperbaiki <b style="color:#ff6961">${b.hard} bentrok keras</b> (kotak merah). `
            : `Jadwal sudah <b style="color:var(--ok)">sah</b> sejak generasi ${firstLegal}; GA kini merapikan ${b.soft} pelanggaran preferensi (titik kuning). `;
      h += lsStuck
        ? `<b style="color:var(--p2)">Pencarian lokal terjebak</b> di penalti ${ls.f}: tidak ada satu perpindahan sesi yang bisa memperbaikinya, padahal masih bisa lebih baik. Untuk keluar, beberapa sesi harus dipindah sekaligus. Itulah puncak palsu. `
        : ls.f === 0
          ? "Pencarian lokal kali ini juga berhasil. "
          : `Pencarian lokal masih memperbaiki (penalti ${ls.f}). `;
      if (!c.block || !c.guided)
        h += `<br><span style="color:var(--mut)">Mode ${!c.block && !c.guided ? "GA murni" : "sebagian"}: tanpa crossover per kelas dan mutasi terarah, GA biasanya kalah dari pencarian lokal di soal penjadwalan.</span>`;
    }
    const n = $("jdNarr");
    if (n.innerHTML !== h) n.innerHTML = h;
  }
  function ui() {
    const b = pop[0];
    setStat(
      "jdGen",
      gen,
      `${pop.length} evaluasi/generasi, GA = pencarian lokal`,
    );
    setStat(
      "jdHard",
      b.hard,
      b.hard === 0
        ? `<span style="color:var(--ok)">jadwal sah${firstLegal ? " sejak gen " + firstLegal : ""}</span>`
        : "dosen/kelas/ruang bentrok, dll.",
    );
    setStat(
      "jdSoft",
      b.soft,
      b.f === 0
        ? '<span style="color:var(--ok)">semua preferensi terpenuhi</span>'
        : "jam terakhir, hari terlalu padat, dll.",
    );
    setStat(
      "jdLs",
      ls.f,
      ls.f === 0
        ? '<span style="color:var(--ok)">berhasil</span>'
        : ls.stuck >= 6
          ? `<span style="color:#ff8fa8">terjebak (${ls.hard} keras, ${ls.soft} lunak)</span>`
          : `penalti (${ls.hard} keras, ${ls.soft} lunak)`,
    );
    $("jdTitle").textContent = `Jadwal terbaik · generasi ${gen}`;
    renderGrid();
    renderViol();
    narrate();
    drawChart();
  }
  let CG = null;
  function drawChart() {
    const s = $("jdChart"),
      W = s.clientWidth,
      H = s.clientHeight;
    if (!W) return;
    const n = Math.max(hist.length, 10),
      pl = 34,
      pr = 10,
      pt = 10,
      pb = 24,
      mx = Math.max(10, ...hist.map((h) => Math.max(h.a, h.l)));
    const tr = (v) => Math.log10(1 + v),
      Xc = (i) => pl + ((W - pl - pr) * i) / (n - 1),
      Y = (v) => pt + (H - pt - pb) * (1 - tr(v) / tr(mx));
    CG = { Xc, pl, pr, W, n };
    const path = (k) =>
        hist
          .map(
            (h, i) =>
              (i ? "L" : "M") + Xc(i).toFixed(1) + " " + Y(h[k]).toFixed(1),
          )
          .join(""),
      L = hist.length - 1;
    s.innerHTML =
      [0, 10, 100, 1000]
        .filter((v) => v <= mx)
        .map(
          (v) =>
            `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${pl - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="12" fill="var(--dim)">${v}</text>`,
        )
        .join("") +
      `<text x="${W - pr}" y="${H - 6}" text-anchor="end" font-size="12" fill="var(--dim)">generasi 1–${hist.length} · skala log</text>` +
      (hist.length
        ? `<path d="${path("a")}" fill="none" stroke="var(--mut)" stroke-width="1.6" stroke-dasharray="4 3"/><path d="${path("l")}" fill="none" stroke="var(--p2)" stroke-width="2.5"/><path d="${path("b")}" fill="none" stroke="var(--ok)" stroke-width="3" stroke-linejoin="round"/><circle cx="${Xc(L)}" cy="${Y(hist[L].b)}" r="5" fill="var(--ok)" class="ping"/><circle cx="${Xc(L)}" cy="${Y(hist[L].b)}" r="4.5" fill="var(--ok)"/>`
        : "");
  }
  $("jdChartFig").addEventListener("pointermove", (e) => {
    const f = $("jdChartFig");
    if (!CG || !hist.length) return;
    const x = e.clientX - f.getBoundingClientRect().left,
      i = Math.max(
        0,
        Math.min(
          hist.length - 1,
          Math.round(((x - CG.pl) / (CG.W - CG.pl - CG.pr)) * (CG.n - 1)),
        ),
      ),
      px = CG.Xc(i),
      t = $("jdT");
    $("jdV").style.left = px + "px";
    t.textContent = `Gen ${i + 1}: GA ${hist[i].b}, lokal ${hist[i].l}, rata-rata ${hist[i].a.toFixed(1)}`;
    t.style.left =
      Math.max(0, Math.min(px - t.offsetWidth / 2, CG.W - t.offsetWidth)) +
      "px";
    f.classList.add("hov");
  });
  $("jdChartFig").addEventListener("pointerleave", () =>
    $("jdChartFig").classList.remove("hov"),
  );
  function renderData() {
    const by = {};
    for (const x of S) {
      const k = x.code + "|" + x.lect;
      (by[k] = by[k] || { x, cls: [] }).cls.push(x.cls);
    }
    $("jdData").innerHTML =
      `<table><thead><tr><th>Kode</th><th>Mata kuliah</th><th>Dosen</th><th>Jenis</th><th>Kelas</th></tr></thead><tbody>${Object.values(
        by,
      )
        .map(
          ({ x, cls }) =>
            `<tr><td><b>${esc(x.code)}</b></td><td>${esc(x.name)}</td><td>${esc(LECT[x.lect].name)}</td><td>${x.type === "L" ? "Lab" : "Teori"}</td><td>${cls.map(esc).join(", ")}</td></tr>`,
        )
        .join("")}</tbody></table>
  <p class="note" style="margin-top:8px"><b style="color:#fff">Ruang:</b> ${ROOMS.map((r) => `${r.id} (${r.type === "L" ? "lab" : "teori"}, ${r.cap} kursi)`).join(" · ")}</p>
  <p class="note"><b style="color:#fff">Kelas:</b> ${Object.keys(CLASSES)
    .filter((k) => S.some((s) => s.cls === k))
    .map((k) => `${k} (${CLASSES[k]} mhs)`)
    .join(" · ")}</p>
  <p class="note"><b style="color:#fff">Dosen:</b> ${Object.values(LECT)
    .filter((l) => l.note)
    .map((l) => `${l.name} ${l.note}`)
    .join(" · ")}</p>
  <p class="note"><b style="color:#fff">Kendala keras</b> (10 poin): bentrok ruang/dosen/kelas, praktikum harus di lab, kapasitas ruang, ketersediaan dosen. <b style="color:#fff">Kendala lunak</b> (1 poin): jam 15:30, Jumat 10:00, teori di lab, lebih dari 3 kuliah sehari.</p>`;
  }
  function legend() {
    $("jdLegend").innerHTML =
      Object.keys(CLASSES)
        .filter((k) => S.some((s) => s.cls === k))
        .map((k) => `<span><i style="background:${CCOL[k]}"></i>${k}</span>`)
        .join("") +
      '<span><i style="background:transparent;box-shadow:inset 0 0 0 2px #ff453a"></i>Bentrok keras</span><span><i style="background:#ffd60a;border-radius:50%"></i>Preferensi</span>';
  }

  // tooltip & interaksi grid
  $("jdGrid").addEventListener("pointerover", (e) => {
    const c = e.target.closest(".ses");
    const t = $("jdTip");
    if (!c) {
      return;
    }
    const i = +c.dataset.i,
      x = S[i],
      b = pop[0],
      s = b.s[i],
      vs = b.V.filter((v) => v.ids.includes(i));
    t.innerHTML =
      `<b>${esc(x.name)}</b><br>${esc(x.cls)} · ${esc(LECT[x.lect].name)} · ${x.type === "L" ? "praktikum" : "teori"}<br>${DAYS[Math.floor(s / NT)]} ${TIMES[s % NT]} · ${esc(ROOMS[b.r[i]].id)}` +
      (vs.length
        ? "<hr>" +
          vs
            .slice(0, 4)
            .map(
              (v) =>
                `<span style="color:${v.h ? "#ff8a80" : "#ffd60a"}">${esc(v.t)}</span>`,
            )
            .join("<br>")
        : "");
    const f = $("jdGridFig").getBoundingClientRect(),
      r = c.getBoundingClientRect();
    t.style.left = Math.max(4, Math.min(r.left - f.left, f.width - 260)) + "px";
    t.style.top =
      (r.bottom - f.top + 6 > f.height - 90
        ? r.top - f.top - t.offsetHeight - 6
        : r.bottom - f.top + 6) + "px";
    $("jdGridFig").classList.add("hov");
  });
  $("jdGrid").addEventListener("pointerout", (e) => {
    if (
      !e.relatedTarget ||
      !e.relatedTarget.closest ||
      !e.relatedTarget.closest(".ses")
    )
      $("jdGridFig").classList.remove("hov");
  });
  $("jdGrid").addEventListener("click", (e) => {
    const c = e.target.closest(".ses");
    if (!c) return;
    const k = "c:" + S[+c.dataset.i].cls;
    focus = focus === k ? "all" : k;
    $("jdFocus").value = focus;
    renderGrid();
  });
  $("jdFocus").addEventListener("change", () => {
    focus = $("jdFocus").value;
    renderGrid();
  });
  $("jdViol").addEventListener("pointerover", (e) => {
    const li = e.target.closest("li[data-k]");
    if (!li) return;
    hoverIds = pop[0].V[+li.dataset.k].ids;
    document
      .querySelectorAll("#jdGrid .ses")
      .forEach((s) =>
        s.classList.toggle("hl", hoverIds.includes(+s.dataset.i)),
      );
  });
  $("jdViol").addEventListener("pointerleave", () => {
    hoverIds = null;
    document
      .querySelectorAll("#jdGrid .ses.hl")
      .forEach((s) => s.classList.remove("hl"));
  });

  function confetti() {
    if (RM) return;
    const cv = $("fx"),
      x = cv.getContext("2d"),
      W = (cv.width = innerWidth),
      H = (cv.height = innerHeight),
      cols = ["#30d158", "#0a84ff", "#ff9f0a", "#bf5af2", "#ffd60a"];
    const ps = Array.from({ length: 140 }, () => ({
      x: W / 2,
      y: H * 0.3,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 12 - 4,
      r: Math.random() * 6 + 3,
      c: cols[rnd(5)],
      a: Math.random() * 6,
    }));
    const t0 = performance.now();
    const f = (t) => {
      x.clearRect(0, 0, W, H);
      ps.forEach((p) => {
        p.vy += 0.35;
        p.x += p.vx;
        p.y += p.vy;
        p.a += 0.2;
        x.save();
        x.translate(p.x, p.y);
        x.rotate(p.a);
        x.fillStyle = p.c;
        x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
        x.restore();
      });
      if (t - t0 < 2200) requestAnimationFrame(f);
      else x.clearRect(0, 0, W, H);
    };
    requestAnimationFrame(f);
  }
  function btn() {
    const p = $("jdPlay");
    p.textContent = running ? "Jeda" : gen > 1 ? "Lanjutkan" : "Mulai";
    p.classList.toggle("on", running);
    $("jdStep").disabled = busy;
  }
  async function run() {
    if (busy) return;
    const my = token;
    busy = true;
    running = true;
    btn();
    try {
      while (running && my === token) {
        const was = doneGen;
        step();
        ui();
        if (doneGen && !was) {
          running = false;
          $("jdGridCard").classList.add("done");
          confetti();
          break;
        }
        await sleep(D[spd()]);
      }
    } catch (e) {}
    if (my === token) {
      busy = false;
      running = false;
      btn();
    }
  }
  function reset() {
    token++;
    running = false;
    busy = false;
    init();
    buildFocus();
    legend();
    renderData();
    $("jdGridCard").classList.remove("done");
    ui();
    btn();
  }
  $("jdPlay").addEventListener("click", () => {
    if (running) {
      running = false;
      btn();
    } else run();
  });
  $("jdStep").addEventListener("click", () => {
    if (busy) return;
    step();
    ui();
    btn();
  });
  $("jdReset").addEventListener("click", reset);
  $("jdLvl").addEventListener("change", reset);
  ["jdBlock", "jdGuide"].forEach((id) =>
    $(id).addEventListener("change", () => narrate()),
  );
  document.querySelector("#jdTabs").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const TT = {
      jdPChart: "Penalti per generasi",
      jdPViol: "Pelanggaran jadwal terbaik",
      jdPData: "Data mata kuliah",
    };
    document
      .querySelectorAll("#jdTabs button")
      .forEach((x) => x.classList.toggle("on", x === b));
    for (const id in TT) $(id).hidden = id !== b.dataset.p;
    $("jdTabT").textContent = TT[b.dataset.p];
    retrig($(b.dataset.p), "in");
    if (b.dataset.p === "jdPChart") drawChart();
  });
  document.addEventListener("keydown", (e) => {
    if (
      window.GA_PAGE !== "jadwal" ||
      e.target.matches("input[type=text],select") ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey
    )
      return;
    if (e.key === " ") {
      e.preventDefault();
      $("jdPlay").click();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      $("jdStep").click();
    } else if (e.key === "r" || e.key === "R") reset();
  });
  const outs = {
    jdN: (v) => v,
    jdPm: (v) => (v / 10).toFixed(1) + "%",
    jdK: (v) => v,
    jdE: (v) => v,
  };
  const upd = (k) => {
    const o = $(k + "O");
    o.textContent = outs[k]($(k).value);
    retrig(o, "bump");
  };
  for (const k in outs) {
    $(k).addEventListener("input", () => upd(k));
    $(k + "O").textContent = outs[k]($(k).value);
  }
  const PRE = [
    ["Disarankan", { jdN: 80, jdPm: 15, jdK: 4, jdE: 2 }, true, true],
    ["GA murni", { jdN: 80, jdPm: 30, jdK: 3, jdE: 2 }, false, false],
    ["Tanpa mutasi", { jdN: 80, jdPm: 0, jdK: 4, jdE: 2 }, true, false],
    ["Populasi kecil", { jdN: 16, jdPm: 15, jdK: 4, jdE: 2 }, true, true],
    ["Tanpa elit", { jdN: 80, jdPm: 15, jdK: 4, jdE: 0 }, true, true],
  ];
  $("jdPre").innerHTML = PRE.map(
    (p, i) => `<button type="button" data-i="${i}">${p[0]}</button>`,
  ).join("");
  $("jdPre").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const p = PRE[+b.dataset.i];
    for (const k in p[1]) {
      $(k).value = p[1][k];
      upd(k);
    }
    $("jdBlock").checked = p[2];
    $("jdGuide").checked = p[3];
    reset();
  });
  new ResizeObserver(() => drawChart()).observe($("jdChartFig"));
  reset();
}
