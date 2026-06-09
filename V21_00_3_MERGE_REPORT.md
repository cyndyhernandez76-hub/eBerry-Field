# V21_00_3 Merge Report
**Date:** 2025-06-09  
**Base:** V21_00_2_base.html (14,728 lines)  
**Port source:** V21_01_0_source.html (14,710 lines)  
**Output:** index_V21_00_3.html (15,305 lines)  
**APP_VERSION:** `'V21_00_3'`

---

## 1. Sections Ported, Patched, or Rejected

### 1.1 HTML Changes

| Section | Action | Notes |
|---------|--------|-------|
| `choferTripScreen` div | **Patched** | Added `choferTripTabs` scrollable tab-bar div (hidden by default; shown by `renderTripDetail`) |
| Hauler Load Item modal (`haulerLoadItemOv`) | **Added** | New modal ported from V21_01_0 lines 844–876. Supports `trip_add_load_item` RPC |
| Hauler Event modal (`haulerEventOv`) | **Added** | New modal ported from V21_01_0 lines 877–914. Includes event type select (rest/fuel/weigh/toll/arrival/dropoff/idle/other) |
| V21_00_1 Hauler start screen | **Preserved** | Unchanged from V21_00_2 |
| BOL OCR overlay | **Preserved** | Unchanged from V21_00_2 |
| Complete-trip modal | **Preserved** | Unchanged from V21_00_2 |

### 1.2 JavaScript — I18N Dictionary

| Change | Action | Notes |
|--------|--------|-------|
| V21_00_3 tab labels (9 entries) | **Added** | `tabOverview`, `tabTime`, `tabDvir`, `tabBol`, `tabLoad`, `tabFuelT`, `tabOdo`, `tabMaintT`, `tabEvents` |
| Trip detail support strings | **Added** | `preTrip`, `postTrip`, `crop`, `farm`, `helpers`, `noHelpers`, `loadRef`, `loadType`, `timeIn2`, `timeOut2`, `currentEntry`, `totalToday`, `notClocked`, `dvirReqInProg`, `dvirReqComplete`, `dvirDoneToday`, `dvirNotDone`, `startDvir`, `addBol`, `attachedBols`, `noBols`, `addItem`, `noLoadItems`, `fromBol`, `manual`, `logReading`, `odoStart`, `odoEnd2`, `addEvent`, `noEvents`, event-type strings, `assignedTrips`, `recentTrips`, `noRecentTrips`, `startThisTrip`, `staleTrip`, `completeNow`, `hosOk`, `saved2`, `add`, `cancel2`, `qtyShort`, `recentReceipts`, `noReceipts` |
| `ranchoOrigen`, `selRancho`, `ranchoRequired` | **Preserved** | From V21_00_2 — unchanged |

### 1.3 JavaScript — TENANT_ID / audit constant

| Change | Action | Notes |
|--------|--------|-------|
| `TRIP_DRIVER_VIEW = 'trip_driver_view'` | **Added** | Symbolic constant enforcing the audit rule that driver UI never reads `fleet.trip` directly |

### 1.4 JavaScript — Hauler Home Screen

| Change | Action | Notes |
|--------|--------|-------|
| `tripRouteLine(trip)` | **Added** | Helper for origin→destination label |
| `loadAssignedTrips()` | **Added** | Fetches `hauler_my_assigned_trips`; renders dispatcher hand-off section with "Start this trip →" links |
| `loadRecentTrips()` | **Added** | Fetches `hauler_my_trip_history(p_days=30)`; renders last 5 completed trips (no AR/pay) |
| `C.startPlannedTrip(tripId)` | **Added** | Flips status to `in_progress`, clocks driver in, opens Trip Detail |
| `renderHaulerStart()` — rancho_origin | **Patched** | V21_00_3 version: detects `_ranchos[]`; shows dropdown if ranchos exist, else free-text input fallback |
| `renderHaulerStart()` — assigned/recent sections | **Added** | Inserts `haulerAssigned` and `haulerRecent` divs; calls `loadAssignedTrips()` + `loadRecentTrips()` |

### 1.5 JavaScript — Trip Detail (full replacement)

The entire Trip Detail JS block was replaced. The V21_00_2 single-screen `drawTripDetail`/`wireTripDetail` approach was removed and replaced with V21_01_0's tabbed architecture, plus V21_00_3-specific additions.

