{
  const BAL = {
    tau: 0.1,
    kc: 0.3,
    M: 0.45,
    m: 0.75,
    l: 0.11,
    g: 9.81,
    Fmax: 4,
    DB: 40,
    c: 0.8,
    T: 8,
    dtP: 0.001,
    sub: 5,
  };
  const R2D = 180 / Math.PI;
  function mulberry(a) {
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gaussR(r) {
    let u = 0,
      v = 0;
    while (!u) u = r();
    while (!v) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  const decodeB = (g) => ({
    Kp: 100 * g[0],
    Ki: 10 * g[1],
    Kd: 8 * g[2],
    a: 0.8 + 0.199 * g[3],
  });
  // sc: {seed,push (deg/s), noise (x), bias (deg/s)}
  function simB(P, sc, rec) {
    const B = BAL,
      r = mulberry(sc.seed),
      bias = sc.bias * (r() < 0.5 ? -1 : 1) * (0.6 + 0.8 * r()),
      dtC = B.dtP * B.sub,
      N = Math.round(B.T / B.dtP);
    let Fm = 0,
      x = 0,
      xd = 0,
      th = ((r() < 0.5 ? -1 : 1) * 4) / R2D,
      thd = 0,
      xdd = 0,
      est = th * R2D,
      gi = th * R2D,
      I = 0,
      pwm = 0,
      acc = est,
      gy = 0,
      fell = false,
      tf = B.T,
      sT = 0,
      sU = 0,
      sX = 0,
      n = 0;
    const out = rec ? [] : null,
      pushes = [
        [2.5, 1],
        [5.5, -1],
      ];
    let pi = 0;
    for (let k = 0; k < N; k++) {
      const t = k * B.dtP;
      if (pi < pushes.length && t >= pushes[pi][0]) {
        thd += (pushes[pi][1] * sc.push) / R2D;
        pi++;
      }
      if (k % B.sub === 0 && !fell) {
        acc = (th - (B.kc * xdd) / B.g) * R2D + gaussR(r) * 1.2 * sc.noise;
        gy = thd * R2D + bias + gaussR(r) * 0.4 * sc.noise;
        est = P.a * (est + gy * dtC) + (1 - P.a) * acc;
        gi += gy * dtC;
        I = Math.max(-40, Math.min(40, I + est * dtC));
        pwm = Math.max(-255, Math.min(255, P.Kp * est + P.Ki * I + P.Kd * gy));
      }
      let Fc = fell || Math.abs(pwm) < B.DB ? 0 : (B.Fmax * pwm) / 255;
      Fm += ((Fc - Fm) * B.dtP) / B.tau;
      const F = Fm - B.c * xd,
        S = Math.sin(th),
        C = Math.cos(th),
        Mt = B.M + B.m;
      let a =
        (B.g * S - (C * (F + B.m * B.l * thd * thd * S)) / Mt) /
        (B.l * (4 / 3 - (B.m * C * C) / Mt));
      if (fell && Math.abs(th) >= 85 / R2D) {
        a = 0;
        thd = 0;
      }
      xdd = (F + B.m * B.l * (thd * thd * S - a * C)) / Mt;
      thd += a * B.dtP;
      th += thd * B.dtP;
      xd += xdd * B.dtP;
      x += xd * B.dtP;
      if (fell) xd *= 0.995;
      if (!fell) {
        sT += Math.abs(th) * R2D;
        sU += Math.abs(pwm);
        sX += Math.abs(x);
        n++;
        if (Math.abs(th) > 40 / R2D) {
          fell = true;
          tf = t;
          pwm = 0;
        }
      }
      if (rec && k % 10 === 0)
        out.push([t, x, th * R2D, est, acc, gi, pwm, fell ? 1 : 0]);
      if (fell && !rec) break;
    }
    const mT = sT / n,
      mU = sU / n,
      mX = sX / n,
      cost = mT + 0.015 * mU + mX + (fell ? 40 + 120 * (1 - tf / B.T) : 0);
    return { cost, mT, mU, mX, fell, tf, rec: out };
  }

  // ================= GA & tampilan =================
  const $ = (id) => document.getElementById(id);
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches,
    TAU = Math.PI * 2;
  const rnd = (k) => Math.floor(Math.random() * k),
    clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const gauss = () => {
    let u = 0,
      v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  };
  const retrig = (el, c) => {
    el.classList.remove(c);
    void el.offsetWidth;
    el.classList.add(c);
  };
  const D = { lambat: 2200, sedang: 700, cepat: 40 };
  let pop = [],
    gen = 0,
    hist = [],
    running = false,
    busy = false,
    token = 0,
    seeds = [11, 29],
    sel = null,
    main = null,
    minis = [],
    lastStats = {},
    manual = null,
    uid = 0;
  const cfg = () => ({
    n: +$("blN").value,
    pm: +$("blPm").value / 100,
    sg: +$("blSg").value / 100,
    e: +$("blE").value,
  });
  const scen = (seed) => ({
    seed,
    push: +$("blPush").value.split("|")[0],
    noise: +$("blNoise").value / 10,
    bias: +$("blBias").value / 10,
  });
  const spd = () => document.querySelector("input[name=blspd]:checked").value;
  const sleep = (ms) =>
    new Promise((res, rej) => {
      const t = token;
      setTimeout(() => (t === token ? res() : rej(new Error("abort"))), ms);
    });
  function evalInd(g) {
    const P = decodeB(g),
      a = simB(P, scen(seeds[0])),
      b = simB(P, scen(seeds[1]));
    return {
      g,
      P,
      id: ++uid,
      cost: (a.cost + b.cost) / 2,
      mT: (a.mT + b.mT) / 2,
      mU: (a.mU + b.mU) / 2,
      mX: (a.mX + b.mX) / 2,
      fell: a.fell || b.fell,
      tf: Math.min(a.tf, b.tf),
    };
  }
  function init() {
    seeds = $("blPush").value.split("|").slice(1).map(Number);
    const c = cfg();
    pop = Array.from({ length: c.n }, () =>
      evalInd(Array.from({ length: 4 }, Math.random)),
    ).sort((a, b) => a.cost - b.cost);
    gen = 1;
    hist = [];
    record();
    sel = null;
    manual = null;
  }
  function record() {
    const f = pop.map((p) => p.cost);
    hist.push({
      b: f[0],
      m: pop[0].mT,
      fall: pop.filter((p) => p.fell).length,
    });
  }
  function breed() {
    const c = cfg(),
      E = Math.min(c.e, pop.length),
      nx = pop.slice(0, E);
    const tour = () => {
      let b = null;
      for (let i = 0; i < 3; i++) {
        const x = pop[rnd(pop.length)];
        if (!b || x.cost < b.cost) b = x;
      }
      return b;
    };
    while (nx.length < c.n) {
      const a = tour(),
        b = tour(),
        g = a.g.map((v, i) => {
          let w =
            Math.random() < 0.9
              ? v + (Math.random() * 1.5 - 0.25) * (b.g[i] - v)
              : v;
          if (Math.random() < c.pm) w += gauss() * c.sg;
          return clamp(w, 0, 1);
        });
      nx.push(evalInd(g));
    }
    pop = nx.sort((a, b) => a.cost - b.cost);
    gen++;
    record();
    sel = null;
  }

  // ---- replay ----
  const view = (ind) => {
    let r = simB(ind.P, scen(seeds[0]), true);
    if (ind.fell && !r.fell) r = simB(ind.P, scen(seeds[1]), true);
    return { ind, rec: r.rec, res: r, t: 0, cam: 0 };
  };
  function syncViews() {
    const target = sel || pop[0];
    if (!main || main.ind !== target) {
      main = view(target);
      updCode();
      drawSensor();
    }
    for (let i = 0; i < 4; i++) {
      const p = pop[i];
      if (!p) {
        minis[i] = null;
        continue;
      }
      if (!minis[i] || minis[i].ind !== p) minis[i] = view(p);
    }
    renderMinis();
  }
  function renderMinis() {
    const box = $("blMinis");
    if (box.children.length !== 4)
      box.innerHTML = [0, 1, 2, 3]
        .map(
          (i) =>
            `<button type="button" class="mc" data-i="${i}" aria-label="Kandidat ${i + 1}"><canvas></canvas><span></span></button>`,
        )
        .join("");
    [...box.children].forEach((b, i) => {
      const p = pop[i];
      b.querySelector("span").textContent = p
        ? `#${i + 1} · ${p.fell ? "jatuh" : p.mT.toFixed(2) + "°"}`
        : "";
      b.classList.toggle("on", !!p && main && main.ind === p);
    });
  }
  $("blMinis").addEventListener("click", (e) => {
    const b = e.target.closest(".mc");
    if (!b) return;
    const p = pop[+b.dataset.i];
    if (!p) return;
    sel = p;
    syncViews();
    stats();
  });
  const T = BAL.T,
    TL = T + 1;
  function sample(v) {
    const k = Math.min(v.t, T - 0.01) / 0.01,
      i = Math.floor(k),
      f = k - i,
      a = v.rec[Math.min(i, v.rec.length - 1)],
      b = v.rec[Math.min(i + 1, v.rec.length - 1)];
    return a.map((x, j) => x + (b[j] - x) * f);
  }
  function fit2(cv) {
    const W = cv.clientWidth,
      H = cv.clientHeight,
      dpr = devicePixelRatio || 1;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
    }
    const x = cv.getContext("2d");
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    return [x, W, H];
  }
  function rr(x, X, Y, w, h, r) {
    x.beginPath();
    x.roundRect(X, Y, w, h, r);
  }
  function drawBot(x, W, H, v, big) {
    const s = sample(v),
      [t, px, th, est, , , pwm, fell] = s;
    v.cam += (px - v.cam) * 0.12;
    const sc = Math.min(
        (H * (big ? 0.62 : 0.68)) / 0.27,
        W / (big ? 1.1 : 1.2),
      ),
      y0 = H * (big ? 0.86 : 0.88),
      SX = (wx) => W / 2 + (wx - v.cam) * sc,
      R = 0.034;
    x.clearRect(0, 0, W, H);
    const gr = x.createLinearGradient(0, y0, 0, H);
    gr.addColorStop(0, "rgba(255,255,255,.07)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = gr;
    x.fillRect(0, y0, W, H - y0);
    x.strokeStyle = "rgba(255,255,255,.35)";
    x.lineWidth = 1.5;
    x.beginPath();
    x.moveTo(0, y0);
    x.lineTo(W, y0);
    x.stroke();
    const a = Math.floor((v.cam - W / 2 / sc) * 10) - 1,
      b = Math.ceil((v.cam + W / 2 / sc) * 10) + 1;
    x.font = "12px Inter";
    x.textAlign = "center";
    for (let k = a; k <= b; k++) {
      const X = SX(k / 10),
        maj = k % 5 === 0;
      x.strokeStyle = `rgba(255,255,255,${maj ? 0.32 : 0.14})`;
      x.beginPath();
      x.moveTo(X, y0);
      x.lineTo(X, y0 + (maj ? 9 : 5));
      x.stroke();
      if (big && maj) {
        x.fillStyle = "rgba(235,238,245,.45)";
        x.fillText((k / 10).toFixed(1) + " m", X, y0 + 22);
      }
    }
    {
      const X = SX(0);
      x.setLineDash([5, 4]);
      x.strokeStyle = "rgba(48,209,88,.6)";
      x.beginPath();
      x.moveTo(X, y0 - sc * 0.3);
      x.lineTo(X, y0);
      x.stroke();
      x.setLineDash([]);
    }
    const cx = SX(px),
      cy = y0 - R * sc;
    x.fillStyle = "rgba(0,0,0,.35)";
    x.beginPath();
    x.ellipse(cx, y0 + 2, sc * 0.06, sc * 0.008, 0, 0, TAU);
    x.fill();
    const ang = (th * Math.PI) / 180;
    x.save();
    x.translate(cx, cy);
    x.rotate(ang);
    const bw = 0.07 * sc,
      bh = 0.23 * sc;
    if (fell && big) {
      x.shadowColor = "rgba(255,55,95,.9)";
      x.shadowBlur = 16;
    }
    rr(x, -bw / 2, -bh, bw, bh, bw * 0.18);
    x.fillStyle = "#3a3f4b";
    x.fill();
    x.shadowBlur = 0;
    x.lineWidth = 1.5;
    x.strokeStyle = fell ? "#ff453a" : "rgba(255,255,255,.25)";
    x.stroke();
    rr(x, -bw * 0.42, -bh * 0.97, bw * 0.84, bh * 0.2, 3);
    x.fillStyle = "#2b2f38";
    x.fill();
    x.fillStyle = "#1f6f43";
    rr(x, -bw * 0.4, -bh * 0.92, bw * 0.8, bh * 0.1, 2);
    x.fill();
    rr(x, -bw * 0.44, -bh * 0.7, bw * 0.88, bh * 0.3, 3);
    x.fillStyle = "#0b5fa5";
    x.fill();
    x.fillStyle = "rgba(255,255,255,.75)";
    if (big) {
      x.font = `600 ${Math.max(9, bw * 0.17)}px Inter`;
      x.save();
      x.translate(0, -bh * 0.55);
      x.rotate(-Math.PI / 2);
      x.textAlign = "center";
      x.fillText("Arduino", 0, bw * 0.06);
      x.restore();
    }
    rr(x, -bw * 0.44, -bh * 0.36, bw * 0.88, bh * 0.13, 3);
    x.fillStyle = "#b8322a";
    x.fill();
    const mx = -bw * 0.3,
      my = -bh * 0.2,
      mw = bw * 0.6,
      mh = bh * 0.12;
    rr(x, mx, my, mw, mh, 2);
    x.fillStyle = "#4b2fa8";
    x.fill();
    x.fillStyle = "#111";
    x.fillRect(mx + mw * 0.3, my + mh * 0.25, mw * 0.4, mh * 0.5);
    if (big) {
      x.strokeStyle = "#ff453a";
      x.lineWidth = 1.6;
      x.beginPath();
      x.moveTo(mx + mw / 2, my + mh / 2);
      x.lineTo(mx + mw / 2 + bw * 0.55, my + mh / 2);
      x.stroke();
      x.strokeStyle = "#30d158";
      x.beginPath();
      x.moveTo(mx + mw / 2, my + mh / 2);
      x.lineTo(mx + mw / 2, my + mh / 2 - bh * 0.18);
      x.stroke();
      x.fillStyle = "#d9ccff";
      x.font = `600 ${Math.max(12, bw * 0.14)}px JetBrains Mono`;
      x.textAlign = "left";
      x.fillText("MPU6050", bw * 0.62, my + mh * 0.85);
    }
    x.restore();
    x.save();
    x.translate(cx, cy);
    x.rotate(px / R);
    x.beginPath();
    x.arc(0, 0, R * sc, 0, TAU);
    x.fillStyle = "#16181d";
    x.fill();
    x.lineWidth = Math.max(2, R * sc * 0.25);
    x.strokeStyle = "#2a2d34";
    x.stroke();
    x.strokeStyle = "#ffd60a";
    x.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      x.beginPath();
      x.moveTo(0, 0);
      x.lineTo(
        Math.cos((k * TAU) / 3) * R * sc * 0.62,
        Math.sin((k * TAU) / 3) * R * sc * 0.62,
      );
      x.stroke();
    }
    x.beginPath();
    x.arc(0, 0, R * sc * 0.18, 0, TAU);
    x.fillStyle = "#ffd60a";
    x.fill();
    x.restore();
    for (const [pt, dir] of [
      [2.5, 1],
      [5.5, -1],
    ])
      if (t >= pt && t < pt + 0.45) {
        const k = (t - pt) / 0.45,
          tx = cx + Math.sin(ang) * bh * 0.9,
          ty = cy - Math.cos(ang) * bh * 0.9,
          L = sc * 0.12 * (1 - k * 0.3),
          sx = tx - dir * (L + 10 + k * 8);
        x.globalAlpha = 1 - k;
        x.strokeStyle = "#ff9f0a";
        x.fillStyle = "#ff9f0a";
        x.lineWidth = 4;
        x.beginPath();
        x.moveTo(sx, ty);
        x.lineTo(tx - dir * 8, ty);
        x.stroke();
        x.beginPath();
        x.moveTo(tx - dir * 2, ty);
        x.lineTo(tx - dir * 14, ty - 7);
        x.lineTo(tx - dir * 14, ty + 7);
        x.closePath();
        x.fill();
        if (big) {
          x.font = "600 13px Inter";
          x.textAlign = "center";
          x.fillText("dorongan", sx, ty - 10);
        }
        x.globalAlpha = 1;
      }
    return s;
  }
  let hudT = 0,
    frameL = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (window.GA_PAGE !== "balance" || !main) return;
    const dt = Math.min((now - (frameL || now)) / 1000, 0.1);
    frameL = now;
    main.t = (main.t + dt) % TL;
    let s;
    {
      const [x, W, H] = fit2($("blSim"));
      if (W) s = drawBot(x, W, H, main, true);
    }
    document.querySelectorAll("#blMinis .mc canvas").forEach((cv, i) => {
      const v = minis[i];
      if (!v) return;
      v.t = (v.t + dt) % TL;
      const [x, W, H] = fit2(cv);
      if (W) drawBot(x, W, H, v, false);
    });
    if (SG && !$("blPSensor").hidden) {
      $("blCur").style.left = SG.X(Math.min(main.t, T)) + "px";
    }
    if (s && now - hudT > 100) {
      hudT = now;
      const r = pop.indexOf(main.ind) + 1;
      $("blHud").innerHTML =
        `<b>${main.ind === manual ? "PID manual" : "Individu #" + (r || "–")}</b> · generasi ${gen}<br>t ${Math.min(main.t, T).toFixed(1)} s · sudut <b>${s[2].toFixed(1)}°</b> · estimasi ${s[3].toFixed(1)}° · PWM ${Math.round(s[6])}`;
      const h2 = s[7]
        ? '<span class="badge bad">jatuh</span>'
        : Math.abs(s[2]) < 3
          ? '<span class="badge">seimbang</span>'
          : '<span class="badge mid">mengoreksi</span>';
      if ($("blHud2").dataset.v !== h2) {
        $("blHud2").innerHTML = h2;
        $("blHud2").dataset.v = h2;
      }
    }
  }

  // ---- grafik sensor ----
  let SG = null;
  function drawSensor() {
    const s = $("blSensor"),
      W = s.clientWidth,
      H = s.clientHeight;
    if (!W || !main) return;
    const rec = main.rec,
      pl = 34,
      pr = 8,
      pt = 8,
      pb = 22;
    let m = 6;
    for (const q of rec) {
      if (!q[7]) m = Math.max(m, Math.abs(q[2]), Math.abs(q[3]));
    }
    m = Math.min(45, Math.ceil(m * 1.25));
    const X = (t) => pl + ((W - pl - pr) * t) / T,
      Y = (v) => pt + (H - pt - pb) * (1 - (clamp(v, -m, m) + m) / (2 * m));
    SG = { X };
    const path = (j) =>
      rec
        .map(
          (q, i) =>
            (i ? "L" : "M") + X(q[0]).toFixed(1) + " " + Y(q[j]).toFixed(1),
        )
        .join("");
    s.innerHTML =
      [-m, 0, m]
        .map(
          (v) =>
            `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${pl - 5}" y="${Y(v) + 4}" text-anchor="end" font-size="12" fill="var(--dim)">${v}°</text>`,
        )
        .join("") +
      [2.5, 5.5]
        .map(
          (t) =>
            `<line x1="${X(t)}" x2="${X(t)}" y1="${pt}" y2="${H - pb}" stroke="var(--p2)" stroke-dasharray="3 3" opacity=".7"/>`,
        )
        .join("") +
      `<text x="${W - pr}" y="${H - 5}" text-anchor="end" font-size="12" fill="var(--dim)">0–${T} detik</text><path d="${path(4)}" fill="none" stroke="#ff9f0a" stroke-width="1" opacity=".55"/><path d="${path(5)}" fill="none" stroke="#ff7a98" stroke-width="1.6"/><path d="${path(2)}" fill="none" stroke="#fff" stroke-width="2"/><path d="${path(3)}" fill="none" stroke="var(--ok)" stroke-width="2.2"/>`;
  }
  let CG = null;
  function drawChart() {
    const s = $("blChart"),
      W = s.clientWidth,
      H = s.clientHeight;
    if (!W) return;
    const n = Math.max(hist.length, 10),
      pl = 34,
      pr = 10,
      pt = 10,
      pb = 24,
      mx = Math.max(10, ...hist.map((h) => h.b));
    const tr = (v) => Math.log10(1 + v),
      Xc = (i) => pl + ((W - pl - pr) * i) / (n - 1),
      Y = (v) => pt + (H - pt - pb) * (1 - tr(v) / tr(mx));
    CG = { Xc, pl, pr, W, n };
    const L = hist.length - 1;
    s.innerHTML =
      [0, 1, 10, 100]
        .filter((v) => v <= mx)
        .map(
          (v) =>
            `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${pl - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="12" fill="var(--dim)">${v}</text>`,
        )
        .join("") +
      `<text x="${W - pr}" y="${H - 6}" text-anchor="end" font-size="12" fill="var(--dim)">generasi 1–${hist.length} · skala log</text>` +
      (hist.length
        ? `<path d="${hist.map((h, i) => (i ? "L" : "M") + Xc(i).toFixed(1) + " " + Y(h.b).toFixed(1)).join("")}" fill="none" stroke="var(--ok)" stroke-width="3" stroke-linejoin="round"/><circle cx="${Xc(L)}" cy="${Y(hist[L].b)}" r="5" fill="var(--ok)" class="ping"/><circle cx="${Xc(L)}" cy="${Y(hist[L].b)}" r="4.5" fill="var(--ok)"/>`
        : "");
  }
  $("blChartFig").addEventListener("pointermove", (e) => {
    const f = $("blChartFig");
    if (!CG || !hist.length) return;
    const x = e.clientX - f.getBoundingClientRect().left,
      i = clamp(
        Math.round(((x - CG.pl) / (CG.W - CG.pl - CG.pr)) * (CG.n - 1)),
        0,
        hist.length - 1,
      ),
      px = CG.Xc(i),
      t = $("blT");
    $("blV").style.left = px + "px";
    t.textContent = `Gen ${i + 1}: biaya ${hist[i].b.toFixed(2)}, ${hist[i].fall} individu jatuh`;
    t.style.left =
      clamp(px - t.offsetWidth / 2, 0, CG.W - t.offsetWidth) + "px";
    f.classList.add("hov");
  });
  $("blChartFig").addEventListener("pointerleave", () =>
    $("blChartFig").classList.remove("hov"),
  );

  // ---- kode Arduino ----
  function updCode() {
    if (!main) return;
    const P = main.ind.P,
      r = pop.indexOf(main.ind) + 1;
    $("blCode").textContent =
      `// Robot self-balancing: PID hasil evolusi GA (generasi ${gen}, ${main.ind === manual ? "PID manual" : "individu #" + r})
// Simulasi: error rata-rata ${main.ind.mT.toFixed(2)} derajat, ${main.ind.fell ? "masih jatuh" : "tidak jatuh"} saat didorong.
// Sensor MPU6050 (I2C: SDA=A4, SCL=A5), driver motor L298N.
// Model simulasi sederhana: setel ulang di robot nyata, mulai dari nilai ini.
#include <Wire.h>

const float KP = ${P.Kp.toFixed(2)};
const float KI = ${P.Ki.toFixed(2)};
const float KD = ${P.Kd.toFixed(2)};
const float ALPHA = ${P.a.toFixed(3)};   // filter komplementer (bobot giroskop)
const float DT = 0.005;        // loop 200 Hz
const int DEADBAND = ${BAL.DB};       // PWM minimum agar motor mulai berputar
const int ENA = 5, IN1 = 7, IN2 = 8, ENB = 6, IN3 = 9, IN4 = 10;

float angle = 0, integral = 0, gyroBias = 0;
unsigned long lastMicros = 0;
int16_t ax, ay, az, gx, gy, gz;

void readMPU() {
  Wire.beginTransmission(0x68);
  Wire.write(0x3B);
  Wire.endTransmission(false);
  Wire.requestFrom(0x68, 14, true);
  ax = Wire.read() << 8 | Wire.read();
  ay = Wire.read() << 8 | Wire.read();
  az = Wire.read() << 8 | Wire.read();
  Wire.read(); Wire.read();              // suhu (tidak dipakai)
  gx = Wire.read() << 8 | Wire.read();
  gy = Wire.read() << 8 | Wire.read();
  gz = Wire.read() << 8 | Wire.read();
}

void setMotor(int pwm) {
  bool fwd = pwm >= 0;
  int p = abs(pwm);
  if (p > 0) p = map(p, 0, 255, DEADBAND, 255);   // kompensasi zona mati
  digitalWrite(IN1, fwd); digitalWrite(IN2, !fwd);
  digitalWrite(IN3, fwd); digitalWrite(IN4, !fwd);
  analogWrite(ENA, p); analogWrite(ENB, p);
}

void setup() {
  Wire.begin();
  Wire.beginTransmission(0x68); Wire.write(0x6B); Wire.write(0); Wire.endTransmission();  // bangunkan MPU6050
  pinMode(ENA, OUTPUT); pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(ENB, OUTPUT); pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  for (int i = 0; i < 500; i++) { readMPU(); gyroBias += gy / 131.0; delay(2); }  // kalibrasi bias giro (robot diam)
  gyroBias /= 500;
  readMPU();
  angle = atan2(ax, az) * 180.0 / PI;
  lastMicros = micros();
}

void loop() {
  if (micros() - lastMicros < 5000) return;
  lastMicros += 5000;
  readMPU();
  float accAngle = atan2(ax, az) * 180.0 / PI;      // sesuaikan sumbu dengan arah pemasangan
  float gyroRate = gy / 131.0 - gyroBias;            // derajat/detik
  angle = ALPHA * (angle + gyroRate * DT) + (1 - ALPHA) * accAngle;
  if (abs(angle) > 40) { setMotor(0); integral = 0; return; }   // sudah jatuh
  integral = constrain(integral + angle * DT, -40, 40);
  float pwm = KP * angle + KI * integral + KD * gyroRate;
  setMotor(constrain((int)pwm, -255, 255));
}`;
  }
  $("blCopy").addEventListener("click", async () => {
    const b = $("blCopy");
    try {
      await navigator.clipboard.writeText($("blCode").textContent);
      b.textContent = "Tersalin";
    } catch (e) {
      const r = document.createRange();
      r.selectNodeContents($("blCode"));
      const s = getSelection();
      s.removeAllRanges();
      s.addRange(r);
      b.textContent = "Teks dipilih, tekan Ctrl+C";
    }
    setTimeout(() => (b.textContent = "Salin kode"), 1800);
  });

  // ---- coba PID sendiri ----
  const MS = {
    blKp: [0, 100, (v) => v.toFixed(1)],
    blKi: [0, 10, (v) => v.toFixed(2)],
    blKd: [0, 8, (v) => v.toFixed(2)],
    blA: [0.8, 0.999, (v) => v.toFixed(3)],
  };
  for (const k in MS) {
    $(k).addEventListener("input", () => {
      $(k + "O").textContent = MS[k][2](+$(k).value);
      retrig($(k + "O"), "bump");
    });
    $(k + "O").textContent = MS[k][2](+$(k).value);
  }
  function setManual(P) {
    $("blKp").value = P.Kp;
    $("blKi").value = P.Ki;
    $("blKd").value = P.Kd;
    $("blA").value = P.a;
    for (const k in MS) $(k + "O").textContent = MS[k][2](+$(k).value);
  }
  $("blFromBest").addEventListener("click", () => {
    if (pop[0]) setManual(pop[0].P);
  });
  $("blTry").addEventListener("click", () => {
    const P = {
      Kp: +$("blKp").value,
      Ki: +$("blKi").value,
      Kd: +$("blKd").value,
      a: +$("blA").value,
    };
    const g = [P.Kp / 100, P.Ki / 10, P.Kd / 8, (P.a - 0.8) / 0.199];
    manual = evalInd(g);
    manual.P = P;
    sel = manual;
    syncViews();
    stats();
    const better = pop.filter((p) => p.cost > manual.cost).length;
    $("blTryRes").innerHTML =
      `${manual.fell ? '<span style="color:#ff8fa8">Robot jatuh</span>' : '<span style="color:var(--ok)">Robot tetap berdiri</span>'} · error ${manual.mT.toFixed(2)}° · biaya ${manual.cost.toFixed(2)}<br>Lebih baik dari ${better} dari ${pop.length} individu generasi ini.`;
    retrig($("blTryRes"), "in");
  });

  function setStat(id, val) {
    const el = $(id);
    if (el.textContent !== String(val)) {
      el.textContent = val;
      if (lastStats[id] !== undefined && !RM && spd() !== "cepat")
        retrig(el.closest(".stat"), "bump");
      lastStats[id] = val;
    }
  }
  function stats() {
    const b = pop[0],
      fall = pop.filter((p) => p.fell).length,
      mi = main ? main.ind : b;
    setStat("blGen", gen);
    $("blGenS").textContent = `${fall} dari ${pop.length} individu masih jatuh`;
    setStat("blErr", b.mT.toFixed(2) + "°");
    $("blErrS").textContent =
      `biaya ${b.cost.toFixed(2)} (makin kecil makin baik)`;
    setStat("blUp", b.fell ? "jatuh " + b.tf.toFixed(1) + " s" : "8 / 8 s");
    $("blUpS").textContent = b.fell
      ? "belum kuat menahan dorongan"
      : "tahan 2 dorongan, 2 skenario uji";
    setStat(
      "blPid",
      `${b.P.Kp.toFixed(0)} / ${b.P.Ki.toFixed(1)} / ${b.P.Kd.toFixed(2)}`,
    );
    $("blPidS").textContent = `Kp / Ki / Kd · α ${b.P.a.toFixed(3)}`;
    const r = pop.indexOf(mi) + 1;
    $("blTitle").textContent =
      mi === manual
        ? `PID manual · generasi ${gen}`
        : `Simulasi individu #${r} · generasi ${gen}`;
    let h;
    if (gen <= 1)
      h = `Generasi pertama berisi ${pop.length} PID acak: ${fall} robot jatuh. Tiap individu = 4 gen (Kp, Ki, Kd, α) dan diuji di 2 skenario: miring awal 4°, lalu didorong pada detik 2,5 dan 5,5.`;
    else
      h =
        fall === 0
          ? `Semua individu sudah bisa berdiri. GA kini menurunkan error sudut, gerak motor, dan pergeseran robot.`
          : `${fall} dari ${pop.length} individu masih jatuh. Seleksi membuang PID yang lemah, crossover mencampur nilai Kp/Ki/Kd dari dua induk, mutasi menggeser nilainya sedikit.`;
    if ($("blNarr").innerHTML !== h) $("blNarr").innerHTML = h;
    drawChart();
    renderMinis();
  }
  function ui() {
    syncViews();
    stats();
    updCode();
  }
  function btn() {
    const p = $("blPlay");
    p.textContent = running ? "Jeda" : gen > 1 ? "Lanjutkan" : "Mulai evolusi";
    p.classList.toggle("on", running);
    $("blStep").disabled = busy;
  }
  async function run() {
    if (busy) return;
    const my = token;
    busy = true;
    running = true;
    btn();
    try {
      while (running && my === token) {
        breed();
        ui();
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
    main = null;
    minis = [];
    init();
    ui();
    btn();
  }
  $("blPlay").addEventListener("click", () => {
    if (running) {
      running = false;
      btn();
    } else run();
  });
  $("blStep").addEventListener("click", () => {
    if (busy) return;
    breed();
    ui();
    btn();
  });
  $("blReset").addEventListener("click", reset);
  $("blPush").addEventListener("change", reset);
  document.querySelector("#blTabs").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const TT = {
      blPSensor: "Sinyal MPU6050",
      blPChart: "Biaya per generasi",
      blPTry: "Coba PID sendiri",
      blPCode: "Ekspor ke Arduino",
    };
    document
      .querySelectorAll("#blTabs button")
      .forEach((x) => x.classList.toggle("on", x === b));
    for (const id in TT) $(id).hidden = id !== b.dataset.p;
    $("blTabT").textContent = TT[b.dataset.p];
    retrig($(b.dataset.p), "in");
    drawChart();
    drawSensor();
  });
  document.addEventListener("keydown", (e) => {
    if (
      window.GA_PAGE !== "balance" ||
      e.target.matches("input[type=text],select") ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey
    )
      return;
    if (e.key === " ") {
      e.preventDefault();
      $("blPlay").click();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      $("blStep").click();
    } else if (e.key === "r" || e.key === "R") reset();
  });
  const outs = {
    blN: (v) => v,
    blPm: (v) => v + "%",
    blSg: (v) => v + "%",
    blE: (v) => v,
    blNoise: (v) => (v / 10).toFixed(1) + "×",
    blBias: (v) => (v / 10).toFixed(1) + "°/s",
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
  ["blNoise", "blBias"].forEach((k) => $(k).addEventListener("change", reset));
  const PRE = [
    [
      "Standar",
      { blN: 30, blPm: 20, blSg: 10, blE: 2, blNoise: 10, blBias: 10 },
    ],
    ["Sensor bising", { blNoise: 25 }],
    ["Giro terkalibrasi", { blBias: 2 }],
    ["Tanpa mutasi", { blPm: 0 }],
    ["Populasi besar", { blN: 80 }],
  ];
  $("blPre").innerHTML = PRE.map(
    (p, i) => `<button type="button" data-i="${i}">${p[0]}</button>`,
  ).join("");
  $("blPre").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const p = PRE[+b.dataset.i][1];
    for (const k in p) {
      $(k).value = p[k];
      upd(k);
    }
    reset();
  });
  new ResizeObserver(() => {
    drawChart();
    drawSensor();
  }).observe($("blChartFig"));
  new ResizeObserver(() => drawSensor()).observe($("blSensorFig"));
  reset();
  requestAnimationFrame(frame);
}
