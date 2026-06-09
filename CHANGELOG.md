# Changelog

## 0.2.1 — 2026-06-09

### Changed
- **Dual-install safe SessionStart bootstrap.** When the `superpowers` plugin is already enabled,
  wagerforge now DEFERS — it emits only a short routing + discipline pointer instead of re-injecting
  the full `<EXTREMELY_IMPORTANT>` bootstrap, eliminating the double injection. Standalone users
  (no superpowers) are unaffected and still get the full bootstrap. This flips the SessionStart
  payload for dual-install users — intentional de-dup, not a regression.
- SessionStart now also runs on `resume`.

### Added
- `WAGERFORGE_BOOTSTRAP` env override (since 0.2.1): `force` = always full bootstrap, `off` = always defer.
- Tri-state detection with a fail-open guarantee: any unreadable/unparseable settings → full bootstrap
  (never a silent skip), so a hand-edited (JSONC) settings file can't cause a missed double-injection fix.

### Rollback
- Downgrade to 0.2.0 restores the unconditional full bootstrap, or set `WAGERFORGE_BOOTSTRAP=force`.
