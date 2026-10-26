
"use strict";
 
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

// =====================================
// HOMEPAGE: LOAD LATEST 10 WISHES
// =====================================
(function initLatestWishes() {
  const grid = document.getElementById("latestWishesGrid");
  const count = document.getElementById("latestWishesCount");
  const waterArea = document.querySelector(".cartoon-water");

  // app.js is also used on pages without the latest-wishes section.
  if (!grid || !count) return;

  // Render the latest wishes directly over the animated water waves.
  if (waterArea) {
    waterArea.appendChild(grid);
    grid.classList.add("latest-wishes-waterline");
  }

  const apiUrl = "https://script.google.com/macros/s/AKfycbzPBRubmqbrZbjqO6mNfzJ24ScNzyIHchY1QXRuE-NatslGoaxNb4Np86abO2pkGOs/exec";
  const callbackName = "onLatestWishes_" + Date.now();
  const script = document.createElement("script");
  let finished = false;
  let timeoutId;

  function cleanup() {
    if (finished) return;
    finished = true;
    clearTimeout(timeoutId);
    delete window[callbackName];
    script.remove();
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  function getKrathong(type) {
    const value = String(type || "").trim().toLowerCase();

    if (value === "marigold" || value.includes("ดาวเรือง")) {
      return { emoji: "🌼", label: "กระทงดาวเรืองทอง" };
    }

    if (value === "lotus" || value.includes("บัว")) {
      return { emoji: "🪷", label: "กระทงบัวชมพู" };
    }

    if (value === "banana" || value.includes("ใบตอง")) {
      return { emoji: "🍃", label: "กระทงใบตองธรรมชาติ" };
    }

    return { emoji: "🪷", label: "กระทงดอกบัว" };
  }

  function renderWishes(items) {
    if (!Array.isArray(items) || items.length === 0) {
      grid.innerHTML = '<div class="state-message">ยังไม่มีคำอธิษฐานให้แสดงในขณะนี้</div>';
      count.textContent = "0 คำอธิษฐาน";
      return;
    }

    // Keep the latest-wishes limit, but randomize display/launch order.
    // The launch sequence must not depend on createdAt ordering from the API.
    const latestItems = items.slice(0, 10);
    for (let i = latestItems.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [latestItems[i], latestItems[j]] = [latestItems[j], latestItems[i]];
    }
    count.textContent = latestItems.length + " คำอธิษฐาน";

    // Place all krathongs in one shared floating area, with a random height
    // and longer staggered launch delay so krathongs have more space between them.
    grid.innerHTML = latestItems.map(function (item, index) {
      const krathong = getKrathong(item.krathongType);
      const top = 8 + Math.random() * 68;
      // Launch krathongs sequentially instead of relying on CSS animation delays.

      return `
        <article
          class="lalaloy latest-wish-krathong is-waiting"
          style="--wish-float-top:${top.toFixed(2)}%; animation-delay:0s"
        >
          <button class="lalaloy-motion latest-wish-trigger" type="button"
            aria-label="เปิดคำอธิษฐานของ ${escapeHtml(item.fullName || "ผู้ร่วมงาน")}"
            aria-expanded="false">
            ${krathong.emoji}
          </button>
          <span class="krathong-owner-name">${escapeHtml(item.fullName || "ไม่ระบุชื่อ")}</span>
          <div class="tooltip-card" role="group" aria-label="รายละเอียดคำอธิษฐาน">
            <p class="tooltip-label">✦ คำอธิษฐาน</p>
            <p class="tooltip-wish">“${escapeHtml(item.wish || "ขอให้พบเจอแต่สิ่งดี ๆ")}”</p>
            <div class="tooltip-divider" aria-hidden="true">✧</div>
            <div class="tooltip-footer">
              <div>
                <p class="tooltip-name">${escapeHtml(item.fullName || "ไม่ระบุชื่อ")}</p>
                <p class="tooltip-date">${escapeHtml(item.createdAt || "")}</p>
              </div>
              <span class="tooltip-type">${krathong.emoji} ${krathong.label}</span>
            </div>
          </div>
        </article>
      `;
    }).join("");

    // Each item remains hidden until its individual randomized launch time.
    // The queue is shuffled above, so launch order is independent of createdAt.
    const krathongs = Array.from(grid.querySelectorAll(".latest-wish-krathong"));
    let nextKrathongIndex = 0;
    const launchedKrathongs = [];

    function launchNextKrathong() {
      if (nextKrathongIndex >= krathongs.length) return;

      const item = krathongs[nextKrathongIndex];
      nextKrathongIndex += 1;

      // The viewport is only a window onto the 2880px water scene.
      // Keep krathong dimensions unchanged on every device; let the viewport
      // naturally reveal more on desktop and fewer on tablet/mobile.
      item.style.animation = "none";
      item.style.left = "0";
      item.style.visibility = "hidden";
      item.style.opacity = "0";
      void item.offsetWidth;
      item.classList.remove("is-waiting");
      item.style.animation = "lalaloy-drift 72s linear infinite";
      item.style.visibility = "visible";
      item.style.opacity = "1";
      item.style.pointerEvents = "auto";
      launchedKrathongs.push(item);

      if (nextKrathongIndex < krathongs.length) {
        // Use a fixed rhythm pattern rather than randomizing each interval.
        // The selected pattern changes by weekday and repeats on a weekly cycle.
        const launchPatterns = [
          [5, 9, 5, 7, 4, 8, 6, 5, 9, 4],
          [7, 4, 8, 5, 9, 6, 4, 7, 5, 8],
          [4, 8, 6, 9, 5, 4, 7, 9, 6, 5],
          [9, 5, 7, 4, 8, 5, 6, 4, 9, 7]
        ];
        const patternIndex = new Date().getDay() % launchPatterns.length;
        const intervalIndex = nextKrathongIndex - 1;
        const nextDelayMs = launchPatterns[patternIndex][intervalIndex] * 1000;
        setTimeout(launchNextKrathong, nextDelayMs);
      }
    }

    // The first krathong launches immediately; all others wait for their turn.
    launchNextKrathong();
  }

  window[callbackName] = function (response) {
    cleanup();

    if (!response || response.success !== true) {
      grid.innerHTML = '<div class="state-message">โหลดคำอธิษฐานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</div>';
      count.textContent = "โหลดข้อมูลไม่สำเร็จ";
      return;
    }

    renderWishes(response.data);
  };

  script.onerror = function () {
    cleanup();
    grid.innerHTML = '<div class="state-message">เชื่อมต่อข้อมูลไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต</div>';
    count.textContent = "เชื่อมต่อไม่ได้";
  };

  script.src = apiUrl
    + "?action=latestWishes&callback="
    + encodeURIComponent(callbackName)
    + "&_=" + Date.now();

  timeoutId = setTimeout(function () {
    cleanup();
    grid.innerHTML = '<div class="state-message">โหลดข้อมูลใช้เวลานานเกินไป กรุณารีเฟรชหน้าเว็บ</div>';
    count.textContent = "หมดเวลารอข้อมูล";
  }, 15000);

  document.body.appendChild(script);

  // Tap a floating lalaloy krathong to open/close its wish.
  grid.addEventListener("click", function (event) {
    const trigger = event.target.closest(".latest-wish-trigger");
    if (!trigger) return;

    const item = trigger.closest(".latest-wish-krathong");
    if (!item) return;

    const shouldOpen = !item.classList.contains("is-open");

    grid.querySelectorAll(".latest-wish-krathong.is-open").forEach(function (openItem) {
      openItem.classList.remove("is-open");
      const openTrigger = openItem.querySelector(".latest-wish-trigger");
      if (openTrigger) openTrigger.setAttribute("aria-expanded", "false");
    });

    if (shouldOpen) {
      item.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
    }
  });
})();
