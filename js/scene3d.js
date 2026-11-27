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
  const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({
    color: 0x9db9bd, size: 0.035, transparent: true, opacity: 0.42,
    sizeAttenuation: true, depthWrite: false
  }));
  root.add(particles);

  let targetX = 0, targetY = 0, pointerX = 0, pointerY = 0;
  let low = 0, mid = 0, high = 0, rms = 0;
  let hasAudioMetrics = false;
  let raf = 0, running = !document.hidden;
  const clock = new THREE.Clock();
  const panels = [...hud.querySelectorAll(":scope > .panel")];
  const panelDepth = panels.map((_, i) => [0.58, 0.86, 1, 1.08, 1.18, 1.28][i] || 1);
  let activePanel = null;

  function setAudioMetrics(metrics = {}) {
    low = THREE.MathUtils.clamp(Number(metrics.low) || 0, 0, 1);
    mid = THREE.MathUtils.clamp(Number(metrics.mid) || 0, 0, 1);
    high = THREE.MathUtils.clamp(Number(metrics.high) || 0, 0, 1);
    rms = THREE.MathUtils.clamp(Number(metrics.rms) || 0, 0, 1);
    hasAudioMetrics = true;
  }
  window.PSScene3D = Object.freeze({ setAudioMetrics });

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
    const t = clock.elapsedTime;
    const damping = 1 - Math.exp(-dt * 5.5);
    pointerX += (targetX - pointerX) * damping;
    pointerY += (targetY - pointerY) * damping;

    camera.position.x += (pointerX * 0.72 - camera.position.x) * damping;
    camera.position.y += (4.2 + pointerY * 0.48 - camera.position.y) * damping;
    camera.lookAt(pointerX * 0.22, pointerY * 0.12, -0.8);
    root.rotation.y += (pointerX * 0.035 - root.rotation.y) * damping;
    root.rotation.x += (pointerY * 0.018 - root.rotation.x) * damping;

    const lowPulse = hasAudioMetrics ? low : (0.035 + Math.sin(t * 0.7) * 0.012);
    const midPulse = hasAudioMetrics ? mid : (0.025 + Math.sin(t * 1.1 + 1) * 0.01);
    const highPulse = hasAudioMetrics ? high : (0.02 + Math.sin(t * 2.1 + 2) * 0.008);

    for (let i = 0; i < terrainPositions.count; i++) {
      const x = terrainBase[i * 3], z = terrainBase[i * 3 + 2];
      const waveA = Math.sin(x * 0.42 + t * 0.55) * 0.12;
      const waveB = Math.cos(z * 0.64 - t * 0.34) * 0.09;
      const basin = Math.exp(-(x*x + z*z) * 0.012);
      terrainPositions.array[i * 3 + 1] = terrainBase[i * 3 + 1] + (waveA + waveB) * (0.35 + lowPulse * 1.8) + basin * lowPulse * 0.22;
    }
    terrainPositions.needsUpdate = true;
    terrainGeometry.computeVertexNormals();

    monolith.rotation.y = Math.sin(t * 0.22) * 0.035 + pointerX * 0.025;
    monolith.rotation.x = pointerY * 0.018;
    innerCore.material.opacity = 0.34 + midPulse * 0.48;
    keyLight.intensity = 20 + lowPulse * 18 + rms * 10;

    bandGroups.forEach(({ mesh, spec }, groupIndex) => {
      const energy = [lowPulse, midPulse, highPulse][groupIndex];
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

    particles.rotation.y = t * 0.008 - pointerX * 0.018;
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
