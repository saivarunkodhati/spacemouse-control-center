# SpaceMouse Control Center — Architecture & Delivery Plan

Status: **Stage 1 complete (inspection + plan).** No application code changed in this stage.

---

## 1. Current codebase (as inspected)

Stack: Next.js 16 (App Router, client-rendered single page), React 19, Tailwind v4,
React Three Fiber / drei for the 3D puck, lucide-react icons, a minimal shadcn set
(`button`, `dialog`, `dropdown-menu`). pnpm. No backend, no database, no schema library.

### Layers

| Layer | Files | Responsibility |
| --- | --- | --- |
| Domain types | `lib/spacemouse/types.ts` | `AxisId`, `TelemetryFrame`, `DeviceSettings`, `AxisSettings`, `CalibrationData`, `Profile`, `NavSection`, logs, link stats |
| Constants | `lib/spacemouse/constants.ts` | Axis definitions, built-in profiles, default calibration, baud rates |
| Input pipeline | `lib/spacemouse/processing.ts` | calibration offset/span → clamp → invert → deadzone → curve → sensitivity × axis scale → dominant axis → exponential smoothing. Also the simulator and stats helpers |
| Wire protocol | `lib/spacemouse/protocol.ts` | Parses CSV / JSON / raw int16 lines from the device; builds `CFG`, `AXIS`, `CAL`, `SAVE` commands |
| Device link | `lib/spacemouse/use-serial-device.ts` | Web Serial connect/disconnect, read loop, line framing, TX, log, packet/byte/parse-error counters |
| Telemetry loop | `lib/spacemouse/use-telemetry.ts` | 20 Hz tick, chooses device vs simulator source, runs pipeline, keeps 240-sample raw/processed history, measures real packet rate |
| App state | `components/spacemouse/control-center-provider.tsx` | Single React context: section, profiles CRUD/import, active settings + dirty tracking, calibration, toast |
| Shell | `app-shell.tsx`, `sidebar.tsx`, `top-header.tsx`, `bottom-status-strip.tsx`, `toast-region.tsx` | Layout and navigation (5 sections) |
| Sections | `sections/calibration-section.tsx`, `device-settings-section.tsx`, `profiles-section.tsx`, `diagnostics-section.tsx` | Feature pages |
| Visuals | `device-visualizer-3d.tsx`, `three/*`, `axis-telemetry.tsx`, `quick-controls.tsx`, `ui-kit.tsx` | 3D puck, live axis bars, shared controls |

### What already works (must be preserved)

- Real Web Serial link to the Arduino Pro Micro (Chrome/Edge), with honest
  connected / disconnected / error states and unplug detection.
- Clear `simulated` vs `device` source labelling on all telemetry.
- Calibration wizard (rest sampling → offset/noise, range sweep → min/max), pushes `CAL` to firmware.
- Global device settings (sensitivity, deadzone, smoothing, curve, dominant axis, per-axis enable/invert/scale), pushes `CFG`/`AXIS`.
- Profiles: create, rename, duplicate, delete, JSON import/export.
- Diagnostics: link stats, measured update rate, raw vs processed view, serial log, manual command console.

### Gaps against the target product

1. **No persistence** — profiles, settings and calibration are lost on reload.
2. **No schema/versioning** — imports are trusted without validation.
3. Settings are global, not per-axis (sensitivity, speed, curve, deadzone, acceleration, limits).
4. Profiles are flat: no application binding, inheritance, buttons, shortcuts or macros.
5. Navigation is a `useState` switch — no URLs, no deep links, no back button.
6. One large context re-renders every consumer at 20 Hz.
7. No native component, so no system-wide input, app detection or key injection.
8. Pipeline has no noise filter selection (low-pass / complementary), no acceleration, no per-stage visibility.

---

## 2. Target architecture

```
┌──────────────────────────── Browser dashboard (this repo) ────────────────────────────┐
│ UI modules (13 routes)  ──►  Config engine (pure TS, versioned schema, undo/redo)     │
│                         ──►  Input pipeline (pure TS, shared with native via spec)   │
│                         ──►  Transport adapters:                                     │
│                                 • WebSerialTransport   (exists — direct to Pro Micro)│
│                                 • NativeServiceTransport (WebSocket 127.0.0.1)       │
│                                 • SimulatorTransport   (dev/test only, always labelled)
└───────────────────────────────────────────┬───────────────────────────────────────────┘
                                            │ ws://127.0.0.1:<port>  + pairing token
┌───────────────────────── Windows native service (new, C#/.NET 8) ─────────────────────┐
│ HID reader · pipeline · foreground-window watcher (SetWinEventHook) · profile resolver│
│ SendInput key/mouse emitter · macro runner · config store (%APPDATA%) · logging       │
└───────────────────────────────────────────────────────────────────────────────────────┘
                                            │ USB HID / CDC serial
                                 Arduino Pro Micro + MPU6050
```

### Key decisions

- **Keep the stack.** Next.js + React + Tailwind + R3F stay. Only two small dependencies
  will be proposed: `zod` (schema validation for config/import) and
  `@dnd-kit/sortable` for the macro editor (optional; native reordering buttons work without it).
- **Pure config engine** in `lib/config/` with no React imports, so it can be unit-tested
  and its JSON schema shared with the native service.
- **Transport abstraction.** Today the UI calls `useSerialDevice` directly. It will be wrapped
  behind a `DeviceTransport` interface so the native service becomes a drop-in source.
  Simulator remains, but is opt-in and always badged "SIMULATED".
