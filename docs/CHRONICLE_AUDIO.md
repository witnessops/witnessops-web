# Chronicle narration

Chronicle narration is generated once with xAI and served as a static MP3. Listening never calls the provider. The player is shown only when the recording manifest matches the current narration text and synthesis settings.

## Generate or refresh

Use Node 22, pnpm 9.15.4 and an installed `ffprobe`. Run from the repository root:

```sh
TSX_TSCONFIG_PATH=apps/witnessops-web/tsconfig.json node --import tsx scripts/generate-chronicle-audio.ts
```

The default is a dry run: it checks existing recordings and prints chapter character counts and estimated cost. The default narrator is `orion`; `eve`, `rex` and `sal` are also supported. Select one chapter with `--chapter=005`, or The Scope Escalation with `--chapter=2040`, or another voice with `--voice=rex`. The default chapter set includes the main series and Receipts from the Future.

For an authorized generation, supply `XAI_API_KEY` through the process environment and add `--generate`. Do not put credentials in source, command arguments, shell history or logs. The default estimated-cost ceiling is USD 1; an explicitly authorized higher ceiling can be set with `--max-cost-usd=2`.

```sh
TSX_TSCONFIG_PATH=apps/witnessops-web/tsconfig.json node --import tsx scripts/generate-chronicle-audio.ts --generate --voice=orion
```

The estimate uses xAI's published USD 15 per million input characters. Confirm current pricing before a new generation. Each request must stay within 60,000 characters. The script makes one request per missing or changed chapter and does not automatically retry provider or network failures. A timeout can leave billing unknown; inspect the prior request before retrying.

## Stored artifacts and validation

- MP3s: `apps/witnessops-web/public/audio/chronicles/chapter-<id>-<input-hash-prefix>.mp3`.
- Manifest: `apps/witnessops-web/src/content/chronicles/audio-manifest.json`.
- Settings: English, MP3, 24 kHz, 128 kbps, normal speed and text normalization.
- The input hash binds the published narration text, voice and synthesis settings. The manifest also records the audio SHA-256, measured duration and generation timestamp.
- Existing matching recordings are reused only after their file hash, MP3 codec and duration are checked. A missing or corrupt matching asset stops generation instead of causing another paid request.
- Output writes are atomic. A generation lock prevents two script instances from issuing duplicate requests. If a process is interrupted, check whether it is still running before removing its stale lock. Partial or unregistered files are retained for recovery and must be investigated before retrying.
- An attempt marker is written before each paid request and removed only after its manifest entry is saved. An uncertain attempt or partial recording blocks another request for the same input until its outcome is reconciled.

Keep the reviewed MP3s and manifest together. Source presence is not publication or listening acceptance; listen to the generated recordings and check player behavior before a separately authorized release.

References: [xAI text-to-speech API](https://docs.x.ai/developers/model-capabilities/audio/text-to-speech), [xAI text-to-speech pricing](https://docs.x.ai/developers/models/text-to-speech).
