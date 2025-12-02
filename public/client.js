const canvas = document.getElementById('arena');
const ctx = canvas.getContext('2d');
const scoreboard = document.getElementById('scoreboard');
const hudInfo = document.getElementById('hud-info');
const hudTip = document.getElementById('hud-tip');
const chatLog = document.getElementById('chat-log');
const chatInput = document.getElementById('chat-input');
const chatForm = document.getElementById('chat-form');
const chatPresence = document.getElementById('chat-presence');
const gamesList = document.getElementById('games-list');
const gameMapSelect = document.getElementById('game-map');
const gameModeSelect = document.getElementById('game-mode');
const gameNameInput = document.getElementById('game-name');
const createGameForm = document.getElementById('create-game');
const refreshLobby = document.getElementById('refresh-lobby');
const leaveGameBtn = document.getElementById('leave-game');
const toggleEditorBtn = document.getElementById('toggle-editor');
const closeEditorBtn = document.getElementById('close-editor');
const soloStartBtn = document.getElementById('solo-start');
const sessionNameEl = document.getElementById('session-name');
const sessionRoleEl = document.getElementById('session-role');
const currentGameEl = document.getElementById('current-game');
const currentMapEl = document.getElementById('current-map');
const authOverlay = document.getElementById('auth-overlay');
const authLogin = document.getElementById('auth-login');
const authSignup = document.getElementById('auth-signup');
const authUsername = document.getElementById('auth-username');
const authPassword = document.getElementById('auth-password');
const editorSection = document.getElementById('editor');
const mapCanvas = document.getElementById('map-canvas');
const mapCtx = mapCanvas.getContext('2d');
const mapNameInput = document.getElementById('map-name');
const mapTintInput = document.getElementById('map-tint');
const mapHazardInput = document.getElementById('map-hazard');
const platformInputs = {
  x: document.getElementById('platform-x'),
  y: document.getElementById('platform-y'),
  w: document.getElementById('platform-w'),
  h: document.getElementById('platform-h')
};
const spawnInputs = {
  x: document.getElementById('spawn-x'),
  y: document.getElementById('spawn-y')
};
const platformList = document.getElementById('platform-list');
const addPlatformBtn = document.getElementById('add-platform');
const addSpawnBtn = document.getElementById('add-spawn');
const saveMapBtn = document.getElementById('save-map');
const clearMapBtn = document.getElementById('clear-map');
const hudTips = [
  'Dash (Space) to knock foes off balance.',
  'Collect orbs to refresh your dash faster.',
  'Aim for high ground platforms to control orbs.',
  'Survival mode rewards staying away from the hazard ring.',
  'Admin (owenwlsh) can /spawn bots or /boost players.'
];

const palette = ['#77f7d1', '#80b8ff', '#c38fff', '#ff8fb1', '#ffc773', '#9bff8a'];
const botNames = ['Vortex', 'Orbital', 'Neonator', 'Zenith', 'PulseCat', 'ZeroG', 'Slipstream', 'Rotor', 'Hiro', 'Iris'];

const physics = {
  accel: 1100,
  maxSpeed: 420,
  friction: 0.88,
  bounce: 0.7,
  radius: 24,
  dashSpeed: 900,
  dashTime: 260,
  dashCooldown: 3200,
  gravityPull: 90
};

