# Docs Assistant Architecture Decision (V1)

## Runtime choice

V1 uses OpenAI Responses API + hosted file search against an approved vector store.
This lane is retrieval-first only and does not require agent orchestration for execution or approvals.

This matches OpenAI's model where file search is used with Responses API vector stores for retrieval over indexed files.

## Key authority rules

- API keys are server-side secrets only.
- API-key authentication and client secret handling must not expose key material in browser/client code.

## Tooling boundary

Agents SDK is intentionally deferred in V1.
It is intended for applications that own orchestration, tool execution, approvals, and state.
This lane has no runtime orchestration, no mutation tools, and no execution authority.

## V1 prohibition list

This lane creates no:

- `/docs/assistant` public route
- API route
- OpenAI SDK integration
- environment variable surface for model credentials
- generated vector store upload path or key custody
- generated corpus artifact in-repo
- deployment or execution authority