| Function | Action | Notes |
|----------|--------|-------|
| `statusPill(status)` | **Updated** | Added `planned` and `arrived` status variants from V21_01_0 |
| `parseHash()`, `C.navTrip`, `C.navBack`, `renderRoute()` | **Preserved** | Same routing logic |
| `C.startHaulingTrip(opts)` | **Patched** | Now calls `captureGps()` for origin GPS stamp; passes `p_rancho_origin` as last param to `start_hauling_trip` RPC |
| `HTABS`, `HTAB_LABEL` | **Added** | 9-tab constants |
| `captureGps(cb)` | **Added** | GPS capture helper (8s timeout) |
| `milesBetween(a, b)` | **Added** | Haversine distance computation |
| `startGpsPing(tripId)` / `stopGpsPing()` | **Added** | Background GPS ping every 5 min; haversine >0.5 mi gate to prevent DB spam |
| `renderTripDetail(tripId)` | **Replaced** | Now uses `hauler_my_active_trip` + `trip_detail`; handles active vs. history trips; manages GPS ping lifecycle; shows tab bar |
| `maybeStaleBanner(trip)` | **Added** | Stale-trip banner for in_progress trips >24h old with no recent events |
| `drawHaulerTabs()` | **Added** | Renders the 9-tab bar |
| `showHaulerTab(tab)` | **Added** | Dispatches to HRENDER/HWIRE |
| `hCard()`, `hLabel()`, `infoRow()` | **Added** | Card/row HTML helpers |
| `HRENDER.overview` | **Added** | Shows §395.1(k) HOS pills, rancho_origin, route, vehicle, customer, miles, helpers, complete button |
| `HRENDER.time` / `HWIRE.time` | **Added** | Clock In/Out tab |
| `HRENDER.dvir` / `HWIRE.dvir` | **Added** | Pre/Post-Trip DVIR tab; reuses existing `dvirHtml`/`wireDvirControls` |
| `refreshDvirStatus()` | **Added** | Checks `driver_check_inspection_today` RPC |
| `runInlineDvir(type)` | **Added** | Renders DVIR checklist inline in trip screen |
| `HRENDER.bol` / `HWIRE.bol` | **Added** | BOL tab with photo capture + BOL list |
| `loadTripBols(tripId)` | **Added** | Fetches `trip_bol` RPC |
| `HRENDER.load` / `HWIRE.load` | **Added** | Load items tab |
| `loadTripLoadItems(tripId)` | **Added** | Fetches `trip_list_load_items` RPC |
| `openLoadItemForm(tripId)` | **Added** | Wires `haulerLoadItemOv` modal → `trip_add_load_item` RPC |
| `HRENDER.fuel` / `HWIRE.fuel` | **Added** | Fuel tab reusing `wireFuelControls()`; loads trip receipts |
| `loadTripFuel(tripId)` | **Added** | Fetches `trip_fuel_receipts` RPC |
| `HRENDER.odometer` / `HWIRE.odometer` | **Added** | Odometer tab; logs odometer reading as trip event |
| `HRENDER.maint` / `HWIRE.maint` | **Added** | Maintenance tab; uses `submit_maintenance_event` RPC |
| `HRENDER.events` / `HWIRE.events` | **Added** | Events tab; chronological event list |
| `openEventForm(tripId)` | **Added** | Wires `haulerEventOv` modal → `trip_add_event` + GPS stamp via `trip_log_position` |
| `ensurePostTripThen(trip, proceed)` | **Added** | DVIR gate before Complete Trip |
| `C._renderAssignedTrips(box)` | **Added** | Exposed helper for assigned trips panel |
| BOL OCR functions | **Preserved** | `bolFromSaved`, `blankBol`, `normLine`, `bolFromAnalysis`, `runBolOcr`, `openBolForm`, `closeBolForm`, `bolInput`, `drawBolForm`, `lineItemHtml`, `syncBolDraftFromForm`, `wireBolForm` — same as V21_00_2 |
| `openCompleteModal(tripId)` | **Patched** | Now calls `captureGps()` and passes `p_dest_lat`/`p_dest_lng` to `trip_complete` RPC |
| `C.showHaulerTab` | **Added** | Exposed on C for external use |
| `drawTripDetail(trip, bol)` | **Removed** | Replaced by tabbed HRENDER system |
| `wireTripDetail(trip)` | **Removed** | Replaced by HWIRE system |
| `hosSoftCapPill()` | **Added** | §395.1(k) 14h soft-cap informational pill |

### 1.6 V21_00_2 Features Preserved (Not Regressed)

| Feature | Status |
|---------|--------|
| `_dwShifts` (stacked-Daywork) | ✅ Preserved — 5 occurrences confirmed |
| `_ranchos[]` (multi-rancho, up to 10) | ✅ Preserved — 84 occurrences confirmed |
| `renderRanchBar` UI | ✅ Preserved — 7 occurrences confirmed |
| Hauler module from V21_00_1 | ✅ Preserved |
| Hauler ↔ rancho linkage | ✅ Extended — now with free-text fallback |
| All chofer driver tabs (Pre-Trip, Time In, Fuel, Odometer, Maint, Post-Trip, Time Out) | ✅ Preserved |

