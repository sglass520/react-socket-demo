const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const port = process.env.PORT || 4001;
const index = require("./routes/index");

const app = express();
app.use(index);

const server = http.createServer(app);

const io = socketIo(server);

var connections = [];

setInterval(() => emitDate(io), 1000);
setInterval(() => updateClients(io), 100);

io.on("connection", (socket) => {
  console.log("New client connected");

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
    console.log("Connections:", connections);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
    if (connections.length > 0 && connections[0] !== undefined) {
      var index = connections.findIndex((x) => x.socket === socket.id);
      if (index !== -1) {
        // exists
        connections.splice(index, 1);
      }
    }
    console.log("connections", connections);
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

server.listen(port, () => console.log(`Listening on port ${port}`));
