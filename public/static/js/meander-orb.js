// The orb from Meander's own room, drawn on a canvas instead of an SVG.
//
// The app builds its body out of springs driven by fingers on the trackpad.
// Nobody is playing this one, so the same shape is driven by a clock: a slow
// wander between resting places, a breath on every beat at 74 bpm, a ring shed
// on the downbeat, and two moons for the loops that would be running. Colours
// and gradient stops are the app's own home palette (renderer/visuals/palettes).
(function () {
  var canvas = document.getElementById("meander-orb");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");

  var PALETTE = {
    a: [232, 163, 61],
    b: [232, 83, 110],
    deep: [126, 58, 86],
    spark: [255, 224, 174],
    mist: [168, 124, 184],
  };
  var rgba = function (c, alpha) {
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + alpha + ")";
  };

  var BPM = 74;
  var BEAT = 60 / BPM;
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Where the orb is allowed to sit, as a fraction of the frame. The app has
  // five; the same five, so the wander has the same shape.
  var RESTS = [
    [0.5, 0.5],
    [0.42, 0.44],
    [0.58, 0.47],
    [0.47, 0.57],
    [0.55, 0.55],
  ];

  var rings = [];
  var pos = { x: 0.5, y: 0.5 };
  var target = 0;
  var lastBeat = -1;
  var width = 0;
  var height = 0;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    var rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // The body: a circle pushed around by three slow harmonics, which is what the
  // spring mesh looks like when it is only breathing.
  function blob(cx, cy, r, t, swell) {
    ctx.beginPath();
    for (var i = 0; i <= 72; i++) {
      var th = (i / 72) * Math.PI * 2;
      var wob =
        1 +
        0.045 * Math.sin(3 * th + t * 0.7) +
        0.03 * Math.sin(5 * th - t * 0.45) +
        0.022 * Math.sin(2 * th + t * 0.3);
      var rr = r * wob * swell;
      var x = cx + Math.cos(th) * rr;
      var y = cy + Math.sin(th) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  var start = null;

  function frame(now) {
    if (start === null) start = now;
    var t = still ? 6.2 : (now - start) / 1000;

    if (width === 0) resize();
    ctx.clearRect(0, 0, width, height);

    var base = Math.min(width, height);
    var r = base * 0.115;

    // The wander: a new resting place every few seconds, eased into rather than
    // travelled to, so it never reads as a thing being moved.
    if (!still) {
      var slot = Math.floor(t / 5.5) % RESTS.length;
      if (slot !== target) target = slot;
      pos.x += (RESTS[target][0] - pos.x) * 0.012;
      pos.y += (RESTS[target][1] - pos.y) * 0.012;
    }
    var cx = pos.x * width;
    var cy = pos.y * height;

    // The beat: a quick swell that falls back over most of a beat, and a ring
    // shed on every fourth one.
    var beat = t / BEAT;
    var phase = beat - Math.floor(beat);
    var kick = still ? 0.35 : Math.pow(1 - phase, 3.2);
    var swell = 1 + kick * 0.055;

    if (!still && Math.floor(beat) !== lastBeat) {
      lastBeat = Math.floor(beat);
      if (lastBeat % 4 === 0) rings.push({ born: t, r: r });
    }

    // The corona, behind everything the body does.
    var haloR = r * 3.4;
    var halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloR);
    halo.addColorStop(0, rgba(PALETTE.a, 0.4 * (0.55 + kick * 0.45)));
    halo.addColorStop(0.34, rgba(PALETTE.b, 0.19));
    halo.addColorStop(0.66, rgba(PALETTE.deep, 0.07));
    halo.addColorStop(1, rgba(PALETTE.deep, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
    ctx.fill();

    // Rings, shed on the downbeat and thrown out over a bar and a half.
    for (var i = rings.length - 1; i >= 0; i--) {
      var age = (t - rings[i].born) / 2.6;
      if (age >= 1) {
        rings.splice(i, 1);
        continue;
      }
      ctx.beginPath();
      ctx.arc(cx, cy, rings[i].r + age * base * 0.34, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(PALETTE.spark, 0.6 * (1 - age) * (1 - age));
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // The body, lit from up and to the left the way the app lights it.
    var skin = ctx.createRadialGradient(cx - r * 0.16, cy - r * 0.24, r * 0.05, cx, cy, r * 1.15);
    skin.addColorStop(0, rgba(PALETTE.spark, 0.95));
    skin.addColorStop(0.4, rgba(PALETTE.a, 0.9));
    skin.addColorStop(0.7, rgba(PALETTE.b, 0.85));
    skin.addColorStop(1, rgba(PALETTE.deep, 0.92));
    blob(cx, cy, r, t, swell);
    ctx.fillStyle = skin;
    ctx.fill();

    // The rim lights as the skin thins on the swell.
    ctx.strokeStyle = rgba(PALETTE.spark, 0.16 + kick * 0.5);
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // A moon per running loop, one slow and one at half the period.
    for (var m = 0; m < 2; m++) {
      var period = m === 0 ? 9 : 5.5;
      var ang = (t / period) * Math.PI * 2 + m * 2.1;
      var orbit = r * (2.1 + m * 0.55);
      var mx = cx + Math.cos(ang) * orbit;
      var my = cy + Math.sin(ang) * orbit * 0.62;
      ctx.beginPath();
      ctx.arc(mx, my, 3, 0, Math.PI * 2);
      ctx.fillStyle = rgba(PALETTE.mist, 0.9);
      ctx.fill();
    }

    if (!still) requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);
})();
