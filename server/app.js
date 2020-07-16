const fs = require("fs");
const express = require("express");
const https = require("https");
const socketIo = require("socket.io");

// File location of SSL private key file
const SSL_KEY = "/etc/letsencrypt/live/cloud.stephen.glass/privkey.pem";

// File location of SSL certificate file
const SSL_CERT = "/etc/letsencrypt/live/cloud.stephen.glass/cert.pem";

// List of trusted origins to allow socket connections from
const ORIGINS = "cloud.stephen.glass:*";

// Port to listen on for incoming socket connections
const PORT = process.env.PORT || 4001;

// Frequency in milliseconds to update clients with server time
const INTERVAL_DATE = 1000;

// Frequency in milliseconds to update clients other client info
const INTERVAL_CLIENTS = 1000;

const options = {
  key: fs.readFileSync(SSL_KEY),
  cert: fs.readFileSync(SSL_CERT),
};

const app = express();
const server = https.createServer(options, app);

const io = socketIo(server, {
  origins: ORIGINS,
});

var connections = [];

setInterval(() => emitDate(io), INTERVAL_DATE);
setInterval(() => updateClients(io), INTERVAL_CLIENTS);

io.on("connection", (socket) => {
  console.log(`New client connected (${socket.id})`);
  socket.emit("connected", socket.id);

  socket.on("update", (data) => {
    data.socket = socket.id;
    if (connections.length > 0 && connections[0] !== undefined) {
      var index = connections.findIndex((x) => x.socket === socket.id);
      if (index === -1) {
        // doesn't exist, add it
        connections.push(data);
      } else {
        connections[index] = data;
      }
    } else {
      connections.push(data);
    }
    if (process.env.DEBUG) {
      console.log("Connections:", connections);
    }
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected (${socket.id})`);
    if (connections.length > 0 && connections[0] !== undefined) {
      var index = connections.findIndex((x) => x.socket === socket.id);
      if (index !== -1) {
        // exists
        connections.splice(index, 1);
      }
    }
    if (process.env.DEBUG) {
      console.log("connections", connections);
    }
  });
});

const emitDate = (socket) => {
  const response = new Date();
  // Emitting a new message. Will be consumed by the client
  socket.emit("date", response);
};

const updateClients = (socket) => {
  if (connections.length > 0 && connections[0] !== undefined) {
    socket.emit("data", connections);
  }
};

server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
