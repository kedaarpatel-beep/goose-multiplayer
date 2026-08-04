const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

let players = {};

io.on('connection', (socket) => {
    console.log('A goose connected:', socket.id);

    // Create a new player entry with a default nickname
    players[socket.id] = {
        id: socket.id,
        x: Math.random() * 20 - 10,
        z: Math.random() * 20 - 10,
        rotation: 0,
        color: Math.floor(Math.random() * 0xffffff),
        nickname: "Goose"
    };

    // Send current players to the newly connected player
    socket.emit('currentPlayers', players);

    // Broadcast new player to all existing players
    socket.broadcast.emit('newPlayer', players[socket.id]);

    // Handle Nickname Update
    socket.on('setNickname', (nickname) => {
        if (players[socket.id]) {
            players[socket.id].nickname = nickname || "Goose";
            // Notify other players about the updated nickname
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    // Handle Movement
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].z = movementData.z;
            players[socket.id].rotation = movementData.rotation;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    // Handle Chat Messages
    socket.on('chatMessage', (data) => {
        // Relay chat message to everyone except the sender
        socket.broadcast.emit('chatMessage', {
            nickname: data.nickname || players[socket.id]?.nickname || "Goose",
            message: data.message
        });
    });

    // Handle Honk Event
    socket.on('honk', () => {
        socket.broadcast.emit('playerHonked', socket.id);
    });

    // Handle Disconnect
    socket.on('disconnect', () => {
        console.log('Goose disconnected:', socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
