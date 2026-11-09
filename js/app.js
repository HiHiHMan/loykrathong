
"use strict";

/* Read the device screen size separately from the browser viewport. */
(function detectDeviceScreen() {
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const root = document.documentElement;

    root.dataset.deviceScreen = Math.min(screenWidth, screenHeight) <= 600
        ? "small"
        : Math.min(screenWidth, screenHeight) <= 900
            ? "medium"
            : "large";

    root.style.setProperty("--device-screen-width", screenWidth + "px");
    root.style.setProperty("--device-screen-height", screenHeight + "px");

    console.info("Device screen:", {
        width: screenWidth,
        height: screenHeight,
        pixelRatio: window.devicePixelRatio || 1,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
    });
})();

/* Wait until both temple copies are decoded before starting the seamless loop. */
(function prepareTempleLoop() {
    const track = document.querySelector('.temple-image .temple-track');
    if (!track) return;

    const images = Array.from(track.querySelectorAll('img'));
    if (!images.length) return;

    Promise.all(images.map((image) => {
        if (typeof image.decode === 'function') {
            return image.decode().catch(() => undefined);
        }

        if (image.complete) return Promise.resolve();

        return new Promise((resolve) => {
            image.addEventListener('load', resolve, { once: true });
            image.addEventListener('error', resolve, { once: true });
        });
    })).then(() => {
        track.classList.add('is-ready');
    });
})();

/* Randomize sky lantern X/Y positions on every page load */
(function randomizeSkyLanterns() {
    const container = document.querySelector('.sky-lanterns');
    if (!container) return;

    const lanterns = Array.from(container.querySelectorAll('.sky-lantern-image'));
    if (!lanterns.length) return;

    // Keep the established obj02 artwork on all six lanterns.
    const shuffledLanterns = [...lanterns].sort(() => Math.random() - 0.5);
    shuffledLanterns.forEach((lantern) => {
        const image = lantern.querySelector('img');
        if (image) image.src = './images/obj02.png';
    });

    const placed = [];
    const isSmallScreen = Math.min(window.innerWidth, window.innerHeight) <= 600;
    const minDistance = isSmallScreen ? 12 : 13;
    const maxAttempts = 120;

    // Two lanterns may sit around the upper temple silhouette; the rest stay higher.
    shuffledLanterns.forEach((lantern, index) => {
        const isMiddleLantern = index < 2;
        const xRange = isMiddleLantern
            ? { min: 28, max: 72 }
            : { min: 5, max: 95 };
        const yRange = isMiddleLantern
            ? { min: 27, max: 39 }
            : { min: 7, max: 28 };

        let x = (xRange.min + xRange.max) / 2;
        let y = (yRange.min + yRange.max) / 2;
        let hasSpace = false;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            x = xRange.min + Math.random() * (xRange.max - xRange.min);
            y = yRange.min + Math.random() * (yRange.max - yRange.min);

            hasSpace = placed.every((position) => {
                const dx = (x - position.x) * window.innerWidth / window.innerHeight;
                const dy = y - position.y;
                return Math.hypot(dx, dy) >= minDistance;
            });

            if (hasSpace) break;
        }

        placed.push({ x, y });
        lantern.style.left = `${x.toFixed(2)}%`;
        lantern.style.top = `${y.toFixed(2)}%`;
        lantern.style.right = 'auto';
    });
})();

 
const canvas = document.getElementById('webgl-canvas');
const gl = canvas.getContext('webgl', { antialias: true, alpha: true }) || canvas.getContext('experimental-webgl');

