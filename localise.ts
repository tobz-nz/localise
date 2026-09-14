#!/usr/bin/env -S deno run -A

/**
 * localise — bundle an npm package into a single minified, self-contained browser ESM file.
 *
 * Usage:
 *   deno run -A localise.ts <npm-package> <output-path> [--default]
 *
 * Examples:
 *   deno run -A localise.ts '@flareapp/js@^2.12' public/store/js/flare@2.12.js
 *   deno run -A localise.ts lodash-es@4 public/js/lodash.js --default
 */

const USAGE =
  "Usage: localise <npm-package> <output-path> [--default]";

function parseArgs(args: string[]): {
  pkg: string;
  out: string;
  asDefault: boolean;
} {
  const positional: string[] = [];
  let asDefault = false;

  for (const arg of args) {
    if (arg === "--default") {
      asDefault = true;
      continue;
    }
    if (arg.startsWith("-")) {
      console.error(`Unknown flag: ${arg}\n${USAGE}`);
      Deno.exit(1);
    }
    positional.push(arg);
  }

  if (positional.length !== 2) {
    console.error(USAGE);
    Deno.exit(1);
  }

  return { pkg: positional[0]!, out: positional[1]!, asDefault };
}

function dirname(path: string): string {
  const i = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return i === -1 ? "." : path.slice(0, i) || ".";
}

function resolveOutPath(path: string): string {
  if (path.startsWith("/")) {
    return path;
  }
  return `${Deno.cwd()}/${path}`;
}

/** Real Deno CLI (not this process when compiled to a binary). */
async function resolveDenoCli(): Promise<string> {
  const fromEnv = Deno.env.get("DENO");
  if (fromEnv) {
    return fromEnv;
  }

  const execPath = Deno.execPath();
  const base = execPath.split(/[/\\]/).pop() ?? "";
  if (base === "deno" || base === "deno.exe") {
    return execPath;
  }

  const which = new Deno.Command("which", {
    args: ["deno"],
    stdout: "piped",
    stderr: "null",
  });
  const { code, stdout } = await which.output();
  const path = new TextDecoder().decode(stdout).trim();
  if (code === 0 && path) {
    return path;
  }

  throw new Error(
    "Could not find the Deno CLI on PATH (needed to run `deno bundle`). Install Deno or set DENO=/path/to/deno.",
  );
}

function assertSelfContained(code: string): void {
  const fromRe =
    /\b(?:import|export)\s+(?:type\s+)?(?:[^'"\n]+?\s+from\s+)?["']([^"']+)["']/g;
  const dynamicRe = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
  const offenders = new Set<string>();

  for (const re of [fromRe, dynamicRe]) {
    for (const match of code.matchAll(re)) {
      const spec = match[1]!;
      if (
        spec.startsWith("./") ||
        spec.startsWith("../") ||
        spec.startsWith("/") ||
        spec.startsWith("data:")
      ) {
        continue;
      }
      offenders.add(spec);
    }
  }

  if (offenders.size > 0) {
    throw new Error(
      `Bundle is not self-contained; external imports remain:\n  - ${
        [...offenders].join("\n  - ")
      }`,
    );
  }
}

const { pkg, out, asDefault } = parseArgs(Deno.args);
const npmSpec = pkg.startsWith("npm:") ? pkg : `npm:${pkg}`;
const entrySource = asDefault
  ? `export { default } from ${JSON.stringify(npmSpec)};\n`
  : `export * from ${JSON.stringify(npmSpec)};\n`;
const absoluteOut = resolveOutPath(out);

const tempDir = await Deno.makeTempDir({ prefix: "localise-" });
const configPath = `${tempDir}/deno.json`;
const entryPath = `${tempDir}/entry.ts`;

try {
  await Deno.writeTextFile(
    configPath,
    JSON.stringify({ nodeModulesDir: "auto" }),
  );
  await Deno.writeTextFile(entryPath, entrySource);

  const outDir = dirname(absoluteOut);
  if (outDir !== ".") {
    await Deno.mkdir(outDir, { recursive: true });
  }

  // Spawn `deno bundle` so npm auto-install works via temp deno.json.
  // (Deno.bundle() does not pick up that config when the script itself has none.)
  // Must use the real CLI — Deno.execPath() is this binary when compiled.
  const denoCli = await resolveDenoCli();
  const command = new Deno.Command(denoCli, {
    args: [
      "bundle",
      `--config=${configPath}`,
      "--platform=browser",
      "--minify",
      "--packages=bundle",
      entryPath,
      "-o",
      absoluteOut,
    ],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await command.output();
  const stdoutText = new TextDecoder().decode(stdout).trim();
  const stderrText = new TextDecoder().decode(stderr).trim();

  if (code !== 0) {
    if (stderrText) {
      console.error(stderrText);
    }
    if (stdoutText) {
      console.error(stdoutText);
    }
    Deno.exit(code);
  }

  const codeText = await Deno.readTextFile(absoluteOut);
  if (codeText.length === 0) {
    console.error("Bundle produced empty output");
    Deno.exit(1);
  }

  assertSelfContained(codeText);
  console.log(`Localised ${pkg} → ${out}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  Deno.exit(1);
} finally {
  await Deno.remove(tempDir, { recursive: true }).catch(() => {});
}
