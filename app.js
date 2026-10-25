
"use strict";

const selectionView = document.querySelector("#selection-view");
const krathongs = document.querySelectorAll(".krathong");
const startButton = document.querySelector("#start-button");
const backButton = document.querySelector("#back-button");
const wishForm = document.querySelector("#wish-form");

const status = document.querySelector("#status");
const formMessage = document.querySelector("#form-message");

const previewIcon = document.querySelector("#selected-preview-icon");
const previewName = document.querySelector("#selected-preview-name");

const employeeNameInput = document.querySelector("#employee-name");
const departmentInput = document.querySelector("#department");
const employeeCodeInput = document.querySelector("#employee-code");
const prayerInput = document.querySelector("#prayer");


const successView = document.querySelector("#success-view");
const successKrathong = document.querySelector("#success-krathong");
const homeButton = document.querySelector("#home-button");


const krathongData = {
    lotus: {
        name: "บัวชมพู",
        icon: "🪷",
    },
    marigold: {
        name: "ดาวเรืองทอง",
        icon: "🌼",
    },
    banana: {
        name: "ใบตองธรรมชาติ",
        icon: "🍃",
    },
};

let selectedKrathong = "lotus";

 
function updatePreview() {
    const selected = krathongData[selectedKrathong];

    previewIcon.textContent = selected.icon;
    previewName.textContent = selected.name;
}

 
krathongs.forEach((button) => {
    button.addEventListener("click", () => {
        selectedKrathong = button.dataset.flower;

        krathongs.forEach((item) => {
            const isSelected = item === button;

            item.classList.toggle("selected", isSelected);
            item.setAttribute("aria-pressed", String(isSelected));
        });

        status.textContent =
            `คุณเลือก${krathongData[selectedKrathong].name}แล้ว`;
    });
});
 
startButton.addEventListener("click", () => {
    updatePreview();

    selectionView.hidden = true;
    wishForm.hidden = false;

    formMessage.textContent = "";

    employeeNameInput.focus();

    window.scrollTo({
        top: 0,
        behavior: "smooth",
    });
});

 
backButton.addEventListener("click", () => {
    wishForm.hidden = true;
    selectionView.hidden = false;

    formMessage.textContent = "";

    window.scrollTo({
        top: 0,
        behavior: "smooth",
    });
});

 
wishForm.addEventListener("submit", async  (event) => {
    event.preventDefault();

    const employeeName = employeeNameInput.value.trim();
    const department = departmentInput.value.trim();
    const employeeCode = employeeCodeInput.value.trim();
    const prayer = prayerInput.value.trim();

    if (
        !employeeName ||
        !department ||
        !employeeCode ||
        !prayer
    ) {
        formMessage.textContent = "กรุณากรอกข้อมูลให้ครบทุกช่อง";
        return;
    }

    if (
        employeeName.length > 100 ||
        department.length > 100 ||
        employeeCode.length > 30 ||
        prayer.length > 300
    ) {
        formMessage.textContent = "กรุณาตรวจสอบความยาวของข้อมูล";
        return;
    }



    const wishData = {
        fullName: employeeName,
        department,
        employeeCode,
        whName: "ไม่ระบุ",
        krathongType: selectedKrathong,
        wish: prayer,
    };

    formMessage.textContent = "กำลังบันทึกคำอธิษฐาน...";
    formMessage.hidden = false;

    try {
        const response = await fetch(
            "https://script.google.com/macros/s/AKfycbxfVAH7i4MSIcXBWB7NSo-PSOkjsn-ur8_57RU0EaDWMB-OtaRTGGzKEJzbfB4GseM/exec",
            {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain;charset=utf-8",
                },
                body: JSON.stringify(wishData),
                redirect: "follow",
            }
        );

        if (!response.ok) {
            throw new Error("ไม่สามารถเชื่อมต่อระบบบันทึกข้อมูลได้");
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || "บันทึกข้อมูลไม่สำเร็จ");
        }

    
        successKrathong.textContent =
            krathongData[selectedKrathong].icon;

        wishForm.hidden = true;
        selectionView.hidden = true;
        successView.hidden = false;

        formMessage.textContent = "บันทึกคำอธิษฐานเรียบร้อยแล้ว";

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });

    } catch (error) {
        console.error("Save wish error:", error);

        formMessage.textContent =
            "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";

        formMessage.hidden = false;
    }

});


 



const empCodeInput = document.getElementById('employee-code');
empCodeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
});


 


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



