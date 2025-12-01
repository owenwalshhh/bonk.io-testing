# Pulse Arena (Bonk.io-inspired prototype)

## Prerequisites
- Node.js 18 or newer. On macOS you can install it with Homebrew (`brew install node@20`) or nvm (`nvm install 20 && nvm use 20`).
- A modern browser (Chrome, Edge, Firefox, or Safari).

## Local setup (macOS)
1. Open Terminal and clone the project:
   ```bash
   git clone https://github.com/your-org/bonk.io-testing.git
   cd bonk.io-testing
   ```
2. Install dependencies (none beyond built-ins, but this will create `package-lock.json` for reproducibility):
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
   The server will report the URL, typically `http://localhost:3000`.
4. Open the URL in your browser. To simulate multiple players locally, open the page in multiple tabs or windows.

## Development tips
- Use `npm run dev` to start the server with the `NODE_ENV=development` flag. You can edit files in `public/` and refresh the browser to see changes.
- To change the port, set `PORT` before running the server:
  ```bash
  PORT=4000 npm start
  ```

## Troubleshooting
- If npm reports `Could not read package.json`, double-check that you are inside the project folder that contains `package.json` and `server.js` (run `ls` to confirm). If those files are missing, re-clone the repo or update your checkout, then re-run `npm install`.
- If you see "address already in use", another process is using the port. Either stop it (e.g., `lsof -i :3000`) or set a different `PORT`.
- Ensure your macOS firewall allows incoming connections for Node.js if you're testing across devices on the same network.