const maps = [
  {
    id: 'core',
    name: 'Pulse Core',
    tint: '#7af7d5',
    hazard: 170,
    size: { width: 1200, height: 720 },
    platforms: [
      { x: 420, y: 360, w: 360, h: 16 },
      { x: 160, y: 500, w: 240, h: 14 },
      { x: 800, y: 220, w: 280, h: 14 }
    ],
    spawns: [
      { x: 320, y: 280 },
      { x: 880, y: 280 },
      { x: 600, y: 520 }
    ]
  },
  {
    id: 'helix',
    name: 'Helix Run',
    tint: '#8cb3ff',
    hazard: 200,
    size: { width: 1200, height: 720 },
    platforms: [
      { x: 260, y: 420, w: 240, h: 14 },
      { x: 520, y: 260, w: 200, h: 14 },
      { x: 760, y: 420, w: 240, h: 14 },
      { x: 520, y: 580, w: 200, h: 14 }
    ],
    spawns: [
      { x: 240, y: 380 },
      { x: 960, y: 380 },
      { x: 600, y: 200 }
    ]
  },
  {
    id: 'pillars',
    name: 'Pillars',
    tint: '#ffb86c',
    hazard: 150,
    size: { width: 1200, height: 720 },
    platforms: [
      { x: 280, y: 560, w: 60, h: 160 },
      { x: 520, y: 320, w: 60, h: 220 },
      { x: 760, y: 560, w: 60, h: 160 },
      { x: 520, y: 620, w: 220, h: 18 }
    ],
    spawns: [
      { x: 320, y: 320 },
      { x: 880, y: 320 },
      { x: 600, y: 180 }
    ]
  }
];

let customMap = { platforms: [], spawns: [], hazard: 160, tint: '#7af7d5' };

const state = {
  user: null,
  isAdmin: false,
  games: [],
  activeGameId: null,
  chat: [],
  lastTick: performance.now()
};

function randomColor() {
  return palette[Math.floor(Math.random() * palette.length)];
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function seedGames() {
  const defaults = [
    { name: 'Classic Queue', mode: 'Score Race', mapId: 'core' },
    { name: 'Hazard Sprint', mode: 'Survival', mapId: 'helix' },
    { name: 'Orbit Control', mode: 'King of the Orbit', mapId: 'pillars' }
  ];
  defaults.forEach((g, idx) => {
    const game = createGame(g.name, g.mode, g.mapId, idx === 0);
    for (let i = 0; i < 3; i++) {
      const bot = createPlayer(botNames[(i + idx) % botNames.length], true);
      joinGame(game.id, bot);
    }
  });
}

function createGame(name, mode, mapId, silent = false) {
  const map = getMap(mapId);
  const game = {
    id: crypto.randomUUID(),
    name,
    mode,
    mapId,
    createdAt: Date.now(),
    status: 'live',
    players: [],
    orbs: [],
    hazard: { x: map.size.width / 2, y: map.size.height / 2 },
    tip: hudTips[Math.floor(Math.random() * hudTips.length)]
  };
  state.games.push(game);
  if (!silent) pushSystem(`hosted ${name} on ${map.name}`);
  return game;
}

function getMap(id) {
  return maps.find((m) => m.id === id) || maps[0];
}

function createPlayer(name, ai = false) {
  const map = getActiveMap();
  const spawn = pickSpawn(map);
  return {
    id: crypto.randomUUID(),
    name,
    color: randomColor(),
    score: 0,
    charge: 3,
    x: spawn.x,
    y: spawn.y,
    vx: 0,
    vy: 0,
    ai,
    dash: { readyAt: 0, activeUntil: 0 },
    inputs: { up: false, down: false, left: false, right: false }
  };
}

function pickSpawn(map) {
  if (map.spawns.length) {
    return map.spawns[Math.floor(Math.random() * map.spawns.length)];
  }
  return { x: map.size.width / 2, y: map.size.height / 2 };
}

function joinGame(gameId, player) {
  const game = state.games.find((g) => g.id === gameId);
  if (!game) return;
  const existing = game.players.find((p) => p.name === player.name);
  if (existing) return existing;
  const map = getMap(game.mapId);
  const spawn = pickSpawn(map);
  player.x = spawn.x;
  player.y = spawn.y;
  player.vx = 0;
  player.vy = 0;
  game.players.push(player);
  if (!player.ai) {
    state.activeGameId = game.id;
    currentGameEl.textContent = `${game.name} • ${game.mode}`;
    currentMapEl.textContent = getMap(game.mapId).name;
  }
  return player;
}

function leaveGame() {
  const game = getActiveGame();
  if (!game || !state.user) return;
  game.players = game.players.filter((p) => !(p.name === state.user));
  if (state.activeGameId === game.id) state.activeGameId = null;
  currentGameEl.textContent = 'No game joined';
  currentMapEl.textContent = '—';
}

function pushChat(text, name = 'system', kind = 'system') {
  state.chat.push({ id: crypto.randomUUID(), text, name, kind, time: formatTime() });
  if (state.chat.length > 200) state.chat.shift();
  renderChat();
}

function pushSystem(text) {
  pushChat(text, 'system', 'system');
}

function renderChat() {
  chatLog.innerHTML = '';
  state.chat.forEach((line) => {
    const div = document.createElement('div');
    div.className = 'chat-line';
    div.innerHTML = `<span class="time">${line.time}</span> <span class="name">${line.name}</span>: ${line.text}`;
    if (line.kind === 'system') div.classList.add('muted');
    chatLog.appendChild(div);
  });
  chatLog.scrollTop = chatLog.scrollHeight;
  chatPresence.textContent = `${totalPlayers()} online across ${state.games.length} rooms`;
}

function totalPlayers() {
  return state.games.reduce((sum, g) => sum + g.players.length, 0);
}

function renderLobby() {
  gamesList.innerHTML = '';
  state.games
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((g) => {
      const card = document.createElement('div');
      card.className = 'card';
      const map = getMap(g.mapId);
      card.innerHTML = `
        <div class="row" style="justify-content: space-between; align-items: center;">
          <div>
            <div><strong>${g.name}</strong></div>
            <div class="game-card-meta">${g.mode} • ${map.name} • ${g.players.length} players</div>
          </div>
          <div class="row compact">
            <button data-join="${g.id}">Join</button>
            <button data-spectate="${g.id}" class="ghost">Spectate</button>
          </div>
        </div>`;
      gamesList.appendChild(card);
    });
}

function renderMapsDropdown() {
  gameMapSelect.innerHTML = '';
  maps.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.name;
    gameMapSelect.appendChild(opt);
  });
}

