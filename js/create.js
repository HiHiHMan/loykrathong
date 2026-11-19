"use strict"; 

const canvas = document.getElementById('webgl-canvas-create');
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


const selectionView = document.querySelector("#selection-view");
const krathongs = document.querySelectorAll(".krathong");
const startButton = document.querySelector("#start-button");
const backButton = document.querySelector("#back-button");
const wishForm = document.querySelector("#wish-form");

const status = document.querySelector("#status");
const formMessage = document.querySelector("#form-message");

const confirmationCard = document.querySelector("#wish-confirmation");
const confirmationBackdrop = document.querySelector("#wish-confirmation-backdrop");
const confirmationText = document.querySelector("#wish-confirmation-text");
const confirmWishButton = document.querySelector("#confirm-wish-button");
const cancelWishButton = document.querySelector("#cancel-wish-button");
let wishSubmissionConfirmed = false;

cancelWishButton.addEventListener("click", () => {
    confirmationCard.hidden = true;
    confirmationBackdrop.hidden = true;
    confirmationText.textContent = "";
});

confirmWishButton.addEventListener("click", () => {
    wishSubmissionConfirmed = true;
    confirmationCard.hidden = true;
    confirmationBackdrop.hidden = true;
    wishForm.requestSubmit();
});


const previewIcon = document.querySelector("#selected-preview-icon");
const previewName = document.querySelector("#selected-preview-name");

const employeeNameInput = document.querySelector("#employee-name");
const departmentInput = document.querySelector("#department");
const departmentOtherInput = document.querySelector("#department-other");
const employeeCodeInput = document.querySelector("#employee-code");
const employeeCodeMessage = document.querySelector("#employee-code-message");
const prayerInput = document.querySelector("#prayer");

// Press Enter to submit the wish; use Shift+Enter for a new line.
prayerInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;

    event.preventDefault();

    if (prayerInput.value.trim()) {
        wishForm.requestSubmit();
    }
});

// Mark completed fields with a green border after the user leaves the field.
const formFields = wishForm.querySelectorAll("input, select, textarea");

function updateCompletedField(field) {
    const hasValue = String(field.value || "").trim().length > 0;
    field.classList.toggle("is-complete", hasValue && field.checkValidity());
}

// Move focus to the first required field that is still empty.
function focusFirstIncompleteField() {
    const nextField = Array.from(
        wishForm.querySelectorAll("input[required], select[required], textarea[required]")
    ).find((field) => {
        return !field.disabled &&
            !field.hidden &&
            field.getClientRects().length > 0 &&
            !String(field.value || "").trim();
    });

    if (!nextField) return;

    nextField.focus({ preventScroll: true });
    nextField.scrollIntoView({
        behavior: "smooth",
        block: "center",
    });
}

formFields.forEach((field) => {
    field.addEventListener("blur", () => updateCompletedField(field));
    field.addEventListener("input", () => {
        if (field.classList.contains("is-complete")) {
            updateCompletedField(field);
        }
    });
    field.addEventListener("change", () => updateCompletedField(field));
});

departmentInput.addEventListener("change", () => {
    const isOther = departmentInput.value === "__other__";
    departmentOtherInput.hidden = !isOther;
    departmentOtherInput.required = isOther;

    if (isOther) {
        departmentOtherInput.focus();
    } else {
        departmentOtherInput.value = "";
    }
});


const successView = document.querySelector("#success-view");
const successKrathong = document.querySelector("#success-krathong");
const homeButton = document.querySelector("#home-button");


const krathongData = {
    lotus: {
        name: "ดอกบัว",
        image: "../images/Lotus.png",
    },
    orchid: {
        name: "ดอกกล้วยไม้",
        image: "../images/Orchid.png",
    },
    marigold: {
        name: "ดอกดาวเรือง",
        image: "../images/Marigold.png",
    },
    globeAmaranth: {
        name: "ดอกบานไม่รู้โรย",
        image: "../images/GlobeAmaranth.png",
    },
    ixora: {
        name: "ดอกเข็ม",
        image: "../images/Ixora.png",
    },
    whiteChampaca: {
        name: "ดอกจำปี",
        image: "../images/WhiteChampaca.png",
    },
};

let selectedKrathong = "lotus";

 
function updatePreview() {
    const selected = krathongData[selectedKrathong];

    previewIcon.innerHTML = `<img src="${selected.image}" alt="">`;
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

        startButton.focus({ preventScroll: true });
        status.scrollIntoView({
            behavior: "smooth",
            block: "end",
        });
    });
});
 
