# eBerry Field Release Notes

Per-version merge and patch reports for the eBerry Field PWA (`index.html`).

Versions follow Serafín's rule: each release ships a new `index_V{num}.html`
in the repo root; the root `index.html` is then updated to match the latest
shipped version, and `version.txt` reflects that version.

## Reports

- [V21_00_2 Merge Report](./V21_00_2_MERGE_REPORT.md) — hauler + multi-rancho + stacked-Daywork merge
- [V21_00_3 Merge Report](./V21_00_3_MERGE_REPORT.md) — 9-tab Trip Detail hauler UI on V21_00_2 base
- [V21_00_4 Patch Report](./V21_00_4_PATCH_REPORT.md) — `submit_maintenance_event` signature fix + `rancho_origin` exposure
- [V21_00_6 Patch Report](./V21_00_6_PATCH_REPORT.md) — Pausar/Reanudar wiring + V21_00_5 stack

## Older versions

V20_xx and V21_00_0/_1/_5 reports were not produced as separate documents.
See the git commit history for those changes:

```bash
git log --oneline --grep="V2[01]_"
```