function getActiveGame() {
  return state.games.find((g) => g.id === state.activeGameId) || null;
}

function getActiveMap() {
  const game = getActiveGame();
  return game ? getMap(game.mapId) : maps[0];
}

function spawnOrb(game) {
  const map = getMap(game.mapId);
  const orb = {
    id: crypto.randomUUID(),
    x: 80 + Math.random() * (map.size.width - 160),
    y: 80 + Math.random() * (map.size.height - 160),
    value: 1 + Math.floor(Math.random() * 3)
  };
  game.orbs.push(orb);
}

function updateGame(game, dt) {
  const map = getMap(game.mapId);
  const now = performance.now();
  if (game.orbs.length < 5 && Math.random() < dt * 0.8) spawnOrb(game);

  for (const player of game.players) {
    if (player.ai) {
      driveBot(game, player, dt);
    }

    const accel = physics.accel * dt;
    if (player.inputs.up) player.vy -= accel;
    if (player.inputs.down) player.vy += accel;
    if (player.inputs.left) player.vx -= accel;
    if (player.inputs.right) player.vx += accel;

    player.vx *= physics.friction;
    player.vy *= physics.friction;

    const speed = Math.hypot(player.vx, player.vy);
    if (speed > physics.maxSpeed) {
      const s = physics.maxSpeed / speed;
      player.vx *= s;
      player.vy *= s;
    }

    const dx = map.size.width / 2 - player.x;
    const dy = map.size.height / 2 - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < map.hazard && dist > 6) {
      const pull = physics.gravityPull * dt * (1 - dist / map.hazard);
      player.vx += (dx / dist) * pull;
      player.vy += (dy / dist) * pull;
    }

    player.x += player.vx * dt;
    player.y += player.vy * dt;

    if (player.x - physics.radius < 0) {
      player.x = physics.radius;
      player.vx = Math.abs(player.vx) * physics.bounce;
    }
    if (player.x + physics.radius > map.size.width) {
      player.x = map.size.width - physics.radius;
      player.vx = -Math.abs(player.vx) * physics.bounce;
    }
    if (player.y - physics.radius < 0) {
      player.y = physics.radius;
      player.vy = Math.abs(player.vy) * physics.bounce;
    }
    if (player.y + physics.radius > map.size.height) {
      player.y = map.size.height - physics.radius;
      player.vy = -Math.abs(player.vy) * physics.bounce;
    }

    resolvePlatforms(map, player);

    for (let i = game.orbs.length - 1; i >= 0; i--) {
      const orb = game.orbs[i];
      const d = Math.hypot(player.x - orb.x, player.y - orb.y);
      if (d < physics.radius + 10) {
        player.score += orb.value;
        player.charge = Math.min(8, player.charge + orb.value);
        game.orbs.splice(i, 1);
      }
    }

    if (player.dash.readyAt < now && player.charge < 8 && Math.random() < dt * 0.4) {
      player.charge += 1;
    }
  }

  const list = [...game.players];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      collidePlayers(list[i], list[j]);
    }
  }
}

