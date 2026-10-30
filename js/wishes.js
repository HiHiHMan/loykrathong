"use strict";

/* Float sky lanterns in loose pairs or trios on the wishes page. */
(function randomizeSkyLanterns() {
  const container = document.querySelector(".sky-lanterns");
  if (!container) return;

  const lanterns = Array.from(container.querySelectorAll(".sky-lantern-image"));
  const groups = [];
  let cursor = 0;

  while (cursor < lanterns.length) {
    const remaining = lanterns.length - cursor;
    const groupSize = remaining <= 3 ? remaining : (remaining === 4 ? 2 : (Math.random() < 0.5 ? 2 : 3));
    groups.push(lanterns.slice(cursor, cursor + groupSize));
    cursor += groupSize;
  }

  const placedCenters = [];
  const minGroupDistance = window.innerWidth <= 600 ? 19 : 17;
  const maxAttempts = 100;

  groups.forEach((group) => {
    let centerX = 0;
    let centerY = 0;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      centerX = 7 + Math.random() * 86;
      centerY = 8 + Math.random() * 29;

      const hasRoom = placedCenters.every((point) => {
        const dx = (centerX - point.x) * window.innerWidth / window.innerHeight;
        const dy = centerY - point.y;
        return Math.hypot(dx, dy) >= minGroupDistance;
      });

      if (hasRoom) break;
    }

    placedCenters.push({ x: centerX, y: centerY });

    group.forEach((lantern, index) => {
      // Keep lanterns close enough to read as a group, but not touching.
      const offsets = group.length === 2
        ? [{ x: -3.8, y: 1.8 }, { x: 3.8, y: -1.8 }]
        : [{ x: -5.2, y: 2.2 }, { x: 0, y: -2.4 }, { x: 5.2, y: 2.2 }];
      const x = Math.max(3, Math.min(94, centerX + offsets[index].x));
      const y = Math.max(5, Math.min(42, centerY + offsets[index].y));

      lantern.style.left = `${x.toFixed(2)}%`;
      lantern.style.top = `${y.toFixed(2)}%`;
      lantern.style.right = "auto";
    });
  });
})();

const WISHES_API_URL = "https://script.google.com/macros/s/AKfycbxfVAH7i4MSIcXBWB7NSo-PSOkjsn-ur8_57RU0EaDWMB-OtaRTGGzKEJzbfB4GseM/exec";
const wishGrid = document.getElementById("wishGrid");
const refreshButton = document.getElementById("refreshWishes");
const resultCount = document.getElementById("resultCount");
let callbackCounter = 0;
let requestTimeout;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function getKrathong(type) {
  const value = String(type || "").trim().toLowerCase();

  const krathongTypes = {
    lotus: { emoji: "🪷", label: "กระทงบัวชมพู" },
    marigold: { emoji: "🌼", label: "กระทงดาวเรืองทอง" },
    banana: { emoji: "🍃", label: "กระทงใบตองธรรมชาติ" },
    bread: { emoji: "🍞", label: "กระทงขนมปัง" },
    coconut: { emoji: "🥥", label: "กระทงกะลามะพร้าว" },
    flower: { emoji: "🌸", label: "กระทงดอกไม้หลากสี" }
  };

  const thaiAliases = [
    { match: "ดาวเรือง", key: "marigold" },
    { match: "บัว", key: "lotus" },
    { match: "ใบตอง", key: "banana" },
    { match: "ขนมปัง", key: "bread" },
    { match: "กะลามะพร้าว", key: "coconut" },
    { match: "ดอกไม้", key: "flower" }
  ];

  if (krathongTypes[value]) return krathongTypes[value];

  const matched = thaiAliases.find(item => value.includes(item.match));
  return matched ? krathongTypes[matched.key] : { emoji: "🪷", label: "กระทงลอยน้ำ" };
}


function renderWishes(items) {
  if (!Array.isArray(items) || items.length === 0) {
    wishGrid.innerHTML =
      '<div class="state-message">ยังไม่มีคำอธิษฐานให้แสดงในขณะนี้</div>';
    resultCount.textContent = "";
    return;
  }

  resultCount.textContent = ``;

  wishGrid.innerHTML = items.map((item, index) => {
    const k = getKrathong(item.krathongType);

    return `
      <article class="wish-item">
        <div class="tooltip-card" role="group" aria-label="รายละเอียดคำอธิษฐาน">
          <p class="tooltip-label">✦ คำอธิษฐาน</p>
          <p class="tooltip-wish">“${escapeHtml(item.wish || "ขอให้พบเจอแต่สิ่งดี ๆ")}”</p>
          <div class="tooltip-divider" aria-hidden="true">✧</div>
          <div class="tooltip-footer">
            <div>
              <p class="tooltip-name">${escapeHtml(item.fullName || "ไม่ระบุชื่อ")}</p>
            </div>
            <span class="tooltip-type">${k.emoji} ${k.label}</span>
          </div>
        </div>

        <button class="krathong-trigger" type="button" aria-label="เปิดคำอธิษฐาน" aria-expanded="false">
          <span class="krathong-emoji" style="animation-delay:${(index % 5) * 0.35}s">${k.emoji}</span>
          <span class="water-ripple" aria-hidden="true"></span>
        </button>
      </article>
    `;
  }).join("");
}

