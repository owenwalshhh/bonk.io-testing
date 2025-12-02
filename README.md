# Pulse Arena (Bonk.io-inspired prototype)

## What's inside now
- **Client-side simulation only**: everything runs in the browser (no WebSocket server), but the UI mirrors Bonk-style flows with log in/sign up, lobby, chat, room creation, and AI bots to fill seats.
- **Lobby & rooms**: join existing rooms or host one with a map and mode. Bots auto-fill seeded rooms; the user `owenwlsh` unlocks admin commands like `/spawn bot` and `/boost name 10`.
- **Live canvas play**: WASD/arrow keys move, Space dashes. Hazard ring, platforms, and energy orbs are simulated locally.
- **Map editor**: add rectangular pads, spawns, and hazard radius, then save to the map selector.

## Prerequisites
- Node.js 18 or newer. On macOS you can install it with Homebrew (`brew install node@20`) or nvm (`nvm install 20 && nvm use 20`).
- A modern browser (Chrome, Edge, Firefox, or Safari).

## Quick start without npm (macOS Terminal)
If `npm install` is giving you trouble, you can run the project directly with the built-in Node server (no dependencies required):
```bash
cd /path/to/bonk.io-testing
# Works with bash or zsh
dos2unix run-direct.sh 2>/dev/null || true  # safe no-op if dos2unix isn't installed
bash ./run-direct.sh      # or: PORT=4000 bash ./run-direct.sh
```
If you see `zsh: no such file or directory: ./run-direct.sh`, double-check that you're in the folder that actually contains `run-direct.sh`:
```bash
pwd
ls run-direct.sh server.js public
```
If those files are missing, re-extract or reclone the repo, then rerun the command. As an absolute fallback, you can launch the server directly without the helper script (from inside the project folder):
```bash
PORT=4000 node server.js
```
This starts the server on port 3000 (or the port you set). Open `http://localhost:3000` in your browser to play.

## Standard npm flow (optional)
`npm install` is only needed to generate `package-lock.json`; there are no third-party dependencies. If you prefer npm scripts:
```bash
npm install
npm start              # or: PORT=4000 npm start
```

## How to play & explore
1. Open the page, enter a username (use **owenwlsh** for admin), and log in. The overlay will disappear and you'll be dropped into a room.
2. Move with **WASD/Arrow keys** and **Space** to dash. AI bots wander and collect orbs; collisions and gravity wells are simulated locally.
3. Use the lobby panel to host a new room (pick a mode + map) or spectate other rooms.
4. Use chat to talk or run commands:
   - `/spawn botname` (admin) adds an AI bot to the active room.
   - `/boost player 10` (admin) gives points.
   - `/wipe` removes all orbs in the current room.
   - `/tip` rotates the HUD tip.
5. Open the **Map editor** to add rectangular platforms and spawn points, set a hazard radius, and save. Your custom map shows up in the map selector for new rooms.

## Development tips
- Use `npm run dev` (or `NODE_ENV=development node server.js`) to start the server with the `NODE_ENV=development` flag. You can edit files in `public/` and refresh the browser to see changes.
- To change the port, set `PORT` before running the server, whether you use npm or the direct script.
- To simulate multiple players locally, open the page in multiple tabs or windows.

## Troubleshooting
- If npm reports `Could not read package.json`, confirm you're in the project folder by running:
  ```bash
  pwd
  ls package.json server.js public
  ```
  If those files do not show up, you are not inside a complete copy of the project. Fix it with one of these options:
  - Re-enter the folder you cloned (for example, `cd ~/bonk.io-testing`).
  - If the folder exists but is missing files (common after an incomplete download), remove it and reclone:
    ```bash
    rm -rf ~/bonk.io-testing
    git clone https://github.com/your-org/bonk.io-testing.git
    cd bonk.io-testing
    npm install
    npm start
    ```
  - If you downloaded a ZIP, double-check that you extracted **all** files into a new folder before running commands from that folder.
- If you see "address already in use", another process is using the port. Either stop it (e.g., `lsof -i :3000`) or set a different `PORT`.
- Ensure your macOS firewall allows incoming connections for Node.js if you're testing across devices on the same network.