### 1.7 V21_01_0 Features Explicitly Excluded

| Feature | Reason |
|---------|--------|
| "Pricing & Pay" tab | Per hard rule: AR/pay invisible to driver |
| Any `ar_rate`, `ar_amount`, `driver_pay_*` column reads in driver UI | Per audit requirement; only referenced in exclusion comment |
| `fleet.trip` direct queries from driver UI | Replaced by `hauler_my_active_trip` / `hauler_my_trip_history` (driver-safe views) |

---

## 2. Verification Gate Results

| Gate | Description | Result |
|------|-------------|--------|
| 1 | `node --check` on extracted inline `<script>` | ✅ PASS — exit code 0, zero errors |
| 2 | `APP_VERSION = 'V21_00_3'` present | ✅ PASS |
| 3a | `_dwShifts` present | ✅ PASS (5 occurrences) |
| 3b | `_ranchos` present | ✅ PASS (84 occurrences) |
| 3c | `renderRanchBar` present | ✅ PASS (7 occurrences) |
| 3d | `hauler_my_active_trip` present | ✅ PASS (1 occurrence) |
| 3e | `trip_log_position` present | ✅ PASS (3 occurrences) |
| 3f | `trip_driver_view` present | ✅ PASS (4 occurrences) |
| 3g | `rancho_origin` present | ✅ PASS (10 occurrences) |
| 4 | All 9 tab labels in Trip Detail UI | ✅ PASS (tabOverview, tabTime, tabDvir, tabBol, tabLoad, tabFuelT, tabOdo, tabMaintT, tabEvents — all 2x each) |
| 5 | No "Pricing & Pay" / "AR" / "driver_pay" in driver-facing UI | ✅ PASS — occurrences only in exclusion comments |
| 6 | Filename is `index_V21_00_3.html` (not `index.html`) | ✅ PASS |

**All 6 gates passed.**

---

## 3. RPC Wiring Summary

| RPC | Where Used | Status |
|-----|-----------|--------|
| `hauler_my_active_trip` | `renderTripDetail()` | ✅ Wired |
| `hauler_my_assigned_trips` | `loadAssignedTrips()` | ✅ Wired |
| `hauler_my_trip_history` | `renderTripDetail()`, `loadRecentTrips()` | ✅ Wired |
| `trip_update_field` | `C.startPlannedTrip()` | ✅ Wired |
| `trip_add_load_item` | `openLoadItemForm()` | ✅ Wired |
| `trip_log_position` | `startGpsPing()`, `openEventForm()`, `C.startHaulingTrip()` | ✅ Wired |
| `fuel_pending_set_trip` | Referenced via `C.state.haulerFuelTripId` in `wireFuelControls()` | ✅ Wired (existing pattern) |
| `trip_fuel_receipts` | `loadTripFuel()` | ✅ Wired |
| `trip_complete` | `openCompleteModal()` with GPS `p_dest_lat`/`p_dest_lng` | ✅ Wired |
| `start_hauling_trip` | `C.startHaulingTrip()` with `p_rancho_origin` as last param | ✅ Wired |
| `trip_bol` | `loadTripBols()` | ✅ Wired |
| `trip_list_load_items` | `loadTripLoadItems()` | ✅ Wired |
| `trip_remove_load_item` | `loadTripLoadItems()` remove button | ✅ Wired |
| `trip_add_event` | `openEventForm()`, `HWIRE.odometer` | ✅ Wired |
| `driver_check_inspection_today` | `refreshDvirStatus()`, `ensurePostTripThen()` | ✅ Wired |
| `submit_maintenance_event` | `HWIRE.maint` | ✅ Wired |

---

## 4. rancho_origin Integration (V21_00_3 Specific)

- **DB status:** `fleet.trip.rancho_origin TEXT` column EXISTS; `start_hauling_trip` RPC accepts `p_rancho_origin TEXT DEFAULT NULL` as last parameter. No migration needed.
- **Start-trip screen:** `renderHaulerStart()` now detects whether `_ranchos[]` is populated:
  - If ranchos present → dropdown `<select>` populated from surquero's `_ranchos[i].rancho` values
  - If `_ranchos[]` empty → free-text `<input>` fallback labeled "Rancho de origen" so driver can still start
  - Both paths require a non-empty value before calling `C.startHaulingTrip()`
