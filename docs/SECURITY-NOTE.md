# Security Note — Credential Exposure Found During Research (2026-06-04)

> Logged inside wagerforge per the "keep everything in wagerforge / don't modify the
> main folder" instruction. This documents a finding in the **surrounding** projects and
> the remediation already taken. wagerforge skills/examples must **never** reference the
> credentials listed here.

## Finding

The grounding research (43-agent workflow) found **4 long-lived GCP service-account
private-key JSON files** sitting unencrypted under `Deployment/deploy/`:

| Key file | Env | Brand |
|---|---|---|
| `metawin-games-dev-7ace36a26f03.json` | dev | metawin-games |
| `metawin-games-prod-332dc1d882c5.json` | **prod** | metawin-games |
| `metawin-gladiator-games-dev-591c646e6c3e.json` | dev | gladiator |
| `metawin-gladiator-games-prod-b1a237e696b8.json` | **prod** | gladiator |

Aggravating factors:
- **2 are production** keys.
- `~/Documents` is on a Mac with **iCloud Drive enabled** → the keys were very likely
  synced to iCloud (and any device on the same Apple ID). This makes rotation
  **mandatory**, not optional.
- This contradicts the keyless **Workload Identity Federation (WIF)** posture used in
  `inf-games-tequity` — a legacy oversight.

Mitigating facts:
- `Deployment/deploy/` and `Developments/` are **not** git repositories → the key files
  were not committed to a repo at this level (no local git-history scrubbing needed here).

## Remediation already done (disk side, authorized)

- Moved all 4 keys OUT of the iCloud-synced `Documents` tree to a locked backup:
  `~/secure-gcp-key-backup-2026-06-04/` (dir `700`, files `600`).
- `Deployment/deploy/` is now empty of keys.

## Your TODO (only you can do these)

1. **Rotate/disable** all 4 service-account keys in GCP IAM now. Key IDs:
   `7ace36a26f03`, `332dc1d882c5` (prod), `591c646e6c3e`, `b1a237e696b8` (prod).
2. **Update the key value** wherever it is actually consumed — the CI pipelines that
   deploy AS these service accounts (GitHub Actions secrets / Bitbucket repo variables
   across `inf-games-tequity`, the `mini-game-*` repos, and the slot repos). Prefer
   migrating those to **keyless WIF** (as `inf-games-tequity` already does).
3. After rotation is confirmed and deploys still work, delete the backup:
   `rm -rf ~/secure-gcp-key-backup-2026-06-04`.
4. Add a `.gitignore` (and ideally a `git-secrets`/pre-commit hook) **inside each real
   deploy repo** so key material can never be committed. (Not added to the main folder
   per your instruction; do this within the individual project repos you control.)

## wagerforge exclusion rule

These filenames/paths are on a permanent **do-not-reference** list. No wagerforge skill,
command, agent, hook, example, or script may read, embed, or point at them. Credential
handling in wagerforge skills always uses secret managers / WIF, never on-disk keys.