function loadWishes() {
  refreshButton.disabled = true;
  refreshButton.textContent = "กำลังสุ่ม...";
  resultCount.textContent = "";
  wishGrid.innerHTML = '<div class="state-message">กำลังรวบรวมคำอธิษฐาน...</div>';

  const callbackName = `onRandomWishes_${Date.now()}_${++callbackCounter}`;
  const script = document.createElement("script");
  let finished = false;

  function cleanup() {
    if (finished) return;
    finished = true;
    clearTimeout(requestTimeout);
    delete window[callbackName];
    script.remove();
    refreshButton.disabled = false;
    refreshButton.textContent = "↻ สุ่มคำอธิษฐานใหม่";
  }

  window[callbackName] = response => {
    cleanup();
    if (!response || response.success !== true) {
      wishGrid.innerHTML = '<div class="state-message">โหลดคำอธิษฐานไม่สำเร็จ กรุณาลองอีกครั้ง</div>';
      resultCount.textContent = "โหลดข้อมูลไม่สำเร็จ";
      return;
    }
    renderWishes(response.data);
  };

  script.onerror = () => {
    cleanup();
    wishGrid.innerHTML = '<div class="state-message">เชื่อมต่อข้อมูลไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่</div>';
    resultCount.textContent = "เชื่อมต่อไม่ได้";
  };

  script.src = `${WISHES_API_URL}?action=randomWishes&callback=${encodeURIComponent(callbackName)}&_=${Date.now()}`;
  requestTimeout = setTimeout(() => {
    cleanup();
    wishGrid.innerHTML = '<div class="state-message">ใช้เวลาโหลดนานกว่าปกติ กรุณากดสุ่มอีกครั้ง</div>';
    resultCount.textContent = "หมดเวลารอข้อมูล";
  }, 15000);
  document.body.appendChild(script);
}


refreshButton.addEventListener("click", loadWishes);

// Tap a krathong to show or hide its wish on touch devices.
wishGrid.addEventListener("click", event => {
  const trigger = event.target.closest(".krathong-trigger");
  if (!trigger) return;

  const item = trigger.closest(".wish-item");
  if (!item) return;

  const shouldOpen = !item.classList.contains("is-open");
  wishGrid.querySelectorAll(".wish-item.is-open").forEach(openItem => {
    openItem.classList.remove("is-open");
    const openTrigger = openItem.querySelector(".krathong-trigger");
    if (openTrigger) openTrigger.setAttribute("aria-expanded", "false");
  });

  if (shouldOpen) {
    item.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
  }
});

loadWishes();








const canvas = document.getElementById('webgl-canvas');
const gl = canvas.getContext('webgl', { antialias: true, alpha: true }) || canvas.getContext('experimental-webgl');

