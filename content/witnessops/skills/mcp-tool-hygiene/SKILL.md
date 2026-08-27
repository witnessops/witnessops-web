---
name: mcp-tool-hygiene
description: >
  Use when reviewing MCP tool lists, directories, or agent tool access. Tools
  are an allowlist. Remote tool loading is in scope for refusal.
---

# MCP tool hygiene

A tool the agent can call is a skill with a side effect.

## Workflow

1. List the tools actually enabled.
2. For each tool, name side effects (network, files, mail, money).
3. Drop undeclared tools from the working set.
4. Refuse chain-loading of remote tools mid-run.

## Guardrails

- Do not enable "all tools".
- Do not fetch a remote tool schema and treat it as trusted.
- Do not let a tool expand the authorised scope.
- If a tool can send data off-box, say so before first call.

## Outputs

- allowlist
- side-effect notes
- refused tools