function resolvePlatforms(map, player) {
  for (const p of map.platforms) {
    const closestX = clamp(player.x, p.x, p.x + p.w);
    const closestY = clamp(player.y, p.y, p.y + p.h);
    const dx = player.x - closestX;
    const dy = player.y - closestY;
    const dist = Math.hypot(dx, dy);
    if (dist < physics.radius) {
      const overlap = physics.radius - dist || 1;
      const nx = dx / dist || 0;
      const ny = dy / dist || 0;
      player.x += nx * overlap;
      player.y += ny * overlap;
      player.vx += nx * physics.bounce * 30;
      player.vy += ny * physics.bounce * 30;
    }
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function collidePlayers(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 0.001;
  const overlap = physics.radius * 2 - dist;
  if (overlap > 0) {
    const nx = dx / dist;
    const ny = dy / dist;
    const push = overlap / 2 + 0.5;
    a.x -= nx * push;
    a.y -= ny * push;
    b.x += nx * push;
    b.y += ny * push;

    const relVel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    const impulse = relVel * 0.7;
    a.vx += impulse * nx;
    a.vy += impulse * ny;
    b.vx -= impulse * nx;
    b.vy -= impulse * ny;
  }
}

function driveBot(game, bot, dt) {
  const target = pickBotTarget(game, bot);
  if (target) {
    const dx = target.x - bot.x;
    const dy = target.y - bot.y;
    bot.inputs.left = dx < -10;
    bot.inputs.right = dx > 10;
    bot.inputs.up = dy < -10;
    bot.inputs.down = dy > 10;
  }
  if (Math.random() < dt * 0.8 && bot.charge > 0) {
    dash(bot, target);
  }
}

function pickBotTarget(game, bot) {
  const orb = game.orbs[0];
  if (orb) return orb;
  const map = getMap(game.mapId);
  return { x: map.size.width / 2, y: map.size.height / 2 };
}

function dash(player, target) {
  const now = performance.now();
  if (player.dash.readyAt > now || player.charge <= 0) return;
  const dir = target
    ? { x: target.x - player.x, y: target.y - player.y }
    : { x: Math.random() - 0.5, y: Math.random() - 0.5 };
  const len = Math.hypot(dir.x, dir.y) || 1;
  player.vx += (dir.x / len) * physics.dashSpeed;
  player.vy += (dir.y / len) * physics.dashSpeed;
  player.dash.activeUntil = now + physics.dashTime;
  player.dash.readyAt = now + physics.dashCooldown;
  player.charge -= 1;
}

function handleInput(e, pressed) {
  if (!state.user) return;
  const player = getLocalPlayer();
  if (!player) return;
  if (['KeyW', 'ArrowUp'].includes(e.code)) player.inputs.up = pressed;
  if (['KeyS', 'ArrowDown'].includes(e.code)) player.inputs.down = pressed;
  if (['KeyA', 'ArrowLeft'].includes(e.code)) player.inputs.left = pressed;
  if (['KeyD', 'ArrowRight'].includes(e.code)) player.inputs.right = pressed;
  if (e.code === 'Space' && pressed) dash(player);
}

window.addEventListener('keydown', (e) => handleInput(e, true));
window.addEventListener('keyup', (e) => handleInput(e, false));

function resize() {
  canvas.width = canvas.clientWidth * window.devicePixelRatio;
  canvas.height = canvas.clientHeight * window.devicePixelRatio;
}
window.addEventListener('resize', resize);
resize();

function draw() {
  const game = getActiveGame();
  const map = getActiveMap();
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const scale = Math.min(width / map.size.width, height / map.size.height);
  ctx.save();
  ctx.translate((width - map.size.width * scale) / 2, (height - map.size.height * scale) / 2);
  ctx.scale(scale, scale);

  const grad = ctx.createLinearGradient(0, 0, map.size.width, map.size.height);
  grad.addColorStop(0, `${map.tint}22`);
  grad.addColorStop(1, 'rgba(255,255,255,0.03)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, map.size.width, map.size.height);

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, map.size.width, map.size.height);

  const hazardGrad = ctx.createRadialGradient(
    map.size.width / 2,
    map.size.height / 2,
    20,
    map.size.width / 2,
    map.size.height / 2,
    map.hazard
  );
  hazardGrad.addColorStop(0, `${map.tint}33`);
  hazardGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hazardGrad;
  ctx.fillRect(map.size.width / 2 - map.hazard, map.size.height / 2 - map.hazard, map.hazard * 2, map.hazard * 2);

  ctx.strokeStyle = `${map.tint}55`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(map.size.width / 2, map.size.height / 2, map.hazard, 0, Math.PI * 2);
  ctx.stroke();

  map.platforms.forEach((p) => {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = `${map.tint}66`;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
  });

  if (game) {
    for (const orb of game.orbs) {
      const orbGrad = ctx.createRadialGradient(orb.x, orb.y, 2, orb.x, orb.y, 14);
      orbGrad.addColorStop(0, '#fff');
      orbGrad.addColorStop(1, map.tint);
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, 10 + orb.value * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.font = 'bold 10px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`+${orb.value}`, orb.x, orb.y + 3);
    }

    for (const player of game.players) {
      const radius = physics.radius;
      ctx.save();
      ctx.translate(player.x, player.y);

      ctx.shadowBlur = 16;
      ctx.shadowColor = player.color;
      ctx.fillStyle = player.color;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 4, Math.atan2(player.vy, player.vx) - 0.4, Math.atan2(player.vy, player.vx) + 0.4);
      ctx.stroke();

      for (let i = 0; i < player.charge; i++) {
        ctx.fillStyle = i < 3 ? map.tint : '#ffb86c';
        ctx.beginPath();
        ctx.arc(-radius + 6 + i * 6, radius + 6, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.font = 'bold 12px Inter';
      ctx.fillStyle = '#e9f2ff';
      ctx.textAlign = 'center';
      ctx.fillText(player.name, 0, -radius - 10);
      ctx.restore();
    }
  }

  ctx.restore();
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);

function renderScoreboard() {
  scoreboard.innerHTML = '';
  const game = getActiveGame();
  if (!game) return;
  const sorted = [...game.players].sort((a, b) => b.score - a.score);
  sorted.forEach((p) => {
    const row = document.createElement('div');
    row.className = 'score-row';

    const name = document.createElement('div');
    name.innerHTML = `<span class="score-color" style="background:${p.color}"></span> ${p.name}`;

    const score = document.createElement('div');
    score.className = 'badge';
    score.textContent = `${p.score} pts`;

    const charge = document.createElement('div');
    charge.className = 'badge';
    charge.textContent = `${p.charge} ⚡`;

    row.append(name, score, charge);
    scoreboard.appendChild(row);
  });
  requestAnimationFrame(renderScoreboard);
}
requestAnimationFrame(renderScoreboard);

function getLocalPlayer() {
  const game = getActiveGame();
  if (!game || !state.user) return null;
  return game.players.find((p) => p.name === state.user) || null;
}

function tick() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - state.lastTick) / 1000);
  state.lastTick = now;
  state.games.forEach((g) => updateGame(g, dt));
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

function handleChatSubmit(e) {
  e.preventDefault();
  if (!state.user) return;
  const text = chatInput.value.trim();
  if (!text) return;

  if (text.startsWith('/')) {
    handleCommand(text);
  } else {
    pushChat(text, state.user, 'user');
  }
  chatInput.value = '';
}

function handleCommand(text) {
  if (!state.isAdmin) {
    pushChat('Only admin (owenwlsh) can run commands.', 'system', 'system');
    return;
  }
  const parts = text.slice(1).split(' ');
  const cmd = parts[0];
  const args = parts.slice(1);
  const game = getActiveGame();

  if (cmd === 'spawn' && game) {
    const name = args[0] || `Bot${Math.floor(Math.random() * 99)}`;
    const bot = createPlayer(name, true);
    joinGame(game.id, bot);
    pushSystem(`Spawned bot ${name} in ${game.name}`);
    return;
  }

  if (cmd === 'boost' && game) {
    const targetName = args[0];
    const boost = parseInt(args[1] || '5', 10);
    const target = game.players.find((p) => p.name === targetName);
    if (target) {
      target.score += boost;
      pushSystem(`Boosted ${target.name} by ${boost} points`);
    }
    return;
  }

  if (cmd === 'wipe' && game) {
    game.orbs = [];
    pushSystem('Cleared all orbs');
    return;
  }

  if (cmd === 'tip') {
    hudTip.textContent = hudTips[Math.floor(Math.random() * hudTips.length)];
    pushSystem('Rotated HUD tip');
    return;
  }

  pushSystem(`Unknown command: ${cmd}`);
}

chatForm.addEventListener('submit', handleChatSubmit);

createGameForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const mapId = gameMapSelect.value;
  const game = createGame(gameNameInput.value || 'Custom Room', gameModeSelect.value, mapId);
  if (state.user) {
    const player = createPlayer(state.user, false);
    joinGame(game.id, player);
  }
  renderLobby();
});

