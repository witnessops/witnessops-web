# Local Agent/MCP observation contract v1

Status: local implementation candidate. This is a portable observation record,
not a security verdict, signed receipt, source archive or proof of source truth.
The homepage remains frozen; this work does not enable its account/CLI journey.

## Invocation and boundaries

```sh
wops agent inspect
wops agent inspect --mcp-config ./selected-mcp.json --output ./agent-observation.json
```

Run as a normal user on Linux or macOS. No sign-in or workspace is required. Invocation
selects a local metadata observation; existing auth and server-check authority
remain separate. The collector never runs the discovered commands, contacts an
MCP server, reads authentication storage, uploads a file or lists directories.
The default output is `agent-observation.json` in the working directory. It is
created exclusively with mode 0600; existing files and symlinks are not replaced.
Choose a new output path for another run. Parent directories must already exist.
Output paths may not contain symlinks, including macOS aliases such as `/tmp`
(use the real `/private/tmp` path). Linux additionally pins output parents.
On write failure, the command returns an error; an incomplete reservation can
remain and must not be used as evidence.

The first 32 PATH entries are considered. Empty and relative entries are recorded
as failures, not resolved against the working directory. Only `codex`, `claude`,
`gemini` and `aider` are looked up, using metadata. PATH directories may themselves
be aliases (for example `/bin`). Linux pins the directory for fixed lookups.
macOS resolves the selected directory alias once, rejects symlinks in the resolved
path, and checks directory identity around each fixed-name metadata lookup. Candidate symlink targets are never followed.
Regular-file execute bits are metadata, not an effective-access test. The name
`codex` alone does not establish that an OpenAI product is installed or used.

MCP inspection requires up to four explicit `--mcp-config` paths. No automatic
config discovery occurs. v1 supports UTF-8 JSON with a top-level `mcpServers`
object; it does not support TOML, JSONC, other configuration shapes, or runtime
process collection. Each file is limited to 64 KiB, 32 nesting levels and 128
declarations. Duplicate JSON keys and non-object declarations fail the selected
file. Unsupported shapes never become a successful empty result. An empty
`mcpServers` map is a successful zero-declaration observation of that file only.

Config paths reject symlinks in every component on both platforms. Linux uses
descriptor-relative traversal and metadata-only handles before opening regular
files for reading; `/proc/self/fd` must be available. macOS uses `O_NOFOLLOW_ANY`
and event-only metadata handles, then a separate permission-checked read open.
It checks regular-file type and matching device/inode/size/timestamps before any
read. A detected replacement fails explicitly. Event-only handles are never read.
macOS does not pin ancestor paths across lookup. Transient directory replacement
or in-place rewriting cannot be ruled out; a concurrent special-file replacement
can still cause that file to be opened, although its contents are not read.
Reads are capped even if a file
grows; a detected size/mtime/ctime change during the read discards its declarations.
This is still a sequential observation, not an atomic filesystem snapshot or a
defence against a privileged attacker rewriting the underlying host.

## Privacy

Only selected config files are read, and they can contain sensitive values in
memory. Do not select credential files. No source bytes, declaration names,
command values, arguments, URLs, environment values, or arbitrary error messages
are serialized. Each declaration retains only its ordinal, field-presence flags,
and a boolean `disabled` value when present. Those fields do not validate a
command/URL or establish the client's actual interpretation.

Source paths are retained with the current home prefix replaced by `$HOME`.
Other path components may disclose project names or other private information.
This record is private by default, not automatically safe for public sharing.
No hostname, username, credential, browser history, cloud identity, process list
or discovered file content is collected as a separate data source.

## Reading the record without the collector

The machine-readable shape is `src/agent/schema.json` (JSON Schema 2020-12).

| Question | Record fields |
| --- | --- |
| What was checked? | `scope`, every `checks[].area/source/status` |
| When? | `observed_at`, `completed_at`, individual check/observation times |
| What was observed? | `observations[].statement/details/source` |
| What does it support? | `observations[].meaning` |
| What remains unknown? | `unknowns`, each observation's `unknowns`, scope limitations |
| What failed or was not inspected? | `failures`, check statuses, `scope.not_inspected` |

`snapshot_id` identifies this record; it does not authenticate it. Timestamps are
local-clock UTC values and are not attested. `collector.version` is the package
version, not an immutable build identifier. Source bytes and source hashes are
not retained: another person can reconstruct the scope and reasoning, but cannot
independently replay the original input from this file alone.

Every observation links to its check by `check_id`. Every failure links to a
failed check and includes a fixed reason code and its impact. A missing named
entry is `not-found`, not “no agents found”. No selected MCP file is
`not-requested`, with an explicit unknown. Supported files with unreadable,
malformed or unsupported content produce failures without leaking input values.
Partial results preserve observations from other sources.

`collection_status` is `completed`, `partial` or `unsupported`. Completed means
the selected checks completed within their stated scope, including explicit
not-found results. It never means complete host coverage. Root invocations on either platform
and unsupported platforms produce an unsupported record without inspecting host
inputs. A record with no observations can still contain important failures.

Exit codes: 0 for completed selected checks; 2 for a written partial/unsupported
record; 1 for invalid invocation or output failure. Exit code 0 is not a security
result. No runtime scanning, API, upload, workspace, database or Morpheus adapter
is part of this contract.

## Reconstruction acceptance

The tests create synthetic filesystem/config fixtures, invoke the real command,
and inspect only the resulting JSON to answer the six questions above. They
include permission errors, malformed and ambiguous inputs, partial collection,
unsupported platforms, privacy sentinels, symlinks, output preservation and an
installed archive without the repository.

This automated check does not replace the human milestone: give a second person
only a locally generated `agent-observation.json` and ask those six questions.
Independent human acceptance is deferred and remains pending. Record what the
reviewer cannot answer when that review takes place; automated checks do not
mark this acceptance passed.
No independent human acceptance or real-host collection is claimed by the tests.
