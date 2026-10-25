"use strict";
  
const canvas = document.getElementById('webgl-canvas-create');
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
