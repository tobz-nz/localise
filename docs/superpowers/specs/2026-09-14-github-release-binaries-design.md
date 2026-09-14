# GitHub Release Binaries

## Goal

When a version tag is pushed, CI compiles `localise` for common platforms and attaches the binaries to a GitHub Release so users can download them without running Deno themselves (Deno is still required at runtime for `deno bundle`).

## Trigger

- Workflow: `.github/workflows/release.yml`
- Event: `push` of tags matching `v*` (e.g. `v0.0.1`)
- Permissions: `contents: write` (create/update the Release and upload assets)

## Build

- Runner: `ubuntu-latest`
- Install Deno 2.x via `denoland/setup-deno`
- For each target, run:

  ```bash
  deno compile -A --no-config --target <triple> -o <asset-name> localise.ts
  ```

### Targets and asset names

| Deno `--target` | Release asset name |
| --- | --- |
| `x86_64-apple-darwin` | `localise-x86_64-apple-darwin` |
| `aarch64-apple-darwin` | `localise-aarch64-apple-darwin` |
| `x86_64-unknown-linux-gnu` | `localise-x86_64-unknown-linux-gnu` |
| `aarch64-unknown-linux-gnu` | `localise-aarch64-unknown-linux-gnu` |
| `x86_64-pc-windows-msvc` | `localise-x86_64-pc-windows-msvc.exe` |

Cross-compilation from Linux is sufficient; no macOS/Windows runners required.

## Release publishing

- Create a GitHub Release for the pushed tag (or upload into it if it already exists).
- Attach all five binaries as release assets.
- Release notes: auto-generated / minimal from the tag; no changelog automation in this iteration.

## Documentation

- Update README Install section with a **Download** path:
  - Link to `https://github.com/tobz-nz/localise/releases/latest`
  - List the asset names and note which OS/arch each is for
  - Remind users that Deno must still be on `PATH` (or `DENO` set) when running the binary
- Keep existing `deno install` / `deno compile` from-source instructions as alternatives.

## Out of scope

- Rolling / overwritten `latest` release on every `main` push
- Homebrew / package-manager formulas
- Checksums / signed releases
- Automated changelog from conventional commits

## Success criteria

1. Pushing `vX.Y.Z` runs the workflow and produces a Release with five downloadable assets.
2. A downloaded binary runs and localises a package when Deno is available.
3. README tells users how to get binaries from Releases.
