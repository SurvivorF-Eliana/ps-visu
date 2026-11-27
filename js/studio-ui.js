(() => {
  "use strict";

  const STORAGE_KEY = "ps-visualizer-studio-v13";
  const SOURCES = ["kick", "sub", "bass", "low", "mid", "high", "transient", "width", "rms"];
  const TARGETS = ["shockwave", "terrain", "core", "rings", "particles", "bars.low", "bars.mid", "bars.high", "stereo", "camera"];
  const DEFAULT_ROUTES = [
    { source: "kick", target: "shockwave", amount: 1, threshold: 0.04, enabled: true },
    { source: "sub", target: "rings", amount: 0.9, threshold: 0.02, enabled: true },
    { source: "bass", target: "terrain", amount: 1, threshold: 0.02, enabled: true },
    { source: "mid", target: "core", amount: 0.9, threshold: 0.02, enabled: true },
    { source: "high", target: "particles", amount: 1, threshold: 0.02, enabled: true },
    { source: "low", target: "bars.low", amount: 1, threshold: 0.01, enabled: true },
    { source: "mid", target: "bars.mid", amount: 1, threshold: 0.01, enabled: true },
    { source: "high", target: "bars.high", amount: 1, threshold: 0.01, enabled: true },
    { source: "width", target: "stereo", amount: 0.8, threshold: 0.02, enabled: true },
    { source: "kick", target: "camera", amount: 0.35, threshold: 0.08, enabled: true }
  ];
  const PRESETS = ["OBSERVATORY", "MACHINE", "SIGNAL", "VOID"];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
  const cloneRoutes = routes => routes.map(route => ({ ...route }));

  let state = {
    preset: "OBSERVATORY",
    motion: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    routes: cloneRoutes(DEFAULT_ROUTES),
    panels: {}
  };

  function safeRead() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object") return;
      if (PRESETS.includes(saved.preset)) state.preset = saved.preset;
      if (typeof saved.motion === "boolean") state.motion = saved.motion;
      if (Array.isArray(saved.routes)) {
        state.routes = saved.routes.slice(0, 32).map(route => ({
          source: SOURCES.includes(route.source) ? route.source : "rms",
          target: TARGETS.includes(route.target) ? route.target : "core",
          amount: clamp(route.amount, 0, 2),
          threshold: clamp(route.threshold, 0, 1),
          enabled: route.enabled !== false
        }));
      }
      if (saved.panels && typeof saved.panels === "object") state.panels = saved.panels;
    } catch (error) {
      console.warn("[PS Studio] Could not read saved layout.", error);
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("[PS Studio] Could not save layout.", error);
    }
  }

  const style = document.createElement("style");
  style.id = "ps-studio-v13-styles";
  style.textContent = [
    "#ps-studio-toggle{position:fixed;right:18px;bottom:18px;z-index:12000;border:1px solid rgba(214,255,0,.55);background:rgba(3,10,13,.94);color:var(--accent,#d6ff00);padding:11px 15px;font:600 11px/1.2 'Host Grotesk',sans-serif;letter-spacing:1.5px;cursor:pointer;box-shadow:0 8px 28px #0009;backdrop-filter:blur(14px)}",
    "#ps-studio-toggle:hover{background:rgba(214,255,0,.14);box-shadow:0 0 24px rgba(214,255,0,.15)}",
    "#ps-studio-dock{position:fixed;right:18px;bottom:70px;z-index:11999;width:min(410px,calc(100vw - 28px));max-height:min(78vh,780px);overflow:auto;background:rgba(4,11,15,.97);border:1px solid rgba(214,255,0,.34);color:#e6edf0;box-shadow:0 18px 60px #000b;backdrop-filter:blur(18px);font:12px/1.45 'Host Grotesk',sans-serif;display:none}",
    "#ps-studio-dock.is-open{display:block}",
    ".ps-studio-head{position:sticky;top:0;z-index:3;display:flex;justify-content:space-between;align-items:center;padding:13px 15px;background:rgba(5,17,21,.98);border-bottom:1px solid rgba(214,255,0,.22)}",
    ".ps-studio-title{font-size:12px;font-weight:600;letter-spacing:2px;color:var(--accent,#d6ff00)}",
    ".ps-studio-sub{font-size:9px;color:#85969b;letter-spacing:1.2px;margin-top:2px}",
    ".ps-studio-close,.ps-studio-action{border:1px solid #34464b;background:#0a1519;color:#dce7e9;padding:6px 9px;font:inherit;cursor:pointer}",
    ".ps-studio-close:hover,.ps-studio-action:hover{border-color:var(--accent,#d6ff00);color:var(--accent,#d6ff00)}",
    ".ps-studio-section{padding:13px 15px;border-bottom:1px solid rgba(150,190,195,.12)}",
    ".ps-studio-section h3{font-size:9px;letter-spacing:1.7px;color:#a8bac0;font-weight:600;margin:0 0 10px}",
    ".ps-studio-field{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:8px 0}",
    ".ps-studio-field label{color:#9cabb0;font-size:10px;letter-spacing:.6px}",
    ".ps-studio-field select,.ps-route select{background:#081317;color:#e5eef0;border:1px solid #314248;padding:6px 7px;font:inherit;min-width:0}",
    ".ps-studio-field input[type=checkbox],.ps-route input[type=checkbox]{accent-color:#d6ff00}",
    ".ps-studio-live{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}",
    ".ps-studio-live span{font:10px/1.4 ui-monospace,monospace;color:#b8c8cc;border:1px solid #263b40;background:#071115;padding:4px 6px}",
    ".ps-route{display:grid;grid-template-columns:1fr 1fr 28px;gap:6px;align-items:center;padding:8px 0;border-top:1px solid rgba(150,190,195,.1)}",
    ".ps-route:first-child{border-top:0}",
    ".ps-route select{width:100%;font-size:10px}",
    ".ps-route-range{grid-column:1/3;display:grid;grid-template-columns:1fr 1fr;gap:8px}",
    ".ps-route-range label{font-size:9px;color:#82969b;display:flex;align-items:center;gap:5px}",
    ".ps-route-range input{width:100%;min-width:0;accent-color:#d6ff00}",
    ".ps-route-remove{background:none;border:1px solid #3d4549;color:#9aa7ab;width:26px;height:26px;cursor:pointer}",
    ".ps-route-remove:hover{border-color:#ff4660;color:#ff7184}",
    ".ps-route-enable{font-size:9px;color:#8fa2a8;display:flex;gap:5px;align-items:center}",
    ".ps-studio-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}",
    ".ps-studio-note{font-size:9px;color:#6f858c;line-height:1.5;margin-top:8px}",
    ".ps-panel-tools{position:absolute;top:7px;right:8px;z-index:40;display:flex;gap:4px;opacity:.38;transition:opacity .15s}",
    ".panel:hover>.ps-panel-tools,.ps-floating-panel>.ps-panel-tools{opacity:1}",
    ".ps-panel-tools button{background:rgba(2,8,11,.9);border:1px solid rgba(180,210,210,.3);color:#c2d2d4;padding:4px 7px;font:9px/1.2 ui-monospace,monospace;letter-spacing:.7px;cursor:pointer}",
    ".ps-panel-tools button:hover{border-color:var(--accent,#d6ff00);color:var(--accent,#d6ff00)}",
    ".ps-floating-panel{position:fixed!important;z-index:11000!important;display:block!important;max-width:calc(100vw - 20px);max-height:82vh;overflow:auto;resize:both;transform:none!important;clip-path:none!important;border:1px solid rgba(214,255,0,.44)!important;border-radius:2px!important;background:linear-gradient(145deg,rgba(5,18,23,.98),rgba(3,8,12,.98))!important;box-shadow:0 18px 48px #000b,0 0 22px rgba(214,255,0,.07)!important}",
    ".ps-floating-panel>.ps-panel-tools{position:sticky;float:right;top:0;margin-bottom:-30px}",
    ".ps-floating-panel>.ps-panel-tools button{background:#071216}",
    ".ps-panel-placeholder{pointer-events:none;min-width:0;border:1px dashed rgba(214,255,0,.16);background:rgba(214,255,0,.018);clip-path:none!important}",
    ".ps-panel-grip{cursor:grab;touch-action:none}",
    ".ps-panel-grip:active{cursor:grabbing}",
    "@media(max-width:680px){#ps-studio-dock{right:10px;bottom:64px;width:calc(100vw - 20px);max-height:74vh}#ps-studio-toggle{right:10px;bottom:10px}.ps-panel-tools{opacity:1}.ps-floating-panel{resize:none;width:min(92vw,440px)!important;left:4vw!important;max-height:70vh}}",
    "@media(prefers-reduced-motion:reduce){#ps-studio-toggle,.ps-panel-tools button{transition:none}}"
  ].join("\n");
  document.head.appendChild(style);

  const toggle = document.createElement("button");
  toggle.id = "ps-studio-toggle";
  toggle.type = "button";
  toggle.textContent = "◈  STUDIO / V13";
  toggle.setAttribute("aria-expanded", "false");
  document.body.appendChild(toggle);

  const dock = document.createElement("aside");
  dock.id = "ps-studio-dock";
  dock.setAttribute("aria-label", "PS Visualizer Studio");
  dock.innerHTML =
    '<div class="ps-studio-head"><div><div class="ps-studio-title">PS / SPATIAL STUDIO</div><div class="ps-studio-sub">V13 · AUDIO REACTIVITY SYSTEM</div></div><button class="ps-studio-close" type="button" aria-label="Close studio">×</button></div>' +
    '<section class="ps-studio-section"><h3>01 / SCENE PROFILE</h3><div class="ps-studio-field"><label for="ps-scene-preset">ENVIRONMENT</label><select id="ps-scene-preset"><option>OBSERVATORY</option><option>MACHINE</option><option>SIGNAL</option><option>VOID</option></select></div><div class="ps-studio-field"><label for="ps-motion">PARALLAX / AMBIENT MOTION</label><input id="ps-motion" type="checkbox"></div><div class="ps-studio-live" id="ps-live-metrics"><span>KICK 0.00</span><span>SUB 0.00</span><span>MID 0.00</span><span>HIGH 0.00</span><span>WIDTH 0.00</span></div><div class="ps-studio-note">Live analysis is read-only. Monitor mode and visual routing are independent.</div></section>' +
    '<section class="ps-studio-section"><h3>02 / REACTIVITY MATRIX</h3><div id="ps-route-list"></div><div class="ps-studio-actions"><button class="ps-studio-action" id="ps-add-route" type="button">+ ADD ROUTE</button><button class="ps-studio-action" id="ps-reset-routes" type="button">RESET MATRIX</button></div><div class="ps-studio-note">Amount controls modulation depth. Threshold rejects low-level energy. Multiple sources can drive the same visual target.</div></section>' +
    '<section class="ps-studio-section"><h3>03 / SPATIAL LAYOUT</h3><div class="ps-studio-actions"><button class="ps-studio-action" id="ps-save-layout" type="button">SAVE LAYOUT</button><button class="ps-studio-action" id="ps-restore-layout" type="button">RESTORE</button><button class="ps-studio-action" id="ps-dock-all" type="button">DOCK ALL</button></div><div class="ps-studio-note">Use PIN on an existing HUD panel to detach it as a floating window. Drag it by its grip, lock it in place or dock it back into the grid.</div></section>';
  document.body.appendChild(dock);

  function makeSelect(options, value, key, routeIndex) {
    const select = document.createElement("select");
    select.dataset.key = key;
    select.dataset.routeIndex = String(routeIndex);
    options.forEach(option => {
      const item = document.createElement("option");
      item.value = option;
      item.textContent = option.toUpperCase();
      select.appendChild(item);
    });
    select.value = value;
    return select;
  }

  function renderRoutes() {
    const list = dock.querySelector("#ps-route-list");
    list.replaceChildren();
    state.routes.forEach((route, index) => {
      const row = document.createElement("div");
      row.className = "ps-route";
      row.appendChild(makeSelect(SOURCES, route.source, "source", index));
      row.appendChild(makeSelect(TARGETS, route.target, "target", index));
      const remove = document.createElement("button");
      remove.className = "ps-route-remove";
      remove.type = "button";
      remove.textContent = "×";
      remove.dataset.removeRoute = String(index);
      remove.setAttribute("aria-label", "Remove route");
      row.appendChild(remove);

      const range = document.createElement("div");
      range.className = "ps-route-range";
      const amountLabel = document.createElement("label");
      amountLabel.textContent = "AMOUNT " + route.amount.toFixed(2);
      const amount = document.createElement("input");
      amount.type = "range"; amount.min = "0"; amount.max = "2"; amount.step = "0.05";
      amount.value = String(route.amount); amount.dataset.key = "amount"; amount.dataset.routeIndex = String(index);
      amountLabel.appendChild(amount);

      const thresholdLabel = document.createElement("label");
      thresholdLabel.textContent = "THRESHOLD " + route.threshold.toFixed(2);
      const threshold = document.createElement("input");
      threshold.type = "range"; threshold.min = "0"; threshold.max = "0.8"; threshold.step = "0.01";
      threshold.value = String(route.threshold); threshold.dataset.key = "threshold"; threshold.dataset.routeIndex = String(index);
      thresholdLabel.appendChild(threshold);
      range.append(amountLabel, thresholdLabel);
      row.appendChild(range);

      const enabledLabel = document.createElement("label");
      enabledLabel.className = "ps-route-enable";
      const enabled = document.createElement("input");
      enabled.type = "checkbox"; enabled.checked = route.enabled !== false;
      enabled.dataset.key = "enabled"; enabled.dataset.routeIndex = String(index);
      enabledLabel.append(enabled, document.createTextNode("ACTIVE"));
      row.appendChild(enabledLabel);
      list.appendChild(row);
    });
  }

  function applyConfig() {
    window.PSScene3D?.setVisualConfig({
      preset: state.preset,
      motion: state.motion,
      routes: state.routes
    });
    const live = dock.querySelector("#ps-live-metrics");
    if (live) live.dataset.ready = window.PSScene3D ? "true" : "pending";
  }

  function presetRoutes(name) {
    const routes = cloneRoutes(DEFAULT_ROUTES);
    const amount = name === "MACHINE" ? 1.35 : name === "SIGNAL" ? 1.15 : name === "VOID" ? 0.42 : 1;
    routes.forEach(route => { route.amount = clamp(route.amount * amount, 0, 2); });
    if (name === "MACHINE") {
      routes.find(route => route.target === "camera").amount = 0.65;
      routes.find(route => route.target === "shockwave").amount = 1.55;
    }
    if (name === "SIGNAL") {
      routes.find(route => route.target === "particles").amount = 1.6;
      routes.find(route => route.target === "bars.high").amount = 1.5;
    }
    return routes;
  }

  function applyStateToControls() {
    dock.querySelector("#ps-scene-preset").value = state.preset;
    dock.querySelector("#ps-motion").checked = state.motion;
    renderRoutes();
    applyConfig();
  }

  dock.addEventListener("click", event => {
    const remove = event.target.closest("[data-remove-route]");
    if (remove) {
      state.routes.splice(Number(remove.dataset.removeRoute), 1);
      renderRoutes(); applyConfig(); persist();
    }
  });
  dock.addEventListener("input", event => {
    const index = Number(event.target.dataset.routeIndex);
    const key = event.target.dataset.key;
    if (!Number.isInteger(index) || !state.routes[index] || !key) return;
    const value = key === "enabled" ? event.target.checked : key === "source" || key === "target" ? event.target.value : Number(event.target.value);
    state.routes[index][key] = value;
    if (key === "amount" || key === "threshold") {
      const label = event.target.parentElement;
      label.firstChild.textContent = key.toUpperCase() + " " + Number(value).toFixed(2);
    }
    applyConfig(); persist();
  });
  dock.querySelector("#ps-scene-preset").addEventListener("change", event => {
    state.preset = PRESETS.includes(event.target.value) ? event.target.value : "OBSERVATORY";
    state.routes = presetRoutes(state.preset);
    renderRoutes(); applyConfig(); persist();
  });
  dock.querySelector("#ps-motion").addEventListener("change", event => {
    state.motion = event.target.checked;
    applyConfig(); persist();
  });
  dock.querySelector("#ps-add-route").addEventListener("click", () => {
    if (state.routes.length >= 32) return;
    state.routes.push({ source: "rms", target: "core", amount: 0.7, threshold: 0.04, enabled: true });
    renderRoutes(); applyConfig(); persist();
  });
  dock.querySelector("#ps-reset-routes").addEventListener("click", () => {
    state.routes = cloneRoutes(DEFAULT_ROUTES);
    renderRoutes(); applyConfig(); persist();
  });
  dock.querySelector("#ps-save-layout").addEventListener("click", () => { savePanelLayout(); persist(); });
  dock.querySelector("#ps-restore-layout").addEventListener("click", () => { restorePanelLayout(); applyStateToControls(); });
  dock.querySelector("#ps-dock-all").addEventListener("click", () => {
    document.querySelectorAll(".ps-floating-panel").forEach(dockPanel);
    savePanelLayout(); persist();
  });
  toggle.addEventListener("click", () => {
    const open = dock.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  dock.querySelector(".ps-studio-close").addEventListener("click", () => {
    dock.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false");
  });

  const panelRecords = new Map();
  function panelKey(panel, index) {
    return panel.id || panel.dataset.psPanelId || panel.classList[1] || ("panel-" + index);
  }
  function addPanelControls() {
    const panels = [...document.querySelectorAll(".hud > .panel")];
    panels.forEach((panel, index) => {
      const key = panelKey(panel, index);
      panel.dataset.psPanelId = key;
      if (panelRecords.has(key)) return;
      const toolbar = document.createElement("div");
      toolbar.className = "ps-panel-tools";
      const grip = document.createElement("button");
      grip.type = "button"; grip.className = "ps-panel-grip"; grip.textContent = "⠿";
      grip.title = "Drag floating panel";
      const pin = document.createElement("button");
      pin.type = "button"; pin.textContent = "PIN"; pin.title = "Float this panel";
      const lock = document.createElement("button");
      lock.type = "button"; lock.textContent = "UNLOCK"; lock.title = "Lock panel position";
      toolbar.append(grip, pin, lock);
      panel.appendChild(toolbar);
      const record = { panel, key, toolbar, grip, pin, lock, placeholder: null, originalStyle: panel.getAttribute("style"), locked: false };
      panelRecords.set(key, record);
      pin.addEventListener("click", () => {
        if (record.placeholder) dockPanel(panel);
        else floatPanel(panel);
      });
      lock.addEventListener("click", () => {
        record.locked = !record.locked;
        lock.textContent = record.locked ? "LOCKED" : "UNLOCK";
        grip.style.opacity = record.locked ? "0.3" : "1";
      });
      enableDrag(record);
    });
  }

  function floatPanel(panel, saved) {
    const record = [...panelRecords.values()].find(item => item.panel === panel);
    if (!record || record.placeholder) return;
    const rect = panel.getBoundingClientRect();
    const computed = getComputedStyle(panel);
    const placeholder = document.createElement("div");
    placeholder.className = "ps-panel-placeholder";
    placeholder.style.gridColumn = computed.gridColumn;
    placeholder.style.gridRow = computed.gridRow;
    placeholder.style.minHeight = Math.max(90, rect.height) + "px";
    placeholder.style.width = "100%";
    panel.parentNode.insertBefore(placeholder, panel);
    record.placeholder = placeholder;
    panel.classList.add("ps-floating-panel");
    document.body.appendChild(panel);
    panel.style.left = (saved?.x ?? clamp(rect.left, 8, window.innerWidth - 240)) + "px";
    panel.style.top = (saved?.y ?? clamp(rect.top, 8, window.innerHeight - 120)) + "px";
    panel.style.width = (saved?.width ?? rect.width) + "px";
    panel.style.height = (saved?.height ?? Math.min(rect.height, window.innerHeight * 0.78)) + "px";
    panel.dataset.psFloating = "true";
    record.pin.textContent = "DOCK";
    if (saved?.locked) {
      record.locked = true;
      record.lock.textContent = "LOCKED";
      record.grip.style.opacity = "0.3";
    }
  }

  function dockPanel(panel) {
    const record = [...panelRecords.values()].find(item => item.panel === panel);
    if (!record || !record.placeholder) return;
    record.placeholder.parentNode.insertBefore(panel, record.placeholder);
    record.placeholder.remove();
    record.placeholder = null;
    panel.classList.remove("ps-floating-panel");
    panel.removeAttribute("data-ps-floating");
    if (record.originalStyle === null) panel.removeAttribute("style");
    else panel.setAttribute("style", record.originalStyle);
    record.pin.textContent = "PIN";
    record.locked = false;
    record.lock.textContent = "UNLOCK";
    record.grip.style.opacity = "1";
  }

  function enableDrag(record) {
    record.grip.addEventListener("pointerdown", event => {
      if (!record.placeholder || record.locked || event.button !== 0) return;
      event.preventDefault();
      const panel = record.panel;
      const startX = event.clientX, startY = event.clientY;
      const originLeft = panel.offsetLeft, originTop = panel.offsetTop;
      const move = moveEvent => {
        panel.style.left = clamp(originLeft + moveEvent.clientX - startX, 0, window.innerWidth - panel.offsetWidth) + "px";
        panel.style.top = clamp(originTop + moveEvent.clientY - startY, 0, window.innerHeight - 80) + "px";
      };
      const stop = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
        savePanelLayout(); persist();
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", stop, { once: true });
    });
  }

  function savePanelLayout() {
    const layout = {};
    panelRecords.forEach(record => {
      const panel = record.panel;
      if (record.placeholder) {
        const rect = panel.getBoundingClientRect();
        layout[record.key] = {
          floating: true, x: rect.left, y: rect.top,
          width: rect.width, height: rect.height, locked: record.locked
        };
      } else {
        layout[record.key] = { floating: false };
      }
    });
    state.panels = layout;
  }

  function restorePanelLayout() {
    panelRecords.forEach(record => {
      const saved = state.panels[record.key];
      if (!saved?.floating) {
        if (record.placeholder) dockPanel(record.panel);
        return;
      }
      if (!record.placeholder) floatPanel(record.panel, saved);
      else {
        record.panel.style.left = saved.x + "px";
        record.panel.style.top = saved.y + "px";
        record.panel.style.width = saved.width + "px";
        record.panel.style.height = saved.height + "px";
        record.locked = !!saved.locked;
        record.lock.textContent = record.locked ? "LOCKED" : "UNLOCK";
        record.grip.style.opacity = record.locked ? "0.3" : "1";
      }
    });
  }

  safeRead();
  addPanelControls();
  applyStateToControls();
  restorePanelLayout();

  window.addEventListener("ps-audio-metrics", event => {
    const values = event.detail || {};
    const live = dock.querySelector("#ps-live-metrics");
    if (!live) return;
    const keys = ["kick", "sub", "mid", "high", "width"];
    live.replaceChildren(...keys.map(key => {
      const item = document.createElement("span");
      item.textContent = key.toUpperCase() + " " + clamp(values[key], 0, 1).toFixed(2);
      return item;
    }));
  });

  document.getElementById("accentPicker")?.addEventListener("input", event => {
    window.PSScene3D?.setAccent(event.target.value);
  });
  window.addEventListener("resize", () => {
    document.querySelectorAll(".ps-floating-panel").forEach(panel => {
      panel.style.left = clamp(panel.offsetLeft, 0, window.innerWidth - 220) + "px";
      panel.style.top = clamp(panel.offsetTop, 0, window.innerHeight - 90) + "px";
    });
  });
})();