import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

/**
 * Proper Sequences — PS Visualizer 3D scene
 * Presentation layer only. Does not create, connect or modify audio nodes.
 * Optional future bridge: window.PSScene3D.setAudioMetrics({ low, mid, high, rms })
 */
(() => {
  const canvas = document.getElementById("psSceneCanvas");
  const hud = document.querySelector(".hud");
  if (!canvas || !hud) return;

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas, alpha: true, antialias: false, powerPreference: "low-power"
    });
  } catch (error) {
    console.warn("[PS 3D] WebGL unavailable; HUD remains operational.", error);
    canvas.hidden = true;
    return;
  }

  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x03090c, 0.035);

  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 4.2, 19);
  camera.lookAt(0, 0, 0);

  const root = new THREE.Group();
  scene.add(root);

  const accent = new THREE.Color(getComputedStyle(document.documentElement)
    .getPropertyValue("--accent").trim() || "#d6ff00");
  const ambient = new THREE.HemisphereLight(0x9bb7c0, 0x020405, 1.05);
  scene.add(ambient);

  const keyLight = new THREE.PointLight(accent, 26, 34, 2);
  keyLight.position.set(-5, 7, 5);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(0x2c7185, 20, 30, 2);
  rimLight.position.set(7, 2, -5);
  scene.add(rimLight);

  // Recessed topographic field: genuine vertex geometry, not a flat CSS overlay.
  const cols = 112, rows = 56;
  const terrainGeometry = new THREE.PlaneGeometry(34, 18, cols, rows);
  terrainGeometry.rotateX(-Math.PI / 2);
  const terrainPositions = terrainGeometry.attributes.position;
  const terrainBase = terrainPositions.array.slice();
  const terrainMaterial = new THREE.MeshStandardMaterial({
    color: 0x173039, metalness: 0.58, roughness: 0.48,
    wireframe: true, transparent: true, opacity: 0.26
  });
  const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
  terrain.position.set(0, -4.7, -3.2);
  root.add(terrain);

  // Central machined monolith with a restrained emissive edge.
  const monolith = new THREE.Group();
  monolith.position.set(0, -0.15, -1.1);
  root.add(monolith);

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x11191c, metalness: 0.82, roughness: 0.24,
    emissive: 0x071014, emissiveIntensity: 0.55
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.25, 5.1, 0.72), bodyMaterial);
  monolith.add(body);

  const edgeGeometry = new THREE.EdgesGeometry(body.geometry);
  const edgeLines = new THREE.LineSegments(edgeGeometry, new THREE.LineBasicMaterial({
    color: accent, transparent: true, opacity: 0.58
  }));
  monolith.add(edgeLines);

  const innerCore = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, 3.6, 0.76),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.62 })
  );
  innerCore.position.z = 0.39;
  monolith.add(innerCore);

  const rings = new THREE.Group();
  rings.position.set(0, 0, -0.2);
  monolith.add(rings);
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.85 + i * 0.42, 0.009, 4, 160),
      new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.19 - i * 0.035 })
    );
    ring.rotation.x = Math.PI / 2 + i * 0.035;
    ring.position.y = -1.8 + i * 1.8;
    rings.add(ring);
  }

  // Kick-triggered horizontal shockwaves, independent from sustained bass.
  const shockwaveMeshes = [];
  const shockwaveAges = [2, 2, 2];
  let shockwaveCursor = 0;
  let previousKick = 0;
  for (let i = 0; i < shockwaveAges.length; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: accent, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const wave = new THREE.Mesh(new THREE.TorusGeometry(1, 0.018, 6, 128), material);
    wave.rotation.x = Math.PI / 2;
    wave.position.set(0, -2.45, -1.0);
    wave.scale.setScalar(0.8);
    root.add(wave);
    shockwaveMeshes.push(wave);
  }

  // Three band clusters: LOW / MID / HIGH represented as separate depth planes.
  const bandGroups = [];
  const bandSpecs = [
    { count: 42, radius: 5.6, z: -2.8, height: 0.9, color: 0x6d9298 },
    { count: 36, radius: 4.35, z: 0.3, height: 1.35, color: 0xb4c2c3 },
    { count: 30, radius: 6.8, z: 2.6, height: 0.55, color: 0xd6ff00 }
  ];
  for (const spec of bandSpecs) {
    const group = new THREE.Group();
    group.position.y = -0.5;
    const geometry = new THREE.BoxGeometry(0.075, 1, 0.075);
    const material = new THREE.MeshStandardMaterial({
      color: spec.color, metalness: 0.72, roughness: 0.3,
      emissive: spec.color, emissiveIntensity: 0.12
    });
    const mesh = new THREE.InstancedMesh(geometry, material, spec.count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < spec.count; i++) {
      const angle = (i / spec.count) * Math.PI * 2;
      dummy.position.set(Math.cos(angle) * spec.radius, 0, Math.sin(angle) * spec.radius + spec.z);
      dummy.scale.set(1, 0.22 + ((i * 17) % 11) / 18, 1);
      dummy.rotation.y = -angle;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    group.add(mesh);
    root.add(group);
    bandGroups.push({ group, mesh, spec });
  }

  // Sparse near-field particles add scale without turning the scene into confetti.
  const particleCount = 180;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 28;
    particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 12;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 17;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  const particleMaterial = new THREE.PointsMaterial({
    color: 0x9db9bd, size: 0.035, transparent: true, opacity: 0.42,
    sizeAttenuation: true, depthWrite: false
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  root.add(particles);

  let targetX = 0, targetY = 0, pointerX = 0, pointerY = 0;
  let low = 0, sub = 0, bass = 0, mid = 0, high = 0, rms = 0;
  let kick = 0, transient = 0, width = 0;
  let hasAudioMetrics = false;
  const defaultRoutes = [
    { id: "r-kick-wave", source: "kick", target: "shockwave", amount: 1.0, threshold: 0.04, attack: 0.008, release: 0.16, curve: "linear", invert: false, enabled: true },
    { id: "r-sub-rings", source: "sub", target: "rings", amount: 0.9, threshold: 0.02, attack: 0.025, release: 0.24, curve: "expo", invert: false, enabled: true },
    { id: "r-bass-ground", source: "bass", target: "terrain", amount: 1.0, threshold: 0.02, attack: 0.06, release: 0.3, curve: "linear", invert: false, enabled: true },
    { id: "r-mid-core", source: "mid", target: "core", amount: 0.9, threshold: 0.02, attack: 0.04, release: 0.2, curve: "linear", invert: false, enabled: true },
    { id: "r-high-particles", source: "high", target: "particles", amount: 1.0, threshold: 0.02, attack: 0.008, release: 0.11, curve: "log", invert: false, enabled: true },
    { id: "r-low-bars", source: "low", target: "bars.low", amount: 1.0, threshold: 0.01, attack: 0.025, release: 0.15, curve: "linear", invert: false, enabled: true },
    { id: "r-mid-bars", source: "mid", target: "bars.mid", amount: 1.0, threshold: 0.01, attack: 0.03, release: 0.16, curve: "linear", invert: false, enabled: true },
    { id: "r-high-bars", source: "high", target: "bars.high", amount: 1.0, threshold: 0.01, attack: 0.01, release: 0.1, curve: "log", invert: false, enabled: true },
    { id: "r-width-spread", source: "width", target: "stereo", amount: 0.8, threshold: 0.02, attack: 0.12, release: 0.35, curve: "linear", invert: false, enabled: true },
    { id: "r-kick-camera", source: "kick", target: "camera", amount: 0.35, threshold: 0.08, attack: 0.006, release: 0.1, curve: "expo", invert: false, enabled: true }
  ];
  const visualConfig = { preset: "OBSERVATORY", motion: !reducedMotion, routes: defaultRoutes.map(route => ({ ...route })) };
  const audioMetrics = { low: 0, sub: 0, bass: 0, mid: 0, high: 0, rms: 0, kick: 0, transient: 0, width: 0 };
  const routeMemory = new Map();
  const clamp01 = value => THREE.MathUtils.clamp(Number(value) || 0, 0, 1);
  function routeEnergy(target, fallback, deltaSeconds = 1 / 60) {
    const configured = visualConfig.routes.filter(route => route.target === target);
    if (!configured.length) return clamp01(fallback);
    const active = configured.filter(route => route.enabled !== false);
    if (!active.length) return 0;
    const energy = active.reduce((sum, route, index) => {
      const input = clamp01(audioMetrics[route.source]);
      const threshold = clamp01(route.threshold);
      let raw = THREE.MathUtils.clamp((input - threshold) / Math.max(0.001, 1 - threshold), 0, 1);
      if (route.invert) raw = 1 - raw;
      if (route.curve === "expo") raw *= raw;
      else if (route.curve === "log") raw = Math.log1p(raw * 9) / Math.log(10);
      const key = String(route.id || (route.source + ":" + route.target + ":" + index));
      const previous = routeMemory.get(key) || 0;
      const time = raw > previous ? route.attack : route.release;
      const coefficient = 1 - Math.exp(-deltaSeconds / Math.max(0.005, Number(time) || 0.02));
      const current = previous + (raw - previous) * coefficient;
      routeMemory.set(key, current);
      return sum + current * Math.max(0, Number(route.amount) || 0);
    }, 0);
    return clamp01(energy);
  }
  let raf = 0, running = !document.hidden;
  const clock = new THREE.Clock();
  const panels = [...hud.querySelectorAll(":scope > .panel")];
  const panelDepth = panels.map((_, i) => [0.58, 0.86, 1, 1.08, 1.18, 1.28][i] || 1);
  let activePanel = null;

  function setAudioMetrics(metrics = {}) {
    low = clamp01(metrics.low);
    sub = clamp01(metrics.sub);
    bass = clamp01(metrics.bass ?? metrics.low);
    mid = clamp01(metrics.mid);
    high = clamp01(metrics.high);
    rms = clamp01(metrics.rms);
    kick = clamp01(metrics.kick);
    transient = clamp01(metrics.transient);
    width = clamp01(metrics.width);
    Object.assign(audioMetrics, { low, sub, bass, mid, high, rms, kick, transient, width });
    hasAudioMetrics = true;
  }

  function setVisualConfig(next = {}) {
    if (["OBSERVATORY", "MACHINE", "SIGNAL", "VOID"].includes(next.preset)) visualConfig.preset = next.preset;
    if (typeof next.motion === "boolean") visualConfig.motion = next.motion;
    if (Array.isArray(next.routes)) {
      visualConfig.routes = next.routes.slice(0, 32).map((route, index) => ({
        id: String(route.id || ("route-" + index)),
        source: String(route.source || "rms"),
        target: String(route.target || "core"),
        amount: THREE.MathUtils.clamp(Number(route.amount) || 0, 0, 2),
        threshold: clamp01(route.threshold),
        attack: THREE.MathUtils.clamp(Number(route.attack) || 0.02, 0.005, 1),
        release: THREE.MathUtils.clamp(Number(route.release) || 0.15, 0.005, 2),
        curve: ["linear", "expo", "log"].includes(route.curve) ? route.curve : "linear",
        invert: route.invert === true,
        enabled: route.enabled !== false
      }));
      routeMemory.clear();
    }
    if (visualConfig.motion && running && !raf) raf = requestAnimationFrame(render);
    if (!visualConfig.motion && reducedMotion && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
      renderer.render(scene, camera);
    }
  }

  function setAccent(value) {
    const color = new THREE.Color(value);
    keyLight.color.copy(color);
    innerCore.material.color.copy(color);
    edgeLines.material.color.copy(color);
    shockwaveMeshes.forEach(wave => wave.material.color.copy(color));
    rings.children.forEach(ring => ring.material.color.copy(color));
  }

  window.PSScene3D = Object.freeze({ setAudioMetrics, setVisualConfig, setAccent });

  function onPointerMove(event) {
    if (event.pointerType === "touch") return;
    targetX = (event.clientX / Math.max(1, innerWidth) - 0.5) * 2;
    targetY = (event.clientY / Math.max(1, innerHeight) - 0.5) * -2;

    const panel = event.target.closest(".hud > .panel");
    if (panel && panel.parentElement === hud) {
      if (panel !== activePanel) {
        activePanel?.classList.remove("is-focused");
        activePanel = panel;
        activePanel.classList.add("is-focused");
        hud.classList.add("is-focusing");
      }
      const rect = panel.getBoundingClientRect();
      panel.style.setProperty("--glow-x", `${((event.clientX - rect.left) / rect.width * 100).toFixed(1)}%`);
      panel.style.setProperty("--glow-y", `${((event.clientY - rect.top) / rect.height * 100).toFixed(1)}%`);
    } else {
      activePanel?.classList.remove("is-focused");
      activePanel = null;
      hud.classList.remove("is-focusing");
    }
  }

  function render() {
    raf = 0;
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = visualConfig.motion ? clock.elapsedTime : 0;
    const damping = 1 - Math.exp(-dt * 5.5);
    const motionFactor = visualConfig.motion ? 1 : 0;
    pointerX += ((targetX * motionFactor) - pointerX) * damping;
    pointerY += ((targetY * motionFactor) - pointerY) * damping;

    camera.position.x += (pointerX * 0.72 - camera.position.x) * damping;
    camera.position.y += (4.2 + pointerY * 0.48 - camera.position.y) * damping;
    const cameraEnergy = routeEnergy("camera", kick, dt);
    camera.position.z += (19 - cameraEnergy * 0.16 - camera.position.z) * damping;
    camera.lookAt(pointerX * 0.22, pointerY * 0.12, -0.8);
    root.rotation.y += (pointerX * 0.035 - root.rotation.y) * damping;
    root.rotation.x += (pointerY * 0.018 - root.rotation.x) * damping;

    const lowPulse = hasAudioMetrics ? low : (0.035 + Math.sin(t * 0.7) * 0.012);
    const midPulse = hasAudioMetrics ? mid : (0.025 + Math.sin(t * 1.1 + 1) * 0.01);
    const highPulse = hasAudioMetrics ? high : (0.02 + Math.sin(t * 2.1 + 2) * 0.008);
    const presetScale = visualConfig.preset === "MACHINE" ? 1.22
      : visualConfig.preset === "SIGNAL" ? 1.1
      : visualConfig.preset === "VOID" ? 0.48 : 1;
    const terrainEnergy = routeEnergy("terrain", lowPulse, dt) * presetScale;
    const coreEnergy = routeEnergy("core", midPulse, dt) * presetScale;
    const subEnergy = routeEnergy("rings", sub, dt) * presetScale;
    const particleEnergy = routeEnergy("particles", highPulse, dt) * presetScale;
    const shockEnergy = routeEnergy("shockwave", kick, dt);
    const stereoEnergy = routeEnergy("stereo", width, dt);

    for (let i = 0; i < terrainPositions.count; i++) {
      const x = terrainBase[i * 3], z = terrainBase[i * 3 + 2];
      const waveA = Math.sin(x * 0.42 + t * 0.55) * 0.12;
      const waveB = Math.cos(z * 0.64 - t * 0.34) * 0.09;
      const basin = Math.exp(-(x*x + z*z) * 0.012);
      terrainPositions.array[i * 3 + 1] = terrainBase[i * 3 + 1] + (waveA + waveB) * (0.35 + terrainEnergy * 2.4) + basin * terrainEnergy * 0.34;
    }
    terrainPositions.needsUpdate = true;
    terrainGeometry.computeVertexNormals();

    monolith.rotation.y = Math.sin(t * 0.22) * 0.035 + pointerX * 0.025;
    monolith.rotation.x = pointerY * 0.018;
    innerCore.material.opacity = THREE.MathUtils.clamp(0.28 + coreEnergy * 0.55 + shockEnergy * 0.12, 0.2, 0.95);
    bodyMaterial.emissiveIntensity = 0.28 + coreEnergy * 1.05;
    keyLight.intensity = 18 + terrainEnergy * 22 + rms * 9 + shockEnergy * 12;
    rings.scale.setScalar(1 + subEnergy * 0.12);
    root.scale.x += ((1 + stereoEnergy * 0.16) - root.scale.x) * damping;

    if (shockEnergy > 0.52 && previousKick <= 0.52) {
      shockwaveAges[shockwaveCursor] = 0;
      shockwaveCursor = (shockwaveCursor + 1) % shockwaveAges.length;
    }
    previousKick = shockEnergy;
    shockwaveMeshes.forEach((wave, index) => {
      shockwaveAges[index] += dt;
      const progress = THREE.MathUtils.clamp(shockwaveAges[index] / 0.72, 0, 1);
      wave.scale.setScalar(0.8 + progress * 6.1);
      wave.material.opacity = (1 - progress) * (0.62 + shockEnergy * 0.18);
    });

    bandGroups.forEach(({ mesh, spec }, groupIndex) => {
      const target = ["bars.low", "bars.mid", "bars.high"][groupIndex];
      const energy = routeEnergy(target, [lowPulse, midPulse, highPulse][groupIndex], dt) * presetScale;
      const dummy = new THREE.Object3D();
      for (let i = 0; i < spec.count; i++) {
        const angle = (i / spec.count) * Math.PI * 2;
        const harmonic = 0.5 + 0.5 * Math.sin(i * 0.73 + t * (0.45 + groupIndex * 0.25));
        const barHeight = 0.16 + harmonic * spec.height * (0.25 + energy * 1.8);
        dummy.position.set(Math.cos(angle) * spec.radius, barHeight * 0.5 - 0.5, Math.sin(angle) * spec.radius + spec.z);
        dummy.scale.set(1, barHeight, 1);
        dummy.rotation.y = -angle;
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    });

    particles.rotation.y = (visualConfig.motion ? t * 0.008 : 0) - pointerX * 0.018;
    particleMaterial.opacity = THREE.MathUtils.clamp(0.22 + particleEnergy * 0.62 + transient * 0.12, 0.08, 0.9);
    particleMaterial.size = 0.028 + particleEnergy * 0.045 + transient * 0.018;
    panels.forEach((panel, index) => {
      const d = panelDepth[index];
      panel.style.setProperty("--ps-x", `${(pointerX * 8 * d).toFixed(2)}px`);
      panel.style.setProperty("--ps-y", `${(pointerY * 6 * d).toFixed(2)}px`);
      panel.style.setProperty("--ps-rx", `${(pointerY * -0.65 * d).toFixed(2)}deg`);
      panel.style.setProperty("--ps-ry", `${(pointerX * 0.85 * d).toFixed(2)}deg`);
      panel.style.setProperty("--ps-z", `${(d * 3).toFixed(1)}px`);
    });

    renderer.render(scene, camera);
    raf = requestAnimationFrame(render);
  }

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / Math.max(1, innerHeight);
    camera.updateProjectionMatrix();
  }

  document.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running && !raf) raf = requestAnimationFrame(render);
    if (!running && raf) { cancelAnimationFrame(raf); raf = 0; }
  });
  window.addEventListener("blur", () => {
    targetX = targetY = 0;
    activePanel?.classList.remove("is-focused");
    activePanel = null;
    hud.classList.remove("is-focusing");
  });
  document.getElementById("accentPicker")?.addEventListener("input", event => {
    const color = new THREE.Color(event.target.value);
    keyLight.color.copy(color);
    innerCore.material.color.copy(color);
    edgeLines.material.color.copy(color);
    rings.children.forEach(ring => ring.material.color.copy(color));
  });

  if (!reducedMotion) raf = requestAnimationFrame(render);
  else renderer.render(scene, camera);
})();
