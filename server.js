const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

let players = {};
let kanyes = {};
let nextKanyeId = 1;

let trumpState = {
    x: -150,
    z: -150,
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
    players[socket.id] = {
        id: socket.id,
        x: (Math.random() - 0.5) * 20,
        z: 25 + Math.random() * 10,
        rotation: 0,
        nickname: "Goose",
        color: Math.random() * 0xffffff,
        hp: 100
    };

    socket.emit('currentPlayers', players);
    socket.emit('currentKanyes', kanyes);
    socket.emit('trumpState', trumpState);
    socket.broadcast.emit('newPlayer', players[socket.id]);

    socket.on('setNickname', (nickname) => {
        if (players[socket.id]) players[socket.id].nickname = nickname;
    });

    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].z = movementData.z;
            players[socket.id].rotation = movementData.rotation;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
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
        io.emit('playerDisconnected', socket.id);
    });
});

http.listen(3000, () => {
    console.log('Server listening on port 3000');
});