if (gl) {
  // Configuration matching exact parameters:
  // Golden Yellow theme, 125 particles, 0.3x speed, 0.4x size, 0.5x flicker, 0.2x wind
  const config = {
    count: 125,
    speedScale: 0.3,
    sizeScale: 0.4,
    flickerScale: 0.5,
    windScale: 0.2,
    colorCore: [1.0, 0.98, 0.85],
    colorGlow: [0.98, 0.75, 0.15],
    colorOuter: [0.85, 0.45, 0.02]
  };

  const vsSource = `
        attribute vec2 a_basePosition;
        attribute vec4 a_properties;
        attribute vec2 a_drift;

        uniform float u_time;
        uniform float u_speedScale;
        uniform float u_sizeScale;
        uniform float u_flickerScale;
        uniform float u_windScale;
        uniform vec2 u_resolution;

        varying float v_alpha;
        varying float v_flicker;
        varying float v_size;

        void main() {
            float speed = a_properties.x * u_speedScale;
            float baseSize = a_properties.y * u_sizeScale;
            float flickerFreq = a_properties.z * u_flickerScale;
            float phase = a_properties.w;

            float totalHeight = 2.4;
            float currentY = a_basePosition.y + u_time * speed * 0.15;
            currentY = mod(currentY + 1.2, totalHeight) - 1.2;

            float lifeProgress = (currentY + 1.2) / totalHeight;
            float fadeIn = smoothstep(0.0, 0.18, lifeProgress);
            float fadeOut = 1.0 - smoothstep(0.72, 1.0, lifeProgress);
            v_alpha = fadeIn * fadeOut;

            float windX = sin(u_time * a_drift.x + phase) * a_drift.y * u_windScale;
            float windY = cos(u_time * a_drift.x * 0.7 + phase) * (a_drift.y * 0.3) * u_windScale;

            vec2 pos = vec2(a_basePosition.x + windX, currentY + windY);

            float pulse1 = sin(u_time * flickerFreq * 3.0 + phase);
            float pulse2 = cos(u_time * flickerFreq * 7.1 + phase * 2.0);
            float pulse3 = sin(u_time * flickerFreq * 1.5 + phase * 0.5);
            v_flicker = 0.55 + 0.45 * (pulse1 * 0.5 + pulse2 * 0.3 + pulse3 * 0.2);

            v_size = baseSize * (0.85 + 0.3 * v_flicker);

            gl_Position = vec4(pos, 0.0, 1.0);
            gl_PointSize = v_size * (u_resolution.y / 600.0);
        }
      `;

  const fsSource = `
        precision mediump float;

        varying float v_alpha;
        varying float v_flicker;
        varying float v_size;

        uniform vec3 u_colorCore;
        uniform vec3 u_colorGlow;
        uniform vec3 u_colorOuter;

        void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float r = length(coord) * 2.0;

            if (r > 1.0) {
                discard;
            }

            float coreMask = exp(-r * 6.0);
            float glowMask = exp(-r * 2.5);
            float outerHalo = pow(1.0 - r, 2.0);

            vec3 finalColor = mix(u_colorOuter, u_colorGlow, glowMask);
            finalColor = mix(finalColor, u_colorCore, coreMask);

            float intensity = (glowMask * 0.7 + coreMask * 0.8 + outerHalo * 0.2) * v_flicker * v_alpha;

            gl_FragColor = vec4(finalColor * intensity, intensity);
        }
      `;

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

  const program = gl.createProgram();
  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);
  gl.useProgram(program);

  const locations = {
    attribs: {
      basePosition: gl.getAttribLocation(program, 'a_basePosition'),
      properties: gl.getAttribLocation(program, 'a_properties'),
      drift: gl.getAttribLocation(program, 'a_drift')
    },
    uniforms: {
      time: gl.getUniformLocation(program, 'u_time'),
      speedScale: gl.getUniformLocation(program, 'u_speedScale'),
      sizeScale: gl.getUniformLocation(program, 'u_sizeScale'),
      flickerScale: gl.getUniformLocation(program, 'u_flickerScale'),
      windScale: gl.getUniformLocation(program, 'u_windScale'),
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      colorCore: gl.getUniformLocation(program, 'u_colorCore'),
      colorGlow: gl.getUniformLocation(program, 'u_colorGlow'),
      colorOuter: gl.getUniformLocation(program, 'u_colorOuter')
    }
  };

  const STRIDE = 8;
  const particleData = new Float32Array(config.count * STRIDE);

  for (let i = 0; i < config.count; i++) {
    const idx = i * STRIDE;
    particleData[idx + 0] = (Math.random() * 2.4) - 1.2;
    particleData[idx + 1] = (Math.random() * 2.4) - 1.2;
    particleData[idx + 2] = 0.6 + Math.random() * 0.8;
    particleData[idx + 3] = 16.0 + Math.random() * 28.0;
    particleData[idx + 4] = 0.8 + Math.random() * 1.5;
    particleData[idx + 5] = Math.random() * Math.PI * 2;
    particleData[idx + 6] = 0.5 + Math.random() * 1.2;
    particleData[idx + 7] = 0.05 + Math.random() * 0.12;
  }

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, particleData, gl.STATIC_DRAW);

  const FSIZE = Float32Array.BYTES_PER_ELEMENT;

  gl.enableVertexAttribArray(locations.attribs.basePosition);
  gl.vertexAttribPointer(locations.attribs.basePosition, 2, gl.FLOAT, false, STRIDE * FSIZE, 0);

  gl.enableVertexAttribArray(locations.attribs.properties);
  gl.vertexAttribPointer(locations.attribs.properties, 4, gl.FLOAT, false, STRIDE * FSIZE, 2 * FSIZE);

  gl.enableVertexAttribArray(locations.attribs.drift);
  gl.vertexAttribPointer(locations.attribs.drift, 2, gl.FLOAT, false, STRIDE * FSIZE, 6 * FSIZE);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.disable(gl.DEPTH_TEST);

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, window.matchMedia('(max-width: 700px)').matches ? 1.5 : 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  window.addEventListener('resize', resize);
  resize();

  const startTime = performance.now();

  function render(currentTime) {
    const elapsedTime = (currentTime - startTime) * 0.001;

    // gl.clearColor(0.03, 0.05, 0.1, 1.0);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform1f(locations.uniforms.time, elapsedTime);
    gl.uniform1f(locations.uniforms.speedScale, config.speedScale);
    gl.uniform1f(locations.uniforms.sizeScale, config.sizeScale);
    gl.uniform1f(locations.uniforms.flickerScale, config.flickerScale);
    gl.uniform1f(locations.uniforms.windScale, config.windScale);
    gl.uniform2f(locations.uniforms.resolution, canvas.width, canvas.height);

    gl.uniform3fv(locations.uniforms.colorCore, config.colorCore);
    gl.uniform3fv(locations.uniforms.colorGlow, config.colorGlow);
    gl.uniform3fv(locations.uniforms.colorOuter, config.colorOuter);

    gl.drawArrays(gl.POINTS, 0, config.count);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}