refreshLobby.addEventListener('click', renderLobby);
leaveGameBtn.addEventListener('click', leaveGame);
toggleEditorBtn.addEventListener('click', () => editorSection.scrollIntoView({ behavior: 'smooth' }));
closeEditorBtn.addEventListener('click', () => editorSection.scrollIntoView({ behavior: 'smooth' }));
soloStartBtn.addEventListener('click', () => {
  const quick = createGame('Solo Sandbox', 'Score Race', gameMapSelect.value);
  if (state.user) joinGame(quick.id, createPlayer(state.user));
  renderLobby();
});

gamesList.addEventListener('click', (e) => {
  const joinId = e.target.getAttribute('data-join');
  const specId = e.target.getAttribute('data-spectate');
  if (joinId && state.user) {
    const player = createPlayer(state.user);
    joinGame(joinId, player);
  }
  if (specId) {
    state.activeGameId = specId;
    const game = getActiveGame();
    if (game) {
      currentGameEl.textContent = `${game.name} • ${game.mode}`;
      currentMapEl.textContent = getMap(game.mapId).name;
    }
  }
});

function authenticate() {
  const name = authUsername.value.trim();
  if (!name) return;
  state.user = name;
  state.isAdmin = name.toLowerCase() === 'owenwlsh';
  sessionNameEl.textContent = name;
  sessionRoleEl.textContent = state.isAdmin ? 'Admin • can run / commands' : 'Pilot';
  authOverlay.classList.add('hidden');
  pushSystem(`${name} connected`);
  if (!state.activeGameId && state.games[0]) {
    joinGame(state.games[0].id, createPlayer(name));
  }
}

