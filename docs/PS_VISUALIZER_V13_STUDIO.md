# PS Visualizer V13 — Spatial Studio

## Scope

V13 adds a configurable spatial presentation layer to the existing PS Visualizer. It does not change the audible routing, crossover listening gains, source playback chain, or master output path.

## Files changed

- `js/xo-engine.js`: moves the LOW/MID/HIGH analyser taps to the filter outputs before the monitor gains; adds a dedicated sub analyser branch; adds reusable RMS buffers, onset envelopes and stereo-width metrics.
- `js/scene3d.js`: consumes the expanded metrics contract; adds kick-triggered shockwaves, bass-driven terrain, sub-driven rings, high-frequency particle response, stereo spread, route shaping and visual presets.
- `js/studio-ui.js`: adds the Studio dock, editable reactivity matrix, presets, live readouts, floating/pinned HUD panels, collapse/expand, drag locking and local layout persistence.
- `ps-v-crossover.html`: loads the Studio UI module.

## Audio metric contract

`window.PSScene3D.setAudioMetrics(metrics)` accepts:

| Key | Meaning |
|---|---|
| `low` | RMS energy from the LOW filter analysis tap |
| `sub` | RMS energy from a dedicated 70 Hz low-pass analysis-only branch |
| `bass` | LOW energy alias used for terrain modulation |
| `mid` | RMS energy from the MID filter analysis tap |
| `high` | RMS energy from the HIGH filter analysis tap |
| `rms` | Master analyser RMS |
| `kick` | Smoothed low/sub positive-energy onset estimate |
| `transient` | Smoothed high-frequency positive-energy onset estimate |
| `width` | Stereo-width estimate derived from the existing L/R correlation |

All values are normalized to 0–1. The visual bridge is read-only. The dedicated sub branch terminates at analyser nodes and does not connect to the audible output.

## Reactivity Matrix

Each route maps one source to one visual target. It supports amount, threshold, attack, release, response curve (linear/exponential/logarithmic), inversion and enable/disable.

Sources: `kick`, `sub`, `bass`, `low`, `mid`, `high`, `transient`, `width`, `rms`.

Targets: `shockwave`, `terrain`, `core`, `rings`, `particles`, `bars.low`, `bars.mid`, `bars.high`, `stereo`, `camera`.

## Scene presets

- `OBSERVATORY`: balanced default.
- `MACHINE`: stronger mechanical movement and kick impact.
- `SIGNAL`: emphasizes high-frequency detail and particle response.
- `VOID`: reduced visual intensity.

## Spatial panels

Each direct HUD panel has:
- PIN / DOCK: detach to a floating window or return to the CSS grid.
- Drag grip: reposition floating panels.
- LOCKED: prevent accidental dragging.
- FOLD / OPEN: collapse the panel while retaining its first content row.

The Studio dock saves route settings, preset, motion preference and panel layout to local storage under `ps-visualizer-studio-v13`.

## Validation and known limits

- The V13 work is staged on `feature/ps-visualizer-v13-reactive-studio` in the `SurvivorF-Eliana/ps-visu` fork.
- Static integration checks confirm the three required script/file references and the expected V13 API names.
- Browser playback, WebGL performance, mobile touch interactions and perceptual tuning have not yet been verified on the live site.
- `kick` is a transient estimate based on positive changes in LOW/SUB RMS, not a trained drum classifier. Bass notes with sharp attacks can also trigger it. Threshold, attack and release are available in the matrix for tuning.
- LOW/MID/HIGH values follow the project's existing filter definitions; they are analysis bands, not a mathematically flat, phase-aligned three-way crossover.
- The visualization remains separate from the audible output. Audio playback and monitor-mode regression tests are still required before merging into the published repository.
