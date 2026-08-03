/* ============================================================
 * Sari Stress Buster — shared vanilla JS game engine
 * ------------------------------------------------------------
 * Single source of truth for the mini-game. Used by:
 *   - the in-app dashboard page  (src/app/dashboard/stress-buster)
 *   - the standalone playable ad (public/playable-stress-buster.html)
 *
 * Usage:
 *   var game = SariStressBuster(mountElement, {
 *     arrows: 5,        // arrows per round (ad uses 3)
 *     size: 380,        // canvas CSS size in px
 *     title: "...",     // heading text (null to hide)
 *     subtitle: "...",  // small line under the title
 *     builtInEnd: true, // show built-in "Play Again" end screen
 *     sound: false,     // muted by default
 *     onGameOver: function(score) {}
 *   });
 *   game.destroy();
 * ============================================================ */
(function (global) {
  "use strict";

  var AUDIO_MUTED_DEFAULT = true;

  var FRUSTRATIONS = [
    { icon: "👻", label: "Ghost client", color: "#B39DDB" },
    { icon: "💸", label: "Low budget", color: "#A8D8B9" },
    { icon: "📈", label: "Scope creep", color: "#FFDAB9" },
    { icon: "⏰", label: "Last-minute change", color: "#E8A598" },
    { icon: "🤷", label: "Unclear brief", color: "#C5A3E0" },
  ];

  var RINGS = [
    { r: 1.0, points: 10 },
    { r: 0.75, points: 20 },
    { r: 0.5, points: 50 },
    { r: 0.25, points: 100 },
  ];

  var RING_COLORS = ["#FFF8F0", "#B39DDB", "#FFDAB9", "#6C4E8F"];
  var RING_STROKES = ["#6C4E8F", "#6C4E8F", "#6C4E8F", "#FFFFFF"];

  var MOCHI_MESSAGES = [
    "You're a warrior! 🐾",
    "Bullseye energy — keep it up! 🔥",
    "Those clients never stood a chance 😎",
    "Stress? Deleted. Nice aim! 💜",
    "Perfect aim, freelancer! 🌟",
    "You crushed it — now take a snack break 🍡",
    "Ghost clients beware of you! 👻",
    "That's how you handle scope creep! 📈",
  ];

  var STYLE = [
    ".ssb{font-family:'Nunito','Segoe UI',system-ui,sans-serif;color:#4A3560;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}",
    ".ssb *,.ssb *::before,.ssb *::after{box-sizing:border-box}",
    ".ssb-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}",
    ".ssb-title{margin:0;font-size:22px;font-weight:800;line-height:1.2;color:#6C4E8F}",
    ".ssb-sub{margin:0;font-size:13px;color:#8b6fae;font-weight:600}",
    ".ssb-sound{width:40px;height:40px;border:none;border-radius:999px;background:#FFF;color:#6C4E8F;font-size:17px;cursor:pointer;box-shadow:0 3px 10px rgba(108,78,143,.18);display:flex;align-items:center;justify-content:center;transition:transform .15s ease}",
    ".ssb-sound:hover{transform:scale(1.06)}",
    ".ssb-hud{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(90deg,#6C4E8F,#8a6bb0);color:#fff;border-radius:999px;padding:8px 16px;font-weight:800;font-size:14px;margin-bottom:10px;box-shadow:0 4px 14px rgba(108,78,143,.22)}",
    ".ssb-hud span{display:inline-flex;align-items:center;gap:6px}",
    ".ssb-wrap{position:relative;border-radius:28px;overflow:hidden;background:#FFF8F0;box-shadow:0 10px 34px rgba(108,78,143,.22);border:3px solid rgba(108,78,143,.18)}",
    ".ssb-wrap canvas{display:block;width:100%;height:100%;touch-action:manipulation;cursor:crosshair}",
    ".ssb-tip{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(46,30,58,.72);color:#fff;font-weight:800;font-size:14px;padding:10px 18px;border-radius:999px;pointer-events:none;text-align:center;white-space:nowrap;animation:ssbPulse 2s ease-in-out infinite}",
    ".ssb-tip.ssb-hidden{opacity:0;transition:opacity .3s ease}",
    ".ssb-end{position:absolute;inset:0;background:rgba(255,248,240,.94);backdrop-filter:blur(4px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:18px;text-align:center;animation:ssbFade .35s ease-out}",
    ".ssb-end-emoji{font-size:46px;margin:0;line-height:1}",
    ".ssb-end-score{margin:0;font-size:16px;font-weight:700;color:#8b6fae}",
    ".ssb-end-score b{font-size:26px;color:#6C4E8F}",
    ".ssb-end-mochi{margin:0;font-size:14px;font-weight:800;color:#4A3560;max-width:260px}",
    ".ssb-again{margin-top:4px;border:none;cursor:pointer;font-family:inherit;font-weight:800;font-size:15px;color:#fff;background:linear-gradient(90deg,#6C4E8F,#E8A598);padding:12px 26px;border-radius:999px;box-shadow:0 6px 18px rgba(108,78,143,.35);transition:transform .15s ease}",
    ".ssb-again:hover{transform:scale(1.05)}",
    "@keyframes ssbPulse{0%,100%{opacity:.9}50%{opacity:.55}}",
    "@keyframes ssbFade{from{opacity:0}to{opacity:1}}",
  ].join("\n");

  var injected = false;
  function injectStyles() {
    if (injected || typeof document === "undefined") return;
    var tag = document.createElement("style");
    tag.setAttribute("data-stress-buster", "1");
    tag.textContent = STYLE;
    document.head.appendChild(tag);
    injected = true;
  }

  /* ---------- Web Audio helpers (generated sounds, muted by default) ---------- */
  var audioCtx = null;
  function getAudio() {
    if (audioCtx) return audioCtx;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
    return audioCtx;
  }

  function tone(freq, start, dur, type, vol, slideTo) {
    var ctx = audioCtx;
    if (!ctx) return;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, ctx.currentTime + start);
    if (slideTo) {
      o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + start + dur);
    }
    g.gain.setValueAtTime(0, ctx.currentTime + start);
    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(ctx.currentTime + start);
    o.stop(ctx.currentTime + start + dur + 0.02);
  }

  function noiseBurst(start, dur, vol) {
    var ctx = audioCtx;
    if (!ctx) return;
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var g = ctx.createGain();
    g.gain.value = vol;
    var f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 1200;
    src.connect(f);
    f.connect(g);
    g.connect(ctx.destination);
    src.start(ctx.currentTime + start);
  }

  function sfxThwip() {
    tone(900, 0, 0.14, "triangle", 0.16, 300);
    noiseBurst(0, 0.08, 0.05);
  }

  function sfxPop() {
    tone(660, 0, 0.12, "sine", 0.22, 220);
    noiseBurst(0, 0.06, 0.09);
  }

  function sfxChime() {
    tone(523.25, 0, 0.35, "sine", 0.12);
    tone(659.25, 0.1, 0.35, "sine", 0.12);
    tone(783.99, 0.2, 0.45, "sine", 0.14);
    tone(1046.5, 0.3, 0.6, "sine", 0.14);
  }

  /* ---------- tiny helpers ---------- */
  function rand(min, max) {
    return min + Math.random() * (max - min);
  }
  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }
  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /* ---------- static drawing helpers (shared with dashboard widget) ---------- */
  function drawTarget(ctx, size, emojiList, opts) {
    opts = opts || {};
    var cx = size / 2;
    var cy = size / 2;
    var R = size * 0.46;
    var emojiR = opts.emojiR || Math.max(16, R * 0.13);

    for (var i = 0; i < RINGS.length; i++) {
      var radius = R * RINGS[i].r;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = RING_COLORS[i];
      ctx.fill();
      ctx.lineWidth = Math.max(2, R * 0.012);
      ctx.strokeStyle = RING_STROKES[i];
      ctx.stroke();
    }

    // bullseye dot
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.05, 0, Math.PI * 2);
    ctx.fillStyle = "#FFF8F0";
    ctx.fill();

    // faint tick marks between rings (lo-fi charm)
    ctx.strokeStyle = "rgba(108,78,143,0.35)";
    ctx.lineWidth = 1.5;
    for (var k = 0; k < RINGS.length - 1; k++) {
      ctx.beginPath();
      ctx.arc(cx, cy, R * RINGS[k].r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // emojis
    var list = emojiList || [];
    for (var e = 0; e < list.length; e++) {
      var em = list[e];
      ctx.beginPath();
      ctx.arc(em.x, em.y, emojiR + 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(108,78,143,0.25)";
      ctx.stroke();
      ctx.font = emojiR * 1.15 + "px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(em.icon, em.x, em.y + 1);
    }
  }

  function randomEmojis(size, count, emojiR) {
    var R = size * 0.46;
    var cx = size / 2;
    var cy = size / 2;
    var minR = R * 0.22;
    var maxR = R * 0.92;
    var minDist = emojiR * 2.1;
    var placed = [];
    var tries = 0;
    while (placed.length < count && tries < 400) {
      tries++;
      var ang = Math.random() * Math.PI * 2;
      var rad = rand(minR, maxR);
      var x = cx + Math.cos(ang) * rad;
      var y = cy + Math.sin(ang) * rad;
      var ok = true;
      for (var i = 0; i < placed.length; i++) {
        if (Math.hypot(x - placed[i].x, y - placed[i].y) < minDist) { ok = false; break; }
      }
      if (ok) {
        var kind = FRUSTRATIONS[Math.floor(Math.random() * FRUSTRATIONS.length)];
        placed.push({ x: x, y: y, icon: kind.icon, color: kind.color, label: kind.label, radius: emojiR });
      }
    }
    return placed;
  }

  /* ============================================================
   * Game factory
   * ============================================================ */
  function createGame(mount, userOptions) {
    if (!mount || typeof document === "undefined") {
      return { destroy: function () {} };
    }

    var opts = {};
    var key;
    var defaults = {
      arrows: 5,
      size: 380,
      title: "Sari Stress Buster 🎯",
      subtitle: "Pop the client frustrations, save the day!",
      builtInEnd: true,
      sound: AUDIO_MUTED_DEFAULT,
      onGameOver: null,
    };
    for (key in defaults) opts[key] = defaults[key];
    if (userOptions) for (key in userOptions) opts[key] = userOptions[key];

    injectStyles();
    mount.classList.add("ssb-mount");

    /* --- DOM --- */
    var root = document.createElement("div");
    root.className = "ssb";
    root.style.width = opts.size + "px";
    root.style.maxWidth = "100%";

    var head = document.createElement("div");
    head.className = "ssb-head";
    var headText = document.createElement("div");
    if (opts.title) {
      var h = document.createElement("h3");
      h.className = "ssb-title";
      h.textContent = opts.title;
      headText.appendChild(h);
    }
    if (opts.subtitle) {
      var s = document.createElement("p");
      s.className = "ssb-sub";
      s.textContent = opts.subtitle;
      headText.appendChild(s);
    }
    head.appendChild(headText);

    var soundBtn = document.createElement("button");
    soundBtn.type = "button";
    soundBtn.className = "ssb-sound";
    soundBtn.setAttribute("aria-label", "Toggle sound");
    soundBtn.textContent = opts.sound ? "🔊" : "🔇";
    var muted = opts.sound;
    soundBtn.addEventListener("click", function () {
      muted = !muted;
      soundBtn.textContent = muted ? "🔇" : "🔊";
      var ctx = getAudio();
      if (ctx && ctx.state === "suspended") ctx.resume();
    });
    head.appendChild(soundBtn);

    var hud = document.createElement("div");
    hud.className = "ssb-hud";
    var scoreSpan = document.createElement("span");
    scoreSpan.textContent = "⭐ 0";
    var arrowSpan = document.createElement("span");
    arrowSpan.textContent = "🎯 " + opts.arrows;
    hud.appendChild(scoreSpan);
    hud.appendChild(arrowSpan);

    var wrap = document.createElement("div");
    wrap.className = "ssb-wrap";

    var canvas = document.createElement("canvas");
    wrap.appendChild(canvas);

    var tip = document.createElement("div");
    tip.className = "ssb-tip";
    tip.textContent = "🎯 Tap the target to shoot!";
    wrap.appendChild(tip);

    var endEl = null;
    if (opts.builtInEnd) {
      endEl = document.createElement("div");
      endEl.className = "ssb-end";
      endEl.style.display = "none";
      wrap.appendChild(endEl);
    }

    root.appendChild(head);
    root.appendChild(hud);
    root.appendChild(wrap);

    mount.innerHTML = "";
    mount.appendChild(root);

    /* --- canvas setup --- */
    var DPR = Math.min(2, global.devicePixelRatio || 1);
    var S = opts.size;
    canvas.width = Math.round(S * DPR);
    canvas.height = Math.round(S * DPR);
    var ctx = canvas.getContext("2d");
    ctx.scale(DPR, DPR);

    var CX = S / 2;
    var CY = S / 2;
    var R = S * 0.46;
    var EMOJI_R = Math.max(18, R * 0.14);

    /* --- state --- */
    var state = {
      arrowsUsed: 0,
      score: 0,
      emojis: [],
      flying: null,
      particles: [],
      floaters: [],
      ended: false,
      started: false,
    };

    function newRound() {
      state.arrowsUsed = 0;
      state.score = 0;
      state.emojis = randomEmojis(S, Math.floor(rand(3, 5.999)), EMOJI_R);
      state.flying = null;
      state.particles = [];
      state.floaters = [];
      state.ended = false;
      state.started = false;
      scoreSpan.textContent = "⭐ 0";
      arrowSpan.textContent = "🎯 " + opts.arrows;
      if (endEl) endEl.style.display = "none";
      tip.classList.remove("ssb-hidden");
      tip.textContent = "🎯 Tap the target to shoot!";
    }

    /* --- particles --- */
    function spawnParticles(x, y, color) {
      for (var i = 0; i < 18; i++) {
        var ang = Math.random() * Math.PI * 2;
        var sp = rand(1.5, 5.5);
        state.particles.push({
          x: x,
          y: y,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp - 1,
          size: rand(3, 7),
          life: 0,
          ttl: Math.floor(rand(30, 55)),
          color: color,
          rot: Math.random() * Math.PI,
          vr: rand(-0.2, 0.2),
        });
      }
    }

    function addFloater(text, x, y, color) {
      state.floaters.push({ x: x, y: y, text: text, life: 0, ttl: 55, color: color || "#6C4E8F" });
    }

    /* --- scoring --- */
    function ringPoints(x, y) {
      var d = Math.hypot(x - CX, y - CY) / R;
      if (d >= 0.75) return 10;
      if (d >= 0.5) return 20;
      if (d >= 0.25) return 50;
      return 100;
    }

    function hitEmoji(x, y) {
      for (var i = 0; i < state.emojis.length; i++) {
        var e = state.emojis[i];
        if (Math.hypot(x - e.x, y - e.y) <= e.radius + 4) return e;
      }
      return null;
    }

    function resolveShot() {
      var f = state.flying;
      state.flying = null;
      var tx = f.toX;
      var ty = f.toY;
      var base = ringPoints(tx, ty);
      var em = hitEmoji(tx, ty);
      var awarded = base;
      var msg = "+" + base;
      if (em) {
        awarded = base * 2;
        spawnParticles(em.x, em.y, em.color);
        msg = "+" + awarded + " (x2)";
        state.emojis = state.emojis.filter(function (e) { return e !== em; });
        if (!muted) sfxPop();
      } else if (!muted) {
        // soft tick for a clean ring hit
        tone(440, 0, 0.06, "sine", 0.05, 300);
      }
      state.score += awarded;
      scoreSpan.textContent = "⭐ " + state.score;
      addFloater(msg, tx, ty - 6, em ? "#E0509B" : "#6C4E8F");
      state.arrowsUsed++;
      arrowSpan.textContent = "🎯 " + Math.max(0, opts.arrows - state.arrowsUsed);

      if (state.arrowsUsed >= opts.arrows) {
        finishGame();
      }
    }

    function finishGame() {
      state.ended = true;
      if (!muted) sfxChime();
      if (typeof opts.onGameOver === "function") opts.onGameOver(state.score);
      if (endEl) {
        tip.classList.add("ssb-hidden");
        var msg = MOCHI_MESSAGES[Math.floor(Math.random() * MOCHI_MESSAGES.length)];
        endEl.innerHTML = "";
        var em = document.createElement("p");
        em.className = "ssb-end-emoji";
        em.textContent = state.score >= opts.arrows * 100 ? "🏆" : "🎉";
        var sc = document.createElement("p");
        sc.className = "ssb-end-score";
        sc.innerHTML = "Total score: <b>" + state.score + "</b> pts";
        var mo = document.createElement("p");
        mo.className = "ssb-end-mochi";
        mo.textContent = "Mochi says: " + msg;
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ssb-again";
        btn.textContent = "🔄 Play Again";
        btn.addEventListener("click", function () { newRound(); });
        endEl.appendChild(em);
        endEl.appendChild(sc);
        endEl.appendChild(mo);
        endEl.appendChild(btn);
        endEl.style.display = "flex";
      }
    }

    /* --- shooting --- */
    function shoot(clientX, clientY) {
      if (state.ended || state.flying) return;
      var rect = canvas.getBoundingClientRect();
      var x = (clientX - rect.left) * (S / rect.width);
      var y = (clientY - rect.top) * (S / rect.height);
      // clamp into the target circle
      var dx = x - CX;
      var dy = y - CY;
      var d = Math.hypot(dx, dy);
      if (d > R) {
        x = CX + (dx / d) * R;
        y = CY + (dy / d) * R;
      }
      state.started = true;
      tip.classList.add("ssb-hidden");
      if (!muted) sfxThwip();
      var sx = CX;
      var sy = S - 8;
      var mx = (sx + x) / 2;
      var my = (sy + y) / 2 - Math.min(R * 0.55, d * 0.45) - 8;
      var start = performance.now();
      var dur = 430;
      state.flying = { fromX: sx, fromY: sy, toX: x, toY: y, mx: mx, my: my, start: start, dur: dur, prevX: sx, prevY: sy };
    }

    /* --- drawing --- */
    function bezier(t) {
      var f = state.flying;
      var t1 = 1 - t;
      return {
        x: t1 * t1 * f.fromX + 2 * t1 * t * f.mx + t * t * f.toX,
        y: t1 * t1 * f.fromY + 2 * t1 * t * f.my + t * t * f.toY,
      };
    }

    function drawArrow(x, y, angle) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.strokeStyle = "#8B5E3C";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(8, 0);
      ctx.stroke();
      // feather
      ctx.strokeStyle = "#E8A598";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-15, -4);
      ctx.moveTo(-10, 0);
      ctx.lineTo(-15, 4);
      ctx.stroke();
      // head
      ctx.fillStyle = "#6C4E8F";
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(2, -4);
      ctx.lineTo(2, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    /* --- main loop --- */
    var raf = 0;
    function loop(now) {
      raf = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, S, S);

      // target board
      drawTarget(ctx, S, state.emojis, { emojiR: EMOJI_R });

      // flying arrow
      if (state.flying) {
        var t = clamp((now - state.flying.start) / state.flying.dur, 0, 1);
        var p = bezier(t);
        var dt = 0.01;
        var p2 = bezier(Math.min(1, t + dt));
        var angle = Math.atan2(p2.y - p.y, p2.x - p.x);
        drawArrow(p.x, p.y, angle);
        if (t >= 1) resolveShot();
      }

      // particles
      for (var pi = state.particles.length - 1; pi >= 0; pi--) {
        var pa = state.particles[pi];
        pa.life++;
        if (pa.life >= pa.ttl) { state.particles.splice(pi, 1); continue; }
        pa.vy += 0.12;
        pa.x += pa.vx;
        pa.y += pa.vy;
        pa.rot += pa.vr;
        var alpha = 1 - pa.life / pa.ttl;
        ctx.save();
        ctx.translate(pa.x, pa.y);
        ctx.rotate(pa.rot);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pa.color;
        ctx.fillRect(-pa.size / 2, -pa.size / 2, pa.size, pa.size);
        ctx.restore();
      }

      // floaters
      for (var fi = state.floaters.length - 1; fi >= 0; fi--) {
        var fl = state.floaters[fi];
        fl.life++;
        if (fl.life >= fl.ttl) { state.floaters.splice(fi, 1); continue; }
        fl.y -= 1.1;
        var fal = 1 - fl.life / fl.ttl;
        ctx.globalAlpha = Math.min(1, fal * 2);
        ctx.font = "800 " + Math.round(16) + "px Nunito, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.strokeText(fl.text, fl.x, fl.y);
        ctx.fillStyle = fl.color;
        ctx.fillText(fl.text, fl.x, fl.y);
        ctx.globalAlpha = 1;
      }
    }

    /* --- events --- */
    function onPointerDown(e) {
      e.preventDefault();
      shoot(e.clientX, e.clientY);
    }
    canvas.addEventListener("pointerdown", onPointerDown);

    function destroy() {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onPointerDown);
      mount.innerHTML = "";
      mount.classList.remove("ssb-mount");
    }

    newRound();
    raf = requestAnimationFrame(loop);

    return {
      destroy: destroy,
      restart: newRound,
      getScore: function () { return state.score; },
      getState: function () { return state; },
    };
  }

  createGame.drawTarget = drawTarget;
  createGame.randomEmojis = randomEmojis;
  createGame.version = "1.0.0";

  global.SariStressBuster = createGame;
})(typeof window !== "undefined" ? window : this);
