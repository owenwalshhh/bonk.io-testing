const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  const safePath = path.normalize(urlPath).replace(/^\.\/+/, '');
  let filePath = path.join(PUBLIC_DIR, safePath);
  if (urlPath === '/') {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.png': 'image/png',
      '.svg': 'image/svg+xml'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
});

const clients = new Map();
let nextPlayerNumber = 1;

const arena = { width: 1200, height: 700 };
const physics = {
  accel: 1200,
  maxSpeed: 420,
  friction: 0.88,
  bounce: 0.65,
  radius: 26,
  dashSpeed: 900,
  dashTime: 220,
  dashCooldown: 3200,
  gravityPull: 90,
  gravityRadius: 190
};

const hazard = { x: arena.width / 2, y: arena.height / 2 };
const energyOrbs = [];

function broadcast(payload) {
  const frame = createFrame(JSON.stringify(payload));
  for (const socket of clients.values()) {
    socket.write(frame);
  }
}

function randomColor() {
  const palette = ['#77f7d1', '#80b8ff', '#c38fff', '#ff8fb1', '#ffc773', '#9bff8a'];
  return palette[Math.floor(Math.random() * palette.length)];
}

function spawnOrb() {
  const orb = {
    id: crypto.randomUUID(),
    x: 100 + Math.random() * (arena.width - 200),
    y: 100 + Math.random() * (arena.height - 200),
    value: 1 + Math.floor(Math.random() * 3)
  };
  energyOrbs.push(orb);
}

function createPlayer(id) {
  const angle = Math.random() * Math.PI * 2;
  return {
    id,
    name: `Pilot ${nextPlayerNumber++}`,
    x: arena.width / 2 + Math.cos(angle) * 180,
    y: arena.height / 2 + Math.sin(angle) * 180,
    vx: 0,
    vy: 0,
    color: randomColor(),
    charge: 3,
    score: 0,
    dash: { readyAt: 0, activeUntil: 0 },
    inputs: { up: false, down: false, left: false, right: false }
  };
}

function handleMessage(id, socket, data) {
  const player = players.get(id);
  if (!player) return;
  if (data.type === 'input') {
    player.inputs = data.state;
  }
  if (data.type === 'dash') {
    const now = Date.now();
    if (player.dash.readyAt <= now) {
      const { x, y } = data.direction;
      const len = Math.hypot(x, y) || 1;
      player.vx += (x / len) * physics.dashSpeed;
      player.vy += (y / len) * physics.dashSpeed;
      player.dash.activeUntil = now + physics.dashTime;
      player.dash.readyAt = now + physics.dashCooldown;
      player.charge = Math.max(0, player.charge - 1);
    }
  }
  if (data.type === 'ping') {
    socket.write(createFrame(JSON.stringify({ type: 'pong', time: Date.now() })));
  }
}

const players = new Map();

function update(dt) {
  const now = Date.now();
  for (const player of players.values()) {
    const accel = physics.accel * dt;
    if (player.inputs.up) player.vy -= accel;
    if (player.inputs.down) player.vy += accel;
    if (player.inputs.left) player.vx -= accel;
    if (player.inputs.right) player.vx += accel;

    player.vx *= physics.friction;
    player.vy *= physics.friction;

    const speed = Math.hypot(player.vx, player.vy);
    if (speed > physics.maxSpeed) {
      const scale = physics.maxSpeed / speed;
      player.vx *= scale;
      player.vy *= scale;
    }

    const dx = hazard.x - player.x;
    const dy = hazard.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < physics.gravityRadius && dist > 4) {
      const pull = physics.gravityPull * dt * (1 - dist / physics.gravityRadius);
      player.vx += (dx / dist) * pull;
      player.vy += (dy / dist) * pull;
    }

    player.x += player.vx * dt;
    player.y += player.vy * dt;

    // wall collisions
    if (player.x - physics.radius < 0) {
      player.x = physics.radius;
      player.vx = Math.abs(player.vx) * physics.bounce;
    }
    if (player.x + physics.radius > arena.width) {
      player.x = arena.width - physics.radius;
      player.vx = -Math.abs(player.vx) * physics.bounce;
    }
    if (player.y - physics.radius < 0) {
      player.y = physics.radius;
      player.vy = Math.abs(player.vy) * physics.bounce;
    }
    if (player.y + physics.radius > arena.height) {
      player.y = arena.height - physics.radius;
      player.vy = -Math.abs(player.vy) * physics.bounce;
    }
  }

  // collisions between players
  const list = Array.from(players.values());
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.0001;
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
  }

  // orb collection
  for (let i = energyOrbs.length - 1; i >= 0; i--) {
    const orb = energyOrbs[i];
    for (const player of players.values()) {
      const dist = Math.hypot(player.x - orb.x, player.y - orb.y);
      if (dist < physics.radius + 10) {
        player.score += orb.value;
        player.charge = Math.min(8, player.charge + orb.value);
        energyOrbs.splice(i, 1);
        break;
      }
    }
  }

  // dash recharge trickle
  for (const player of players.values()) {
    if (player.dash.readyAt < now && player.charge < 8 && Math.random() < dt * 0.5) {
      player.charge += 1;
    }
  }
}