- **Persistence: local-first.** This is a single-user desktop tool tied to local hardware, so
  configuration is stored locally (IndexedDB in the browser, `%APPDATA%\SpaceMouseCC\config.json`
  once the native service exists) with versioned migrations, automatic snapshots and corrupt-file
  recovery. A cloud database is not needed unless you later want cross-machine sync or a
  shared community profile library — I'll ask before adding one.
- **Profile inheritance** via sparse overrides: a profile stores `parentId` plus only the keys it
  overrides. The effective config is `resolve(parent) ⊕ overrides`, which makes "inherited vs
  customised" display and "propagate base change" trivial and lossless.
- **Honesty rules enforced in code.** Active application, service status, firmware version and
  performance metrics render as "Unavailable" until a real source reports them. No fabricated values.
- **Split context** into `useConfig`, `useDevice`, `useTelemetry` stores (with
  `useSyncExternalStore`) so 20 Hz telemetry does not re-render settings forms.
- **Routes.** Move from a state switch to App Router segments (`/calibration`, `/profiles`, …) under a
  shared layout, so every module is deep-linkable and the browser back button works.

### Configuration schema (v1, abridged)

```ts
interface ConfigFileV1 {
  schemaVersion: 1
  globals: GlobalSettings                 // device-wide defaults
  calibrations: CalibrationRecord[]       // history, one active
  profiles: ProfileV1[]                   // inheritance tree
  applications: AppBinding[]              // exe → profileId
  shortcuts: Shortcut[]
  macros: Macro[]
  presets: { control: ControlPreset[]; navigation: NavigationPreset[] }
}

interface ProfileV1 {
  id: string; name: string; category: string
  parentId: string | null
  overrides: DeepPartial<ProfileSettings> // only what differs from parent
}

interface ProfileSettings {
  axes: Record<AxisId, AxisConfig>        // enable, invert, sensitivity, speed, deadzone,
                                          // curve, scale, smoothing, acceleration,
                                          // maxOutput, minThreshold, mapping target
  navigation: NavigationSettings          // mode, speeds, pivot, rotation centre, zoom/rotation
                                          // reverse, dominant axis, projection preference
  buttons: Record<ButtonId, ButtonBinding> // single / double / long → ActionRef
  filter: { kind: 'none' | 'lowpass' | 'complementary'; cutoffHz: number; alpha: number }
}
```

---

## 3. Module map (13 modules)

| # | Module | Built from | Depends on |
| --- | --- | --- | --- |
| 1 | Dashboard | existing dashboard + status cards | all |
| 2 | Device Manager | existing connect UI + device info | transport |
| 3 | Control Mapping | existing device settings, expanded per-axis | config engine |
| 4 | Application Profiles | existing profiles + app bindings + inheritance | config engine |
| 5 | CAD/CAM Integration | per-app command catalogues (editable) | profiles |
| 6 | Button Configuration | new | actions, macros |
| 7 | Shortcut Manager | new (recorder, conflicts) | actions |
| 8 | Navigation Settings | new + live test scene | pipeline |
| 9 | Macros & Automation | new | actions |
| 10 | Calibration | existing wizard + history + drift | transport |
| 11 | Device Diagnostics | existing diagnostics + pipeline view | transport, pipeline |
| 12 | Configuration Manager | new (backups, versions, import/export) | persistence |
| 13 | Advanced Settings | new (filters, polling, service, transport) | all |

No duplicate pages: "Device Settings" becomes **Control Mapping**; existing Profiles becomes
**Application Profiles**. Their current features are kept and extended, not rebuilt.

---

## 4. Staged delivery plan

Each stage ends with a type-check, browser verification of every touched page, and a commit.

| Stage | Scope | Outcome |
| --- | --- | --- |
| 1 | Inspect + document | **This document** |
| 2 | Routing + 13-module navigation, split stores, persistence (IndexedDB, versioned + zod), undo/redo, global search, confirm dialogs | Every page reachable by URL; config survives reload. Modules not yet built show their real scope with no dead buttons |
| 3 | Per-axis 6DoF engine (all 11 axis parameters), movement modes, filters, acceleration, pipeline visualiser, control presets | Control Mapping + Diagnostics pipeline view |
| 4 | Profile inheritance, app bindings, categories, predefined app catalogue (Fusion 360, SOLIDWORKS, Creo, NX, …) with editable commands, profile comparison | Application Profiles + CAD/CAM Integration |
| 5 | Shortcut manager: recorder, modifiers, conflict detection/resolution, search/filter/sort, reset, import/export | Shortcut Manager |
| 6 | Buttons (single/double/long per app), navigation engine + presets + live test scene, macro editor + test | Buttons, Navigation, Macros |
| 7 | Configuration Manager: auto/manual backups, version history, restore, corrupt-file recovery, full export | Configuration Manager |
| 8 | Native service: C#/.NET 8 project in `native/`, documented WebSocket API, pairing token, dashboard transport + service status/start/stop | Dashboard talks to a real service |
| 9 | Firmware protocol v2 for Pro Micro + MPU6050 (handshake, firmware version, raw + fused data, button events, sensor status) + reference sketch | Real device info, buttons, sensor health |
| 10 | Foreground-window detection, auto profile switching, fallback profile, activation history, SendInput execution | System-wide behaviour |
| 11 | End-to-end testing and bug fixing | Release candidate |

### What this environment can and cannot verify

- Stages 2–7 run entirely in the browser, and I'll verify each one in the preview.
- Stages 8–10 produce Windows-native code. I can write, document and compile-check it, but I
  can't run it on Windows or against your physical Pro Micro from here. Those features stay
  labelled "not verified" until you run them locally and confirm.
