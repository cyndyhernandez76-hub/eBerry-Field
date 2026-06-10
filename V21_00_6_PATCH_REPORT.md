# V21_00_6 Patch Report — Wire Pausar/Reanudar

**Base:** V21_00_5 (PR #10, includes all V21_00_3/_4/_5 work — Pre-Trip DVIR gate, Complete-trip louder block, Real Chevrons MT fix)
**Goal:** Make the Pausar (Pause) and Reanudar (Resume) buttons actually do something in the hauler PWA.

## What this ships

### 1. Pause/Resume buttons on the Overview tab
Cyndy reported: *"la Pausar/pause y la Reanudar/resume buttons do not work."* That's because the legacy bottom action bar (where the old Pausar/Reanudar buttons lived) was hidden in V21_00_3 when the tabbed UI took over, and the Overview tab only had the Complete-Trip button. V21_00_6 adds Pause and Resume buttons inline at the bottom of the Overview tab, above Complete Trip.

- Renders a **yellow Pausar button** when the trip is in progress and not currently paused.
- Renders a **green Reanudar button** when the trip is currently paused (and hides Pausar).
- Renders a **yellow "⏸ Viaje en pausa" banner** at the top of Overview while paused.

### 2. Pause reason picker modal
Tapping Pausar opens a modal with six reasons matching the constraint from session design:
- Almuerzo / Lunch
- Reparación / Repair
- Descanso DOT / DOT break
- Cargando / Loading
- Descargando / Unloading
- Otro / Other

The selected reason is sent as the `p_notes` argument to `trip_add_event`.

### 3. RPC integration
- **Pause** calls `rpc('trip_add_event', { p_tenant_id, p_trip_id, p_event_type:'paused', p_notes: reason })`
- **Resume** calls `rpc('trip_add_event', { p_tenant_id, p_trip_id, p_event_type:'resumed', p_notes: null })`

Both RPCs already exist in the database (`public.trip_add_event` → `fleet.trip_add_event`) and accept any event_type text. No DB migration needed for this ship — pause/resume rows just land in `fleet.trip_event` and can be queried/aggregated later.

The function definition explicitly documents: *"trip.status enum only allows planned/in_progress/completed/cancelled, so we do NOT mutate trip.status on pause/resume."* So pause is event-only on the server, and a paused trip's `status` stays `in_progress`. The visible paused state in the PWA is **client-derived**.

### 4. Client-side paused state (survives refresh)
The PWA tracks paused state in `C.state.tripPausedAt[trip_id]` (in-memory) and mirrors it to `localStorage` keyed `eb_trip_paused_<trip_id>`. On every Trip Detail load, V21_00_6 reads localStorage **and** cross-checks against the `tripEvents` returned by `trip_detail` — if the latest pause/resume event on the server contradicts localStorage, the server wins. This means:
- Refresh the page → paused state persists.
- Pause on Device A, open on Device B → Device B sees paused state from `tripEvents`.
- Resume on Device A while Device B is open → Device B picks it up on next showHaulerTab.

### 5. i18n keys added
- `pauseTrip`, `resumeTrip`, `pauseReasonTitle`
- `reasonLunch`, `reasonRepair`, `reasonDotBreak`, `reasonLoading`, `reasonUnloading`, `reasonOther`
- `pausedBanner`, `cancel`
- All in Spanish + English.

### 6. APP_VERSION bumped
`V21_00_5` → `V21_00_6`. Cache-bust notification will fire for users on V21_00_5 or older.

## Files

- **Modified:** `index_V21_00_6.html` (910,794 chars; +1,619 chars vs V21_00_5)
- **New report:** `V21_00_6_PATCH_REPORT.md` (this file)

## Critical ship steps

1. Copy `index_V21_00_6.html` to repo root as both `index_V21_00_6.html` AND `index.html` (replacing the very-stale V21_00_1 currently at the default URL).
2. Copy to `test/index.html` so the test URL stays in sync.
3. Bump `version.txt` to `V21_00_6` for the auto-update cache-bust toast.
4. PR #10 (V21_00_5) is superseded by this PR — close PR #10 as superseded since V21_00_6 includes everything in V21_00_5.

## Out of scope (deferred to V21_01_0)

- A real `fleet.trip_pause` table that tracks pause duration with `started_at` / `ended_at` columns (current implementation = events only).
- `paused` value in the `trip_status` enum.
- Aggregating pause duration into the trip summary or driver time totals.
- Dropdown origin/destination, planned-miles auto-fill, hauling_location / hauling_customer / route_distance tables.
- CSV bill-to dedupe + seed scripts.

## Verification done locally

- `node -e new Function(...)` parses all 6 inline scripts with 0 errors.
- All 9 `V21_00_6:` markers present.
- No `V21_00_5` remnants in APP_VERSION line.
- `openPauseReasonModal`, `haulerPauseBtn`, `haulerResumeBtn`, `pausedBanner`, `tripPausedAt` all defined.

## Open questions / risks

- **"iem modal??"** from earlier — unclear what Cyndy meant. V21_00_5 added `translate="no"` defensively. The pause reason modal also has `translate="no"`. If she sees this issue again on V21_00_6, will need more detail.
- Pause/resume events accumulate in `fleet.trip_event` without a cleanup path. Long-running trips with many pauses could clutter the table — fine for now, deferred to V21_01_0 dedicated pause table.

## Test plan for Cyndy (post-deploy)

1. Tap "Actualizar ahora" when the cache-bust toast appears.
2. Log in as hauler with PIN 1016 (Cyndy).
3. Pre-Trip DVIR (gate from V21_00_5).
4. Start a trip.
5. On the Overview tab, see the new yellow **⏸ Pausar viaje** button.
6. Tap it → reason picker modal appears with 6 options.
7. Pick "Almuerzo" → modal closes, toast "⏸ Viaje pausado — Almuerzo", banner appears, button changes to green **▶ Reanudar viaje**.
8. Refresh the page → still shows paused with banner (localStorage works).
9. Tap Reanudar → toast "▶ Viaje reanudado", banner disappears, button returns to Pausar.
10. Complete Trip still works as before (DVIR gate still enforced).