homeButton.addEventListener("click", () => {
    wishForm.reset();

    successView.hidden = true;
    wishForm.hidden = true;
    selectionView.hidden = false;

    selectedKrathong = "lotus";

    krathongs.forEach((button) => {
        const isSelected = button.dataset.flower === "lotus";

        button.classList.toggle("selected", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
    });

    status.textContent = "เลือกกระทงที่ตรงกับความรู้สึกของคุณ";

    window.scrollTo({
        top: 0,
        behavior: "smooth",
    });
});


// ===== WebGL animated water for the full-width intro =====
(() => {
    const waterCanvas = document.getElementById("intro-water-canvas");
    if (!waterCanvas) return;

    const waterGL = waterCanvas.getContext("webgl", {
        alpha: false,
        antialias: true,
        powerPreference: "low-power"
    });

    if (!waterGL) return; // CSS gradient remains as a fallback.

    const vertexSource = `
        attribute vec2 a_position;
        varying vec2 v_uv;
        void main() {
            v_uv = a_position * 0.5 + 0.5;
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `;

    const fragmentSource = `
        precision mediump float;
        varying vec2 v_uv;
        uniform vec2 u_resolution;
        uniform float u_time;

        // Stylized 2D cartoon waves: bold outlines, layered colors, soft foam.
        float waveLine(float x, float phase, float amplitude, float frequency) {
            return 0.58
                + sin(x * frequency + phase) * amplitude
                + sin(x * frequency * 0.47 - phase * 0.7) * amplitude * 0.35;
        }

        float stroke(float distanceToLine, float thickness) {
            return 1.0 - smoothstep(thickness, thickness + 0.004, abs(distanceToLine));
        }

        void main() {
            vec2 uv = gl_FragCoord.xy / u_resolution.xy;
            float aspect = u_resolution.x / u_resolution.y;
            float x = uv.x * aspect;
            float t = u_time * 0.7;

            // Sky-like top band and stacked cartoon water layers.
            vec3 color = mix(vec3(0.035, 0.10, 0.20), vec3(0.06, 0.25, 0.36), uv.y);
            float farWave = waveLine(x, t * 0.55, 0.035, 2.1);
            float midWave = waveLine(x, -t * 0.75 + 1.8, 0.055, 1.55);
            float frontWave = waveLine(x, t + 3.1, 0.075, 1.15);

            // Fill the layered waves with flat, illustrated colors.
            if (uv.y < farWave) {
                color = vec3(0.08, 0.37, 0.48);
            }
            if (uv.y < midWave) {
                color = vec3(0.04, 0.27, 0.40);
            }
            if (uv.y < frontWave) {
                color = vec3(0.025, 0.17, 0.30);
            }

            // Dark, clean outlines make the surface read like 2D animation.
            float farOutline = stroke(uv.y - farWave, 0.008);
            float midOutline = stroke(uv.y - midWave, 0.009);
            float frontOutline = stroke(uv.y - frontWave, 0.010);
            color = mix(color, vec3(0.015, 0.075, 0.15), max(farOutline * 0.75, max(midOutline * 0.82, frontOutline)));

            // Rounded foam strokes sliding along the wave crests.
            float foamA = sin(x * 13.0 + t * 1.8 + sin(x * 3.0) * 1.4);
            float foamB = sin(x * 19.0 - t * 1.4 + sin(x * 4.0) * 0.8);
            float foam = smoothstep(0.82, 0.98, foamA) * 0.75
                       + smoothstep(0.88, 0.99, foamB) * 0.45;
            float crestBand = max(farOutline, max(midOutline, frontOutline));
            color = mix(color, vec3(0.58, 0.88, 0.91), clamp(foam * crestBand * 2.0, 0.0, 0.85));

            // Small, simple cartoon sparkles on the water.
            float glint = smoothstep(0.94, 0.995, sin(x * 22.0 + t * 2.0))
                        * smoothstep(0.45, 0.95, uv.y);
            color = mix(color, vec3(0.78, 0.91, 0.82), glint * 0.45);

            gl_FragColor = vec4(color, 1.0);
        }
    `;

    function compileShader(type, source) {
        const shader = waterGL.createShader(type);
        waterGL.shaderSource(shader, source);
        waterGL.compileShader(shader);
        if (!waterGL.getShaderParameter(shader, waterGL.COMPILE_STATUS)) {
            console.error("Intro water shader error:", waterGL.getShaderInfoLog(shader));
            waterGL.deleteShader(shader);
            return null;
        }
        return shader;
    }

    const vertexShader = compileShader(waterGL.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(waterGL.FRAGMENT_SHADER, fragmentSource);
    if (!vertexShader || !fragmentShader) return;

    const waterProgram = waterGL.createProgram();
    waterGL.attachShader(waterProgram, vertexShader);
    waterGL.attachShader(waterProgram, fragmentShader);
    waterGL.linkProgram(waterProgram);

    if (!waterGL.getProgramParameter(waterProgram, waterGL.LINK_STATUS)) {
        console.error("Intro water program error:", waterGL.getProgramInfoLog(waterProgram));
        return;
    }

    waterGL.useProgram(waterProgram);
    const vertices = waterGL.createBuffer();
    waterGL.bindBuffer(waterGL.ARRAY_BUFFER, vertices);
    waterGL.bufferData(
        waterGL.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        waterGL.STATIC_DRAW
    );

    const positionLocation = waterGL.getAttribLocation(waterProgram, "a_position");
    waterGL.enableVertexAttribArray(positionLocation);
    waterGL.vertexAttribPointer(positionLocation, 2, waterGL.FLOAT, false, 0, 0);

    const resolutionLocation = waterGL.getUniformLocation(waterProgram, "u_resolution");
    const timeLocation = waterGL.getUniformLocation(waterProgram, "u_time");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animationFrame = 0;
    let start = 0;

    function resizeWater() {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
        const width = Math.max(1, Math.floor(waterCanvas.clientWidth * dpr));
        const height = Math.max(1, Math.floor(waterCanvas.clientHeight * dpr));
        if (waterCanvas.width !== width || waterCanvas.height !== height) {
            waterCanvas.width = width;
            waterCanvas.height = height;
        }
        waterGL.viewport(0, 0, width, height);
        waterGL.uniform2f(resolutionLocation, width, height);
    }

    function drawWater(now) {
        if (!start) start = now;
        resizeWater();
        waterGL.uniform1f(timeLocation, reducedMotion ? 0.0 : (now - start) / 1000);
        waterGL.drawArrays(waterGL.TRIANGLES, 0, 6);
        if (!reducedMotion) animationFrame = window.requestAnimationFrame(drawWater);
    }

    window.addEventListener("resize", resizeWater, { passive: true });
    drawWater(performance.now());
})();