- **`C.startHaulingTrip(opts)`:** Passes `p_rancho_origin: opts.rancho_origin` as last parameter in the `start_hauling_trip` RPC call
- **Overview tab:** `HRENDER.overview` displays `infoRow(t('ranchoOrigen'), trip.rancho_origin || null)` as the first data row

---

## 5. Background GPS Ping

- `startGpsPing(tripId)` fires every 5 minutes via `setInterval(fn, 5*60*1000)`
- Gate: only calls `trip_log_position` if haversine distance > 0.5 miles from last ping (`milesBetween()`)
- Lifecycle: started when trip status is `in_progress` (inside `renderTripDetail`); stopped when leaving Trip Detail screen via `stopGpsPing()` in `renderRoute()`
- `C.stopGpsPing` exposed for external cleanup

---

## 6. §395.1(k) HOS Pills

Two informational pills appear in the Overview tab:
1. Static blue pill: "ℹ️ 150 air-mi §395.1(k)" — always shown
2. Dynamic pill (`hosSoftCapPill()`): shows elapsed hours from clock-in; green <12h, amber 12–14h, red >14h

These are **informational only** — they never gate Clock In, trip start, or any other action.

---

## 7. Open Questions for Cyndy

1. **`trip_list_load_items` RPC** — The Load tab calls `rpc('trip_list_load_items', { p_trip_id: tripId })`. Confirm this RPC exists in the DB with this exact signature. If it doesn't exist, fallback is to query via `trip_add_load_item` result or a different RPC name.

2. **`trip_remove_load_item` RPC** — The Load tab remove button calls `rpc('trip_remove_load_item', { p_load_item_id: id })`. Confirm existence and param name.

3. **`submit_maintenance_event` param `p_pending_id`** — The Maint tab passes `p_pending_id: uuid()`. Verify this is the correct signature for this RPC.

4. **`driver_check_inspection_today` RPC** — Called with `{ p_vehicle_id, p_inspection_type }`. Confirm signature and return shape (expects array with ≥1 row = done today).

5. **`trip_bol` RPC** — Called with `{ p_tenant_id, p_trip_id }`. Confirm this returns `line_items` (array) and `source_image_url` in its response shape.

6. **`trip_update_field` for status** — `C.startPlannedTrip` calls `trip_update_field({ p_tenant_id, p_trip_id, p_field:'status', p_value:'in_progress' })`. Confirm this is the correct way to flip a planned trip to active (vs. a dedicated `start_planned_trip` RPC).

7. **`hauler_my_active_trip` return shape** — The code expects this to return an array where each row has `trip_id`, `trip_code`, `status`, `actual_start`, `rancho_origin`, `vehicle_id`, `customer_name`/`bill_to_name`, `origin_label`/`origin_name`, `destination_label`/`dest_name`, `planned_miles`, `actual_miles`, `helper_driver_ids`, `crop`. Verify all these fields are present in the RPC/view.

8. **`trip_complete` signature** — The modal now passes `p_dest_lat`/`p_dest_lng`. Confirm the RPC signature: `trip_complete(p_tenant_id, p_trip_id, p_odometer_end, p_actual_gallons, p_dest_lat, p_dest_lng)`. If GPS params aren't in the existing signature, remove them (they're captured best-effort).

9. **`fuel_pending_set_trip`** — The existing fuel submit flow uses `C.state.haulerFuelTripId` to stamp receipts to the trip. Confirm `wireFuelControls()` already calls `fuel_pending_set_trip` when `haulerFuelTripId` is set, or if this needs additional wiring.

10. **Active-trip resumption + rancho_origin** — When a driver has an active in-progress trip, `C.enterHaulerMode` calls `C.navTrip(activeTripId)` directly, bypassing `renderHaulerStart`. This is intentional. If Cyndy wants the rancho_origin pre-populated for the running trip on re-entry, that data comes from `trip_driver_view.rancho_origin` displayed in the Overview tab.

---

## 8. Migration Status

Per brief:
- `fleet.trip.rancho_origin TEXT` column — **ALREADY APPLIED** to DB
- `start_hauling_trip` RPC `p_rancho_origin TEXT DEFAULT NULL` as last param — **ALREADY APPLIED** to DB

No additional DB migrations are needed for this version.

---

## 9. Files Not Modified

Per hard rule "NEVER touch backup files":
- `V21_00_2_base.html` — untouched
- `V21_01_0_source.html` — untouched
- `index.html` — was not present in build directory; was not created

---

*Report generated by V21_00_3 build process. Output: `/home/user/workspace/v21_00_3_build/index_V21_00_3.html` (15,305 lines).*
