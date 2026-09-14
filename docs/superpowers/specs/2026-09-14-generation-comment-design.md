# Generation command comment

## Goal

Prepend a single `//` comment to each successful localise output naming the command used to generate the file, so the file is self-documenting for regeneration.

## Behaviour

- Reconstruct the invocation from Deno APIs (not OS cmdline).
- If running under the Deno CLI (`Deno.execPath()` basename is `deno` / `deno.exe`):  
  `deno run -A <script-path> <args…>`
- If running as a compiled binary:  
  `<binary-basename> <args…>`
- Shell-quote arguments that need it; leave simple tokens unquoted.
- Write the comment after a successful, non-empty, self-contained bundle, then rewrite the output file.
- Do not treat the comment as part of the self-containment check (check the raw bundle first).

## Out of scope

- Regenerating existing sample files under `public/`
- Capturing uncommon Deno flags beyond `-A`
- README changes
