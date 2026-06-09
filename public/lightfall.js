/**
 * LIGHTFALL — WebGL implementation
 * Faithfully recreates the reactbits.dev/backgrounds/lightfall aesthetic:
 *   • Dense vertical/near-vertical light streaks falling from top
 *   • Each streak: a glowing line with bright head, fading tail
 *   • Colors: white/silver-blue cold light with subtle hue variation
 *   • Background: deep near-black (#0a0800 tinted very dark)
 *   • Mouse cursor creates a soft radial brightening
 *   • Streaks have slight parallax / depth (size + speed variation)
 *   • Bloom/glow achieved via additive blending in WebGL
 */

(function () {
  const canvas = document.getElementById('canvas');
  if (!canvas) return;

  // ── WebGL Setup ────────────────────────────────────────────────────────────
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    premultipliedAlpha: false,
  });

  if (!gl) {
    // Fallback to canvas2d if WebGL not available
    initCanvas2DFallback(canvas);
    return;
  }

  // ── Shader Sources ─────────────────────────────────────────────────────────

  // Vertex shader: each streak is a quad (2 triangles), built from streak index
  const VS = `
    precision mediump float;

    // Per-instance streak data packed into 4 floats
    attribute float a_index;       // streak index
    attribute float a_corner;      // 0..3 quad corner

    uniform float u_count;         // total streak count
    uniform float u_time;          // seconds elapsed
    uniform vec2  u_resolution;    // canvas size
    uniform vec2  u_mouse;         // normalised mouse [0,1]

    varying vec4  v_color;
    varying float v_edgeFade;

    // Hash functions for per-streak randomness
    float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
    float hash2(float n) { return fract(sin(n * 311.7) * 53758.5453); }
    float hash3(float n) { return fract(cos(n * 211.3) * 37823.1247); }

    void main() {
      float idx = a_index;

      // ── Streak intrinsic properties ────────────────────────────────────
      float speed       = 0.18 + hash(idx) * 0.55;          // fall speed
      float xNorm       = hash2(idx);                        // 0..1 horizontal
      float tilt        = (hash3(idx) - 0.5) * 0.08;        // slight angle
      float len         = 0.06 + hash(idx + 0.5) * 0.22;    // length (NDC)
      float halfW       = (0.0008 + hash2(idx + 0.3) * 0.0016);  // half-width (NDC)
      float depth       = 0.3 + hash3(idx + 0.7) * 0.7;    // 0=far,1=near

      // Adjust by depth
      speed   *= (0.5 + depth * 0.5);
      halfW   *= depth;
      len     *= (0.5 + depth * 0.7);

      float phase       = hash(idx + 1.1);                   // starting phase
      float twinkleSpd  = 0.8 + hash2(idx + 2.0) * 1.5;
      float twinkle     = 0.7 + 0.3 * sin(u_time * twinkleSpd + phase * 6.28);

      // ── Position over time ─────────────────────────────────────────────
      // Y falls from top (1.0 in NDC = top) downward (decreasing Y)
      float yHead = 1.0 + len - mod((u_time * speed + phase), (1.0 + len) * 2.0);
      // wrap: when head goes below -1-len, restart at top
      float yTail = yHead - len;
      float xCenter = xNorm * 2.0 - 1.0;

      // ── Build quad corner position ─────────────────────────────────────
      // corner encoding: 0=topLeft, 1=topRight, 2=botLeft, 3=botRight
      float cx = (a_corner < 1.5) ? -halfW : halfW;
      float cy = (mod(a_corner, 2.0) < 0.5) ? 0.0 : -1.0;   // 0=head end, 1=tail end

      // Map to actual y position
      float yPos = mix(yHead, yTail, -cy);

      // Apply tilt: x shifts proportionally along streak length
      float xPos = xCenter + cx + tilt * (-cy * len);

      // Correct for aspect ratio so streaks are thin
      float aspect = u_resolution.x / u_resolution.y;
      vec2 pos = vec2(xPos / aspect * (u_resolution.y / u_resolution.x) * aspect, yPos);
      // Simpler: just use raw NDC, canvas2d aspect isn't an issue here
      pos = vec2(xPos, yPos);

      gl_Position = vec4(pos, 0.0, 1.0);

      // ── Per-vertex alpha (gradient along streak length) ────────────────
      // cy==0 → head (bright), cy==-1 → tail (transparent)
      float alphaGrad = (a_corner < 2.0) ? 1.0 : 0.0;
      // Slightly dimmer at exact head tip
      if (a_corner < 0.5 || (a_corner > 1.5 && a_corner < 2.5)) {
        alphaGrad *= 0.85;
      }

      // ── Base streak alpha ──────────────────────────────────────────────
      float baseAlpha = (0.3 + depth * 0.55) * twinkle;

      // ── Mouse proximity boost ──────────────────────────────────────────
      vec2 screenPos = vec2(xCenter * 0.5 + 0.5, (yHead - 0.5 * len) * 0.5 + 0.5);
      float mouseDist = length(screenPos - u_mouse);
      float mouseFactor = smoothstep(0.25, 0.0, mouseDist);
      baseAlpha += mouseFactor * 0.5;
      baseAlpha = clamp(baseAlpha, 0.0, 1.0);

      // ── Color ──────────────────────────────────────────────────────────
      // Lightfall uses near-white streaks with subtle cold/warm tint
      float hueShift = hash3(idx + 3.0);
      vec3 baseColor;
      if (hueShift < 0.25) {
        baseColor = vec3(0.92, 0.97, 1.00);   // cold white-blue
      } else if (hueShift < 0.50) {
        baseColor = vec3(1.00, 0.98, 0.90);   // warm white
      } else if (hueShift < 0.75) {
        baseColor = vec3(0.88, 0.95, 1.00);   // blue-white
      } else {
        baseColor = vec3(1.00, 1.00, 1.00);   // pure white
      }

      // Brighten near streaks
      baseColor = mix(baseColor * 0.5, baseColor, depth);

      v_color   = vec4(baseColor, baseAlpha * alphaGrad);
      v_edgeFade = abs(cx) / halfW;  // 0=centre, 1=edge
    }
  `;

  const FS = `
    precision mediump float;
    varying vec4  v_color;
    varying float v_edgeFade;

    void main() {
      // Soft edge falloff (Gaussian-like across streak width)
      float edgeAlpha = 1.0 - smoothstep(0.0, 1.0, v_edgeFade);
      edgeAlpha = pow(edgeAlpha, 1.5);
      gl_FragColor = vec4(v_color.rgb, v_color.a * edgeAlpha);
    }
  `;

  // ── Compile shaders ────────────────────────────────────────────────────────
  function compileShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  const vs = compileShader(gl.VERTEX_SHADER, VS);
  const fs = compileShader(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { initCanvas2DFallback(canvas); return; }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(prog));
    initCanvas2DFallback(canvas);
    return;
  }
  gl.useProgram(prog);

  // ── Uniforms ───────────────────────────────────────────────────────────────
  const uCount      = gl.getUniformLocation(prog, 'u_count');
  const uTime       = gl.getUniformLocation(prog, 'u_time');
  const uResolution = gl.getUniformLocation(prog, 'u_resolution');
  const uMouse      = gl.getUniformLocation(prog, 'u_mouse');

  // ── Attributes ─────────────────────────────────────────────────────────────
  const aIndex  = gl.getAttribLocation(prog, 'a_index');
  const aCorner = gl.getAttribLocation(prog, 'a_corner');

  // ── Build geometry buffers ─────────────────────────────────────────────────
  // Each streak = 2 triangles = 6 vertices, each vertex has (index, corner)
  const STREAK_COUNT = 280;

  const indexData  = new Float32Array(STREAK_COUNT * 6);
  const cornerData = new Float32Array(STREAK_COUNT * 6);

  // quad corners: two triangles sharing diagonal
  // triangle 1: corners 0,1,2  (topLeft, topRight, botLeft)
  // triangle 2: corners 1,3,2  (topRight, botRight, botLeft)
  const CORNERS = [0, 1, 2, 1, 3, 2];

  for (let i = 0; i < STREAK_COUNT; i++) {
    for (let v = 0; v < 6; v++) {
      indexData [i * 6 + v] = i;
      cornerData[i * 6 + v] = CORNERS[v];
    }
  }

  function makeBuffer(data) {
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return buf;
  }

  const indexBuf  = makeBuffer(indexData);
  const cornerBuf = makeBuffer(cornerData);

  // ── Resize ─────────────────────────────────────────────────────────────────
  let W = 1, H = 1;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  // ── Mouse ──────────────────────────────────────────────────────────────────
  let mouseX = 0.5, mouseY = 0.5;
  const landingSec = document.getElementById('landing');
  if (landingSec) {
    landingSec.addEventListener('mousemove', e => {
      const r = landingSec.getBoundingClientRect();
      mouseX = (e.clientX - r.left) / r.width;
      mouseY = 1.0 - (e.clientY - r.top)  / r.height;
    });
    landingSec.addEventListener('mouseleave', () => { mouseX = -1; mouseY = -1; });
  }

  // ── Render loop ────────────────────────────────────────────────────────────
  // Enable additive blending — this creates the glow/bloom effect
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);   // additive: bright overlapping streaks = bright glow

  let startTime = performance.now();
  let rafId;

  function render(now) {
    rafId = requestAnimationFrame(render);
    const t = (now - startTime) * 0.001;

    // Clear to background colour
    gl.clearColor(0.039, 0.031, 0.0, 1.0);   // #0a0800
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Set uniforms
    gl.uniform1f(uCount, STREAK_COUNT);
    gl.uniform1f(uTime, t);
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform2f(uMouse, mouseX, mouseY);

    // Bind index attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, indexBuf);
    gl.enableVertexAttribArray(aIndex);
    gl.vertexAttribPointer(aIndex, 1, gl.FLOAT, false, 0, 0);

    // Bind corner attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuf);
    gl.enableVertexAttribArray(aCorner);
    gl.vertexAttribPointer(aCorner, 1, gl.FLOAT, false, 0, 0);

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, STREAK_COUNT * 6);
  }

  resize();
  render(performance.now());
  window.addEventListener('resize', () => { cancelAnimationFrame(rafId); resize(); render(performance.now()); });

})();


