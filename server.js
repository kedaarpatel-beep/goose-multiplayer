const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

let players = {};
let kanyes = {};
let portalPairs = {};
let nextKanyeId = 1;

let trumpState = {
    x: -140,
    z: -140,
    hp: 500,
    maxHp: 500,
    active: false
};

// Server-side Kanye Spawner
setInterval(() => {
    if (Object.keys(players).length > 0) {
        const id = 'kanye_' + nextKanyeId++;
        const rx = (Math.random() - 0.5) * 350;
        const rz = (Math.random() - 0.5) * 350;
        kanyes[id] = { id, x: rx, z: rz };
        io.emit('kanyeSpawned', kanyes[id]);
    }
}, 5000);

io.on('connection', (socket) => {
    // Spawn player in front of stage at z = 35..45 instead of inside stage (0, 0)
    players[socket.id] = {
        id: socket.id,
        x: (Math.random() - 0.5) * 16,
        z: 35 + Math.random() * 10,
        rotationY: 0,
        rotationX: 0,
        nickname: "Goose",
        color: Math.random() * 0xffffff,
        hp: 100,
        selectedWeapon: "mic"
    };

    socket.emit('currentPlayers', players);
    socket.emit('currentKanyes', kanyes);
    socket.emit('trumpState', trumpState);
    socket.emit('currentPortals', portalPairs);
    socket.broadcast.emit('newPlayer', players[socket.id]);

    socket.on('setNickname', (nickname) => {
        if (players[socket.id]) players[socket.id].nickname = nickname;
    });

    socket.on('playerMovement', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].z = data.z;
            players[socket.id].rotationY = data.rotationY;
            players[socket.id].rotationX = data.rotationX;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    socket.on('switchWeapon', (weapon) => {
        if (players[socket.id]) {
            players[socket.id].selectedWeapon = weapon;
            socket.broadcast.emit('playerSwitchedWeapon', { id: socket.id, weapon });
        }
    });

    socket.on('firePortal', (data) => {
        portalPairs[socket.id] = portalPairs[socket.id] || {};
        portalPairs[socket.id][data.type] = { x: data.x, y: data.y, z: data.z };
        io.emit('portalSpawned', { playerId: socket.id, type: data.type, pos: portalPairs[socket.id][data.type] });
    });

    socket.on('honk', () => {
        socket.broadcast.emit('playerHonked', socket.id);
    });

    socket.on('chatMessage', (data) => {
        socket.broadcast.emit('chatMessage', data);
    });

    socket.on('hitKanye', (kanyeId) => {
        if (kanyes[kanyeId]) {
            delete kanyes[kanyeId];
            io.emit('kanyeDefeated', { id: kanyeId, attackerId: socket.id });
        }
    });

    socket.on('triggerTrumpBoss', () => {
        trumpState.active = true;
        io.emit('trumpBossActivated', trumpState);
    });

    socket.on('hitTrump', (damage) => {
        if (trumpState.hp > 0) {
            trumpState.hp = Math.max(0, trumpState.hp - damage);
            io.emit('trumpHPUpdate', { hp: trumpState.hp, maxHp: trumpState.maxHp });
            if (trumpState.hp === 0) {
                io.emit('trumpDefeated');
            }
        }
    });

    socket.on('playerTakeDamage', (damage) => {
        if (players[socket.id]) {
            players[socket.id].hp = Math.max(0, players[socket.id].hp - damage);
            socket.emit('yourHPUpdate', players[socket.id].hp);
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        delete portalPairs[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

http.listen(3000, () => {
    console.log('Server listening on port 3000');
});