startButton.addEventListener("click", () => {
    updatePreview();

    selectionView.hidden = true;
    wishForm.hidden = false;

    formMessage.textContent = "";

    employeeCodeInput.focus();

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
    const department = departmentInput.value === "__other__"
        ? departmentOtherInput.value.trim()
        : departmentInput.value.trim();
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

    if (!wishSubmissionConfirmed) {
        confirmationText.textContent = prayer;
        confirmationBackdrop.hidden = false;
        confirmationCard.hidden = false;
        confirmWishButton.focus({ preventScroll: true });
        return;
    }

    wishSubmissionConfirmed = false;

    formMessage.hidden = false;
    formMessage.textContent = "กำลังตรวจสอบรหัสพนักงาน...";

    try {
        const alreadyRegistered = await window.LoyKrathongDB.hasEmployeeCode(employeeCode);
        if (alreadyRegistered) {
            employeeCodeExists = true;
            employeeCodeMessage.classList.remove("is-success");
            employeeCodeMessage.classList.add("is-registered");
            employeeCodeInput.classList.add("is-registered");
            employeeCodeMessage.textContent = "ลงทะเบียนแล้ว";
            employeeCodeInput.focus();
            return;
        }
        employeeCodeExists = false;
        employeeCodeInput.classList.remove("is-registered");
        employeeCodeMessage.classList.remove("is-registered");
    } catch (error) {
        console.error("Check employee code error:", error);
        formMessage.textContent = "ตรวจสอบรหัสพนักงานไม่สำเร็จ กรุณาลองใหม่";
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
        await window.LoyKrathongDB.addWish(wishData);


    
        successKrathong.innerHTML = `<img src="${krathongData[selectedKrathong].image}" alt="${krathongData[selectedKrathong].name}">`;

        wishForm.hidden = true;
        selectionView.hidden = true;
        successView.hidden = false;

        const countdownElement = document.querySelector("#success-countdown");
        let remainingSeconds = 3;

        countdownElement.textContent = `กำลังกลับหน้าหลักใน ${remainingSeconds} วินาที`;

        const redirectTimer = window.setInterval(() => {
            remainingSeconds -= 1;

            if (remainingSeconds <= 0) {
                window.clearInterval(redirectTimer);
                window.location.href = "../index.html";
                return;
            }

            countdownElement.textContent = `กำลังกลับหน้าหลักใน ${remainingSeconds} วินาที`;
        }, 1000);

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
let employeeCodeCheckToken = 0;
let employeeCodeExists = false;
let employeeLookupToken = 0;
let lastEmployeeLookupCode = "";
let employeeLookupPromise = null;

async function lookupEmployeeByCode() {
    const employeeCode = empCodeInput.value.trim();
    if (!employeeCode) return null;

    if (lastEmployeeLookupCode === employeeCode && employeeLookupPromise) {
        return employeeLookupPromise;
    }

    const lookupToken = ++employeeLookupToken;
    lastEmployeeLookupCode = employeeCode;
    employeeCodeMessage.classList.remove("is-success", "is-registered");
    employeeCodeInput.classList.remove("is-registered");
    employeeCodeMessage.textContent = "";

    employeeLookupPromise = (async () => {
        try {
            // Check Wishes first. Query Emps only when this code is not registered.
            const alreadyRegistered = await window.LoyKrathongDB.hasEmployeeCode(employeeCode);
            if (lookupToken !== employeeLookupToken || empCodeInput.value.trim() !== employeeCode) return null;

            if (alreadyRegistered) {
                employeeCodeExists = true;
                employeeCodeInput.classList.remove("is-complete");
                employeeCodeInput.classList.add("is-registered");
                employeeCodeMessage.classList.add("is-registered");
                employeeCodeMessage.textContent = "ลงทะเบียนแล้ว";
                return { registered: true };
            }

            employeeCodeExists = false;
            employeeCodeInput.classList.remove("is-registered");
            employeeCodeMessage.classList.remove("is-registered");
            employeeCodeMessage.textContent = "";

            const employee = await window.LoyKrathongDB.getEmployeeByCode(employeeCode);
            if (lookupToken !== employeeLookupToken || empCodeInput.value.trim() !== employeeCode) return null;

            if (!employee) {
                employeeCodeMessage.classList.remove("is-success", "is-registered");
                employeeCodeMessage.textContent = "";
                return null;
            }

            employeeNameInput.value = employee.fullName || "";
            updateCompletedField(employeeNameInput);
            updateCompletedField(empCodeInput);

            const department = String(employee.department || "").trim();
            if (department) {
                let option = Array.from(departmentInput.options)
                    .find(item => item.value === department);

                if (!option) {
                    option = new Option(department, department);
                    departmentInput.add(option);
                }

                departmentInput.value = department;
                updateCompletedField(departmentInput);
                departmentOtherInput.value = "";
                departmentOtherInput.hidden = true;
                departmentOtherInput.required = false;
            }

            employeeCodeMessage.classList.remove("is-success", "is-registered");
            employeeCodeMessage.textContent = "";

            // After employee details are filled, guide the user to the next missing field.
            focusFirstIncompleteField();
            return employee;
        } catch (error) {
            console.error("Employee code check error:", error);
            if (lookupToken === employeeLookupToken) {
                employeeCodeMessage.classList.remove("is-success", "is-registered");
                employeeCodeMessage.textContent = "";
            }
            return null;
        } finally {
            if (lookupToken === employeeLookupToken) {
                employeeLookupPromise = null;
            }
        }
    })();

    return employeeLookupPromise;
}

empCodeInput.addEventListener("input", (event) => {
    event.target.value = event.target.value.replace(/[^0-9]/g, "");
    employeeCodeExists = false;
    employeeCodeCheckToken++;
    employeeLookupToken++;
    lastEmployeeLookupCode = "";
    employeeLookupPromise = null;
    employeeCodeMessage.classList.remove("is-success", "is-registered");
    empCodeInput.classList.remove("is-complete", "is-registered");
    employeeNameInput.classList.remove("is-complete");
    departmentInput.classList.remove("is-complete");
    employeeCodeMessage.textContent = "";
});

empCodeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        lookupEmployeeByCode();
    }
});

empCodeInput.addEventListener("blur", () => {
    lookupEmployeeByCode();
});

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

