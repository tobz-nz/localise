# localise

Pull an npm package **local** — one minified, self-contained browser ESM file. No leftover `npm:`, CDN, or bare imports. Drop it in `public/` and import from a `<script type="module">`.

## Requirements

- [Deno](https://deno.land/) 2.5+ on your `PATH` (also used at runtime for `deno bundle`)

## Install

### Download (prebuilt)

Grab the binary for your OS/arch from the [latest release](https://github.com/tobz-nz/localise/releases/latest):

| Platform | Asset |
| --- | --- |
| macOS (Apple Silicon) | `localise-aarch64-apple-darwin` |
| macOS (Intel) | `localise-x86_64-apple-darwin` |
| Linux (x86_64) | `localise-x86_64-unknown-linux-gnu` |
| Linux (arm64) | `localise-aarch64-unknown-linux-gnu` |
| Windows (x86_64) | `localise-x86_64-pc-windows-msvc.exe` |

Make it executable (Unix), put it on your `PATH`, and rename to `localise` if you like:

```bash
chmod +x localise-aarch64-apple-darwin
mv localise-aarch64-apple-darwin ~/.local/bin/localise
```

You still need [Deno](https://deno.land/) 2.5+ on `PATH` at runtime (for `deno bundle`). If the CLI isn't findable, set `DENO=/path/to/deno`.

### Compile from GitHub

```bash
deno install -Agf --compile --no-config -n localise \
  https://raw.githubusercontent.com/tobz-nz/localise/main/localise.ts
```

That downloads the source, compiles a binary, and puts `localise` on your Deno bin path (usually `~/.deno/bin` — ensure it's on `PATH`).

**Or** compile to a local binary only:

```bash
deno compile -A --no-config -o localise \
  https://raw.githubusercontent.com/tobz-nz/localise/main/localise.ts
```

### From a local checkout

```bash
deno compile -A --no-config -o localise localise.ts
# or run without compiling:
deno run -A localise.ts <npm-package> <output-path> [--default]
```

## Usage

```bash
localise <npm-package> <output-path> [--default]
```

| Argument        | Description                                                            |
| --------------- | ---------------------------------------------------------------------- |
| `<npm-package>` | npm name/version Deno understands (`lodash-es@4`, `@scope/name@^2.12`) |
| `<output-path>` | Destination `.js` file (parent dirs created)                           |
| `--default`     | Export as `default` only; omit to re-export named exports (`export *`) |

### Example: Flare

```bash
localise '@flareapp/js@^2.12' public/js/vendor/flare@2.12.js
```

```html
<script type="module">
  import { flare } from '/js/vendor/flare@2.12.js'
  flare.light('api-key')
</script>
```

### Example: default export

```bash
localise lodash-es@4 public/js/lodash.js --default
```

```html
<script type="module">
  import _ from '/js/lodash.js'
  console.log(_.chunk([1, 2, 3], 2))
</script>
```

## Behaviour

1. Writes a tiny temp entry that imports `npm:<package>`
2. Runs `deno bundle --platform=browser --minify --packages=bundle`
3. Fails if the output still contains external imports
4. Writes the file and prints `Localised <pkg> → <out>`

## Uninstall

```bash
deno uninstall localise
# or delete the binary you compiled with -o
```
