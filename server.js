const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Serve static files directly from the root directory
app.use(express.static(__dirname));

// Serve index.html when hitting the home route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let players = {};

io.on('connection', (socket) => {
    console.log('A goose connected:', socket.id);

    players[socket.id] = {
        id: socket.id,
        x: Math.random() * 20 - 10,
        z: Math.random() * 20 - 10,
        rotation: 0,
        color: Math.floor(Math.random() * 0xffffff),
        nickname: "Goose"
    };

    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);

    socket.on('setNickname', (nickname) => {
        if (players[socket.id]) {
            players[socket.id].nickname = nickname || "Goose";
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].z = movementData.z;
            players[socket.id].rotation = movementData.rotation;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    socket.on('chatMessage', (data) => {
        socket.broadcast.emit('chatMessage', {
            nickname: data.nickname || players[socket.id]?.nickname || "Goose",
            message: data.message
        });
    });

    socket.on('honk', () => {
        socket.broadcast.emit('playerHonked', socket.id);
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