function gameLoop() {
  const tick = 1000 / 60;
  update(tick / 1000);
  broadcast({
    type: 'state',
    players: Array.from(players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      x: p.x,
      y: p.y,
      vx: p.vx,
      vy: p.vy,
      color: p.color,
      charge: p.charge,
      score: p.score,
      dash: p.dash
    })),
    orbs: energyOrbs,
    hazard,
    arena,
    time: Date.now()
  });
}

setInterval(gameLoop, 1000 / 20);
setInterval(() => {
  if (energyOrbs.length < 6) spawnOrb();
}, 4000);

server.on('upgrade', (req, socket) => {
  if (req.headers['upgrade'] !== 'websocket') {
    socket.end('HTTP/1.1 400 Bad Request');
    return;
  }
  const acceptKey = generateAcceptValue(req.headers['sec-websocket-key']);
  const responseHeaders = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`
  ];
  socket.write(responseHeaders.concat('\r\n').join('\r\n'));

  const id = crypto.randomUUID();
  const player = createPlayer(id);
  players.set(id, player);
  clients.set(id, socket);

  socket.on('data', (buffer) => {
    const messages = parseFrames(buffer);
    for (const message of messages) {
      try {
        const data = JSON.parse(message);
        handleMessage(id, socket, data);
      } catch (err) {
        console.error('Bad message', err.message);
      }
    }
  });

  socket.on('close', () => {
    players.delete(id);
    clients.delete(id);
  });

  socket.on('error', () => {
    players.delete(id);
    clients.delete(id);
  });

  const welcome = createFrame(
    JSON.stringify({
      type: 'init',
      id,
      arena,
      physics,
      name: player.name,
      color: player.color,
      hazard
    })
  );
  socket.write(welcome);
});

function generateAcceptValue(key) {
  return crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', 'binary')
    .digest('base64');
}

function parseFrames(buffer) {
  const messages = [];
  let offset = 0;
  while (offset < buffer.length) {
    const byte1 = buffer[offset++];
    const byte2 = buffer[offset++];
    const opcode = byte1 & 0x0f;
    const isMasked = (byte2 & 0x80) === 0x80;
    let payloadLength = byte2 & 0x7f;

    if (payloadLength === 126) {
      payloadLength = buffer.readUInt16BE(offset);
      offset += 2;
    } else if (payloadLength === 127) {
      const high = buffer.readUInt32BE(offset);
      const low = buffer.readUInt32BE(offset + 4);
      payloadLength = high * 2 ** 32 + low;
      offset += 8;
    }

    let maskingKey;
    if (isMasked) {
      maskingKey = buffer.slice(offset, offset + 4);
      offset += 4;
    }

    const payload = buffer.slice(offset, offset + payloadLength);
    offset += payloadLength;

    if (opcode === 0x8) {
      continue; // close frame
    }
    if (opcode === 0x9) {
      continue; // ping
    }
    if (opcode !== 0x1) {
      continue; // only text frames
    }

    let message = payload;
    if (isMasked) {
      const unmasked = Buffer.alloc(payload.length);
      for (let i = 0; i < payload.length; i++) {
        unmasked[i] = payload[i] ^ maskingKey[i % 4];
      }
      message = unmasked;
    }
    messages.push(message.toString());
  }
  return messages;
}

function createFrame(data) {
  const payload = Buffer.from(data);
  const length = payload.length;
  let header;
  if (length < 126) {
    header = Buffer.from([0x81, length]);
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header.writeUInt8(0x81, 0);
    header.writeUInt8(126, 1);
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header.writeUInt8(0x81, 0);
    header.writeUInt8(127, 1);
    header.writeBigUInt64BE(BigInt(length), 2);
  }
  return Buffer.concat([header, payload]);
}

server.listen(PORT, () => {
  console.log(`bonk.io-inspired arena live at http://localhost:${PORT}`);
});
