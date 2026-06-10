# V21_00_5 Patch Report — Field-Test Fixes

**Base:** V21_00_4 (currently on `main` + `test/`)
**Branch:** `v21_00_5_field_fixes`
**Trigger:** Field test on hauler PWA — Cyndy reported 5 issues; 4 patched here, 1 awaiting clarification.

## Summary

Four field-driven fixes:
1. **Pre-Trip DVIR gate on hauler entry** — when driver opens the hauler PWA with an active trip, force them through Pre-Trip DVIR before reaching Trip Detail.
2. **Louder Complete-trip block** — when Post-Trip DVIR is missing, show a full-screen blocking modal instead of a silent toast + tab flip.
3. **"Real Chevrons" fix** — Chrome auto-translate (Spanish→English) was mangling "Galones reales" into "Real Chevrons" (confused with the gas brand). Added `translate="no"` to the three hauler modal overlays to defeat browser MT.
4. **i18n strings for the new gate modal** in Spanish + English.

Bill To remains OCR-only (extracted from BOL photo) per user instruction.

## Fix #1 — Pre-Trip DVIR Gate on Hauler Entry

### Bug
When a hauler/chofer opens the PWA with an already-active trip (`C.state.activeTripId` set), `enterHaulerMode` called `C.navTrip()` directly, skipping Pre-Trip DVIR. Drivers were entering trip detail and recording loads without ever completing Pre-Trip — a DOT §396.13 violation.

### Patch
- `C.enterHaulerMode` now calls `ensurePreTripBeforeResume(C.state.activeTripId)` instead of jumping straight to trip detail.
- New `ensurePreTripBeforeResume(tripId)` reads `hauler_my_active_trip` for the vehicle_id, then calls `driver_check_inspection_today(p_vehicle_id, 'pretrip')`. If no row returns, shows the gate modal. If passing inspection found, proceeds to `C.navTrip()`.
- New `showDvirGateModal(type, trip, afterDone)` — full-screen orange-bordered modal with 🔧 icon, blocking title and body. Single button "Hacer inspección ahora" / "Do inspection now" routes to DVIR tab.

## Fix #2 — Louder Complete-Trip Block

### Bug
`ensurePostTripThen` (called from Complete Trip button) was silently showing a small `note()` toast then flipping to DVIR tab. Easy to miss in the field.

### Patch
`ensurePostTripThen` now reuses `showDvirGateModal('posttrip', trip, proceed)` — same full-screen modal as Fix #1 but with 🏁 icon and post-trip wording. Driver cannot proceed to Complete Trip until Post-Trip DVIR is logged.

## Fix #3 — "Real Chevrons" Mistranslation Fix

### Bug
Cyndy's screenshot showed the Complete Trip modal label "Galones reales" rendered as **"REAL CHEVRONS"**. Root cause: Chrome's built-in Spanish→English auto-translate engine mangled "galones" → "Chevrons" (likely a model bias toward the gas brand "Chevron"). The static HTML label is in Spanish; Chrome's MT runs before our i18n bindings.

### Patch
Added `translate="no"` attribute to three hauler modal overlay roots:
- `choferTripCompleteOv` (Complete Trip modal — root cause)
- `haulerLoadItemOv` (load item modal — defensive)
- `haulerEventOv` (event modal — defensive)

`translate="no"` is honored by Chrome, Edge, Safari, and Firefox to suppress browser-level auto-translate while leaving the page-internal i18n switch intact.

## Fix #4 — i18n Strings for Gate Modal

Added 4 new i18n keys (Spanish + English):
- `dvirGateTitle` — "Inspección requerida" / "Inspection required"
- `dvirGatePreBody` — "Por seguridad y por DOT, completa la inspección Pre-Trip antes de continuar." / "For safety and DOT compliance, complete the Pre-Trip inspection before continuing."
- `dvirGatePostBody` — "Por seguridad y por DOT, completa la inspección Post-Trip antes de cerrar este viaje." / "For safety and DOT compliance, complete the Post-Trip inspection before closing this trip."
- `dvirGateGoBtn` — "Hacer inspección ahora" / "Do inspection now"

## Not Patched

### Bill To
Cyndy confirmed: leave Bill To as OCR-only (extracted from BOL photo). No editable field added.

### Item modal ("iem modal??")
User question unclear — awaiting clarification on whether (a) "+ Add item" tap does nothing, (b) modal opens but inputs are broken, or (c) modal opens but save fails. The modal markup is intact (all inputs at lines 862-892). `translate="no"` added defensively but no behavior change.

## Files Changed

- `index_V21_00_5.html` — new file at repo root
- `V21_00_5_PATCH_REPORT.md` — this report

## Database — No Migration Required

All RPCs (`driver_check_inspection_today`, `hauler_my_active_trip`, `trip_complete`) are already in production from prior V21_00_x builds. This is a pure client-side patch.

## Verification

- `node --check` on extracted inline JS — clean
- 12 `V21_00_5:` markers in file
- 3 `translate="no"` attributes on hauler modals
- 5 references to new gate functions
- APP_VERSION bumped V21_00_4 → V21_00_5

## Constraints Respected

- File: `index_V21_00_5.html` (new file, V# incremented per CLAUDE-2.md rule)
- No backup files touched
- No `index.html` created
- All new lines prefixed with `// V21_00_5:` for searchability
- Spanish wording for field-app strings