// ── Canvas 2D Fallback (if WebGL unavailable) ──────────────────────────────
function initCanvas2DFallback(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const COLORS = ['#ffffff','#e8f4ff','#cce8ff','#f0f8ff','#d8eeff','#fffef0','#f8ffff'];
  const COUNT  = 150;
  let W, H, streaks = [], rafId;

  class Streak {
    constructor() { this.reset(true); }
    reset(init) {
      this.x     = Math.random();
      this.y     = init ? Math.random() : -0.05;
      this.len   = 0.05 + Math.random() * 0.18;
      this.speed = 0.003 + Math.random() * 0.008;
      this.w     = 0.5 + Math.random() * 1.5;
      this.alpha = 0.15 + Math.random() * 0.55;
      this.tilt  = (Math.random() - 0.5) * 0.02;
      this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
      this.twinkT = Math.random() * Math.PI * 2;
      this.twinkS = 0.02 + Math.random() * 0.04;
    }
    update() {
      this.y += this.speed;
      this.x += this.tilt;
      this.twinkT += this.twinkS;
      if (this.y - this.len > 1.05) this.reset(false);
    }
    draw() {
      const px = this.x * W, py = this.y * H;
      const lx = px + this.tilt * this.len * H, ly = py - this.len * H;
      const a  = this.alpha * (0.7 + 0.3 * Math.sin(this.twinkT));

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = a;
      ctx.shadowBlur  = 8;
      ctx.shadowColor = this.color;

      const grd = ctx.createLinearGradient(px, py, lx, ly);
      grd.addColorStop(0, this.color);
      grd.addColorStop(1, 'transparent');

      ctx.strokeStyle = grd;
      ctx.lineWidth   = this.w;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(lx, ly);
      ctx.stroke();
      ctx.restore();
    }
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.offsetWidth; H = canvas.offsetHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    W = canvas.offsetWidth; H = canvas.offsetHeight;
  }

  function loop() {
    rafId = requestAnimationFrame(loop);
    ctx.fillStyle = '#0a0800';
    ctx.fillRect(0, 0, W, H);
    streaks.forEach(s => { s.update(); s.draw(); });
  }

  resize();
  streaks = Array.from({ length: COUNT }, () => new Streak());
  loop();
  window.addEventListener('resize', () => { cancelAnimationFrame(rafId); resize(); loop(); });
}