if (gl) {
    
    
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




(function initLatestWishes() {
  const grid = document.getElementById("latestWishesGrid");
  const count = document.getElementById("latestWishesCount");
  const waterArea = document.querySelector(".cartoon-water");
  if (!grid || !count) return;

  if (waterArea) {
    waterArea.appendChild(grid);
    grid.classList.add("latest-wishes-waterline");
  }

  const krathongLanes = [1, 2, 3].map(function (number) {
    const lane = document.createElement("div");
    lane.className = "krathong-wave-lane krathong-wave-lane-" + number;
    lane.setAttribute("aria-hidden", "false");
    grid.appendChild(lane);
    return lane;
  });

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[char];
    });
  }

  function formatWishDate(value) {
    if (value === null || value === undefined || value === "") return "";
    const date = new Date(Number(value));
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
  }

  function getKrathong(type) {
    const value = String(type || "").trim().toLowerCase();
    const flowers = [
      { keys: ["lotus", "บัว"], label: "ดอกบัว", image: "./images/Lotus.png" },
      { keys: ["orchid", "กล้วยไม้"], label: "ดอกกล้วยไม้", image: "./images/Orchid.png" },
      { keys: ["marigold", "ดาวเรือง"], label: "ดอกดาวเรือง", image: "./images/Marigold.png" },
      { keys: ["globeamaranth", "globe amaranth", "บานไม่รู้โรย"], label: "ดอกบานไม่รู้โรย", image: "./images/GlobeAmaranth.png" },
      { keys: ["ixora", "ดอกเข็ม", "เข็ม"], label: "ดอกเข็ม", image: "./images/Ixora.png" },
      { keys: ["whitechampaca", "white champaca", "จำปี"], label: "ดอกจำปี", image: "./images/WhiteChampaca.png" }
    ];
    return flowers.find(flower => flower.keys.some(key => value === key || value.includes(key))) || flowers[0];
  }

  const MAX_WISHES = 10;
  const BATCH_SIZE = 5;
  const REFRESH_INTERVAL = 10000;
  const ANIMATION_DURATION = 72;
  let displayedWishes = [];
  let isLoadingWishes = false;
  let hasLoadedOnce = false;
  let nextLaneIndex = 0;

  function getWishId(item) {
    return String(item.id || item.key || [
      item.createdAt || "", item.fullName || "", item.wish || ""
    ].join("|"));
  }

  function createKrathong(item, laneIndex) {
    const flower = getKrathong(item.krathongType);
    const top = [
      "calc(30px + -9.667%)", "calc(30px + 22%)", "calc(30px + 43.667%)"
    ][laneIndex % 3];
    const html = [
      '<article class="lalaloy latest-wish-krathong is-waiting" style="--wish-float-top:', top, '; animation-delay:0s">',
      '<button class="lalaloy-motion latest-wish-trigger" type="button" aria-label="เปิดคำอธิษฐานของ ',
      escapeHtml(item.fullName || "ผู้ร่วมงาน"), '" aria-expanded="false">',
      '<img class="latest-wish-krathong-image" src="', flower.image, '" alt="', flower.label, '" loading="lazy">',
      '</button><span class="krathong-owner-name">', escapeHtml(item.fullName || "ไม่ระบุชื่อ"), '</span>',
      '<div class="tooltip-card" role="group" aria-label="รายละเอียดคำอธิษฐาน">',
      '<p class="tooltip-label">✦ คำอธิษฐาน</p><p class="tooltip-wish">“',
      escapeHtml(item.wish || "ขอให้พบเจอแต่สิ่งดี ๆ"), '”</p>',
      '<div class="tooltip-divider" aria-hidden="true">✧</div><div class="tooltip-footer"><div>',
      '<p class="tooltip-name">', escapeHtml(item.fullName || "ไม่ระบุชื่อ"), '</p>',
      '<p class="tooltip-date">', escapeHtml(formatWishDate(item.createdAt)), '</p></div>',
      '<span class="tooltip-type"><img class="latest-wish-krathong-image" src="', flower.image,
      '" alt="', flower.label, '" loading="lazy"> ', flower.label, '</span></div></div></article>'
    ].join("");

    const stagingArea = document.createElement("div");
    stagingArea.innerHTML = html;
    const element = stagingArea.firstElementChild;
    element.dataset.wishId = getWishId(item);
    krathongLanes[laneIndex % krathongLanes.length].appendChild(element);
    return element;
  }

  function prepareKrathong(item) {
    const element = createKrathong(item, nextLaneIndex++);
    const itemWidth = element.getBoundingClientRect().width || 100;
    const travelDistance = grid.clientWidth + itemWidth + 24;
    element.style.setProperty("--krathong-travel", travelDistance + "px");
    element.style.left = (-itemWidth - 12) + "px";
    element.style.animation = "none";
    element.style.visibility = "hidden";
    element.style.opacity = "0";
    element.style.pointerEvents = "none";
    return { element, itemWidth, travelDistance };
  }

  function startKrathong(element, duration, delaySeconds) {
    element.classList.remove("is-waiting");
    element.style.animation = "lalaloy-drift " + duration + "s linear infinite";
    element.style.animationDelay = delaySeconds.toFixed(2) + "s";
    element.style.visibility = "visible";
    element.style.opacity = "1";
    element.style.pointerEvents = "auto";
  }

  function renderInitialWishes(items) {
    const prepared = items.map(prepareKrathong);
    if (!prepared.length) {
      count.textContent = "0 คำอธิษฐาน";
      return;
    }

    const duration = prepared.length === 1 ? 40 : ANIMATION_DURATION;
    const phases = [];

    if (prepared.length === 1) {
      const { itemWidth, travelDistance } = prepared[0];
      const targetX = grid.clientWidth * 0.2;
      phases.push(Math.min(1, Math.max(0, (itemWidth + 12 + targetX) / travelDistance)) * duration);
    } else {
      const { itemWidth, travelDistance } = prepared[0];
      const minGapSeconds = Math.max(8.5, ((itemWidth + 48) / travelDistance) * duration);
      for (let attempt = 0; attempt < 2000 && phases.length < prepared.length; attempt++) {
        const phase = Math.random() * duration;
        const enoughSpace = phases.every(existing => {
          const gap = Math.abs(phase - existing);
          return Math.min(gap, duration - gap) >= minGapSeconds;
        });
        if (enoughSpace) phases.push(phase);
      }
      if (phases.length < prepared.length) {
        phases.length = 0;
        const safeGap = duration / prepared.length;
        for (let index = 0; index < prepared.length; index++) phases.push(index * safeGap);
      }
      phases.sort((a, b) => a - b);
    }

    void grid.offsetWidth;
    prepared.forEach(({ element }, index) => startKrathong(element, duration, -phases[index]));
    count.textContent = items.length + " คำอธิษฐาน";
  }

  function appendNewWishes(items) {
    if (!items.length) return;
    const prepared = items.map(prepareKrathong);
    const first = prepared[0];
    const minGapSeconds = Math.max(
      8.5, ((first.itemWidth + 48) / first.travelDistance) * ANIMATION_DURATION
    );

    // Preserve existing elements and animations; each new krathong enters from beyond the left edge.
    void grid.offsetWidth;
    prepared.forEach(({ element }, index) => {
      startKrathong(element, ANIMATION_DURATION, index * minGapSeconds);
    });
    count.textContent = displayedWishes.length + " คำอธิษฐาน";
  }

  async function loadLatestWishes() {
    if (isLoadingWishes) return;
    isLoadingWishes = true;
    try {
      const items = await window.LoyKrathongDB.getWishes(BATCH_SIZE);
      items.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

      if (!hasLoadedOnce) {
        displayedWishes = items.slice(0, BATCH_SIZE);
        hasLoadedOnce = true;
        renderInitialWishes(displayedWishes);
      } else {
        const knownIds = new Set(displayedWishes.map(getWishId));
        const newItems = items
          .filter(item => !knownIds.has(getWishId(item)))
          .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));

        if (newItems.length) {
          const combined = [...displayedWishes, ...newItems];
          const removedItems = combined.slice(0, Math.max(0, combined.length - MAX_WISHES));
          displayedWishes = combined.slice(-MAX_WISHES);

          const removedIds = new Set(removedItems.map(getWishId));
          if (removedIds.size) {
            grid.querySelectorAll(".latest-wish-krathong").forEach(element => {
              if (removedIds.has(element.dataset.wishId)) element.remove();
            });
          }

          appendNewWishes(newItems);
          count.textContent = displayedWishes.length + " คำอธิษฐาน";
        }
      }
    } catch (error) {
      console.error("Load latest wishes error:", error);
      if (!hasLoadedOnce) {
        grid.innerHTML = '<div class="state-message">โหลดคำอธิษฐานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</div>';
        count.textContent = "โหลดข้อมูลไม่สำเร็จ";
      }
    } finally {
      isLoadingWishes = false;
    }
  }

  loadLatestWishes();
  window.setInterval(loadLatestWishes, REFRESH_INTERVAL);

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