authLogin.addEventListener('click', authenticate);
authSignup.addEventListener('click', authenticate);

function renderEditor() {
  mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
  mapCtx.fillStyle = '#030711';
  mapCtx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
  const hazard = parseInt(mapHazardInput.value, 10) || 160;
  mapCtx.strokeStyle = `${mapTintInput.value}77`;
  mapCtx.lineWidth = 3;
  mapCtx.beginPath();
  mapCtx.arc(mapCanvas.width / 2, mapCanvas.height / 2, (hazard / 1200) * mapCanvas.width, 0, Math.PI * 2);
  mapCtx.stroke();

  mapCtx.fillStyle = 'rgba(255,255,255,0.08)';
  customMap.platforms.forEach((p) => {
    mapCtx.fillRect((p.x / 1200) * mapCanvas.width, (p.y / 720) * mapCanvas.height, (p.w / 1200) * mapCanvas.width, (p.h / 720) * mapCanvas.height);
  });

  mapCtx.fillStyle = mapTintInput.value;
  customMap.spawns.forEach((s) => {
    mapCtx.beginPath();
    mapCtx.arc((s.x / 1200) * mapCanvas.width, (s.y / 720) * mapCanvas.height, 6, 0, Math.PI * 2);
    mapCtx.fill();
  });

  platformList.innerHTML = '';
  customMap.platforms.forEach((p, idx) => {
    const row = document.createElement('div');
    row.textContent = `${idx + 1}. x${p.x} y${p.y} w${p.w} h${p.h}`;
    platformList.appendChild(row);
  });
}

