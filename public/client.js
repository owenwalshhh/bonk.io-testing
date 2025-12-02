const canvas = document.getElementById('arena');
const ctx = canvas.getContext('2d');
const scoreboard = document.getElementById('scoreboard');
const latencyEl = document.getElementById('latency');
const nameEl = document.getElementById('player-name');

let state = { players: [], orbs: [], hazard: null, arena: { width: 1200, height: 700 } };
let selfId = null;
let ws;
let lastPing = 0;
let latency = 0;

const keys = { up: false, down: false, left: false, right: false };

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function connect() {
  ws = new WebSocket(`ws://${location.host}`);

  ws.addEventListener('open', () => {
    pulsePing();
  });

  ws.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'init') {
      selfId = data.id;
      state.arena = data.arena;
      state.hazard = data.hazard;
      nameEl.textContent = `${data.name} • ${data.color}`;
    }
    if (data.type === 'pong') {
      latency = Math.round(performance.now() - lastPing);
      latencyEl.textContent = `${latency} ms ping`;
    }
    if (data.type === 'state') {
      state.players = data.players;
      state.orbs = data.orbs;
      state.hazard = data.hazard;
      state.arena = data.arena;
    }
  });

  ws.addEventListener('close', () => {
    setTimeout(connect, 1000);
  });
}

connect();

function pulsePing() {
  if (ws.readyState !== WebSocket.OPEN) return;
  lastPing = performance.now();
  ws.send(JSON.stringify({ type: 'ping' }));
  setTimeout(pulsePing, 1500);
}

function sendInput() {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(
    JSON.stringify({
      type: 'input',
      state: { ...keys }
    })
  );
}

function sendDash() {
  if (ws.readyState !== WebSocket.OPEN) return;
  const me = state.players.find((p) => p.id === selfId);
  if (!me || me.charge <= 0) return;
  const direction = {
    x: (keys.right ? 1 : 0) - (keys.left ? 1 : 0),
    y: (keys.down ? 1 : 0) - (keys.up ? 1 : 0)
  };
  if (direction.x === 0 && direction.y === 0) direction.x = 1;
  ws.send(
    JSON.stringify({
      type: 'dash',
      direction
    })
  );
}

window.addEventListener('keydown', (e) => {
  if (['KeyW', 'ArrowUp'].includes(e.code)) keys.up = true;
  if (['KeyS', 'ArrowDown'].includes(e.code)) keys.down = true;
  if (['KeyA', 'ArrowLeft'].includes(e.code)) keys.left = true;
  if (['KeyD', 'ArrowRight'].includes(e.code)) keys.right = true;
  if (e.code === 'Space') {
    sendDash();
  }
  sendInput();
});

window.addEventListener('keyup', (e) => {
  if (['KeyW', 'ArrowUp'].includes(e.code)) keys.up = false;
  if (['KeyS', 'ArrowDown'].includes(e.code)) keys.down = false;
  if (['KeyA', 'ArrowLeft'].includes(e.code)) keys.left = false;
  if (['KeyD', 'ArrowRight'].includes(e.code)) keys.right = false;
  sendInput();
});

function draw() {
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  ctx.save();
  const scale = Math.min(width / state.arena.width, height / state.arena.height);
  ctx.translate((width - state.arena.width * scale) / 2, (height - state.arena.height * scale) / 2);
  ctx.scale(scale, scale);

  // arena background
  const grad = ctx.createLinearGradient(0, 0, state.arena.width, state.arena.height);
  grad.addColorStop(0, 'rgba(122, 247, 213, 0.05)');
  grad.addColorStop(1, 'rgba(142, 166, 255, 0.08)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, state.arena.width, state.arena.height);

  // hazard gravity well
  if (state.hazard) {
    const glow = ctx.createRadialGradient(state.hazard.x, state.hazard.y, 20, state.hazard.x, state.hazard.y, 180);
    glow.addColorStop(0, 'rgba(255, 105, 180, 0.25)');
    glow.addColorStop(1, 'rgba(255, 105, 180, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(state.hazard.x - 200, state.hazard.y - 200, 400, 400);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(state.hazard.x, state.hazard.y, 180, 0, Math.PI * 2);
    ctx.stroke();
  }

  // energy orbs
  for (const orb of state.orbs) {
    const orbGrad = ctx.createRadialGradient(orb.x, orb.y, 2, orb.x, orb.y, 14);
    orbGrad.addColorStop(0, '#fff');
    orbGrad.addColorStop(1, '#7af7d5');
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, 10 + orb.value * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.font = 'bold 10px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(`+${orb.value}`, orb.x, orb.y + 3);
  }

  // players
  for (const player of state.players) {
    const isSelf = player.id === selfId;
    const radius = 26;
    ctx.save();
    ctx.translate(player.x, player.y);

    ctx.shadowBlur = isSelf ? 18 : 8;
    ctx.shadowColor = isSelf ? '#7af7d5' : 'rgba(0,0,0,0.2)';
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // direction cue
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 4, Math.atan2(player.vy, player.vx) - 0.4, Math.atan2(player.vy, player.vx) + 0.4);
    ctx.stroke();

    // charge pips
    for (let i = 0; i < player.charge; i++) {
      ctx.fillStyle = i < 3 ? '#7af7d5' : '#ffb86c';
      ctx.beginPath();
      ctx.arc(-radius + 6 + i * 6, radius + 6, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // nameplate
    ctx.font = 'bold 12px Inter';
    ctx.fillStyle = '#e9f2ff';
    ctx.textAlign = 'center';
    ctx.fillText(player.name, 0, -radius - 10);

    ctx.restore();
  }

  ctx.restore();
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);

function updateScoreboard() {
  scoreboard.innerHTML = '';
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  sorted.forEach((p) => {
    const row = document.createElement('div');
    row.className = 'score-row';

    const name = document.createElement('div');
    name.innerHTML = `<span class="score-color" style="color:${p.color}"></span> ${p.name}`;

    const score = document.createElement('div');
    score.className = 'badge';
    score.textContent = `${p.score} pts`;

    const charge = document.createElement('div');
    charge.className = 'badge';
    charge.textContent = `${p.charge} ⚡`;

    row.append(name, score, charge);
    scoreboard.appendChild(row);
  });
  requestAnimationFrame(updateScoreboard);
}
requestAnimationFrame(updateScoreboard);
