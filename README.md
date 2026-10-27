---
version: 0.2.0
tags: [readme, housecall-pro, scheduling-agent]
---

# housecall-pro

A prototype same-day scheduling agent for home service dispatchers, built for an interview case. It uses synthetic data only. The written artifact is `docs/index.html`.

## Run the prototype

1. Install [Node.js](https://nodejs.org) (developed on v24).
2. In a terminal, go to the prototype folder and install dependencies:
   ```
   cd prototype
   npm install
   ```
3. Start the server:
   ```
   node server.mjs
   ```
4. Open http://127.0.0.1:3000. The server listens on your machine only.
5. Pick a test scenario, click **Ask the agent**, then approve, reject or undo the result. Use **Settings** to change agent autonomy and scheduling priority.

The live agent calls a model through [Pi](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) using a GitHub Copilot login, so you need a Copilot account signed in to Pi. Without one, use replay mode.

## Replay mode (no login needed)

Plays back recorded real proposals for scenarios **S1**, **S5** and **S10**. The safety checks, approval and undo still run live.

- PowerShell: `$env:REPLAY = "1"; node server.mjs`
- macOS or Linux: `REPLAY=1 node server.mjs`

Reset the day before each scenario. Other scenarios and custom reports are not available in replay mode.

## Rebuild the artifact

Edit `docs/content/artifact.yaml`, then run `node docs/build.mjs` from the repository root. The diagram needs an internet connection to render.