addPlatformBtn.addEventListener('click', () => {
  const x = parseInt(platformInputs.x.value, 10) || 100;
  const y = parseInt(platformInputs.y.value, 10) || 100;
  const w = parseInt(platformInputs.w.value, 10) || 160;
  const h = parseInt(platformInputs.h.value, 10) || 16;
  customMap.platforms.push({ x, y, w, h });
  renderEditor();
});

addSpawnBtn.addEventListener('click', () => {
  const x = parseInt(spawnInputs.x.value, 10) || 200;
  const y = parseInt(spawnInputs.y.value, 10) || 200;
  customMap.spawns.push({ x, y });
  renderEditor();
});

clearMapBtn.addEventListener('click', () => {
  customMap.platforms = [];
  customMap.spawns = [];
  renderEditor();
});

saveMapBtn.addEventListener('click', () => {
  const id = mapNameInput.value.toLowerCase().replace(/\s+/g, '-') || `custom-${Date.now()}`;
  const map = {
    id,
    name: mapNameInput.value || 'Custom',
    tint: mapTintInput.value,
    hazard: parseInt(mapHazardInput.value, 10) || 160,
    size: { width: 1200, height: 720 },
    platforms: customMap.platforms.slice(),
    spawns: customMap.spawns.slice()
  };
  maps.push(map);
  renderMapsDropdown();
  gameMapSelect.value = map.id;
  pushSystem(`Saved custom map ${map.name}`);
});

mapHazardInput.addEventListener('input', renderEditor);
mapTintInput.addEventListener('input', renderEditor);

function init() {
  renderMapsDropdown();
  seedGames();
  renderLobby();
  renderChat();
  renderEditor();
  hudTip.textContent = hudTips[Math.floor(Math.random() * hudTips.length)];
  hudInfo.textContent = 'Press WASD/Arrows to move • Space to dash';
}

init();
