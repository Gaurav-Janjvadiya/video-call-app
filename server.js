import express from "express";
import { createServer } from "http";
import { readFileSync } from "fs";
import { createServer as createSecureServer } from "https";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { config } from "dotenv";
config();

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.static(__dirname));

// Create HTTP server instead of HTTPS
const server =
  process.env.ENV === "DEVELOPEMENT"
    ? createSecureServer(
        { key: readFileSync("cert.key"), cert: readFileSync("cert.crt") },
        app
      )
    : createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

io.on("connection", (socket) => {
  socket.on("offer", (data) => {
    socket.broadcast.emit("offer", data);
  });
  socket.on("answer", (data) => {
    socket.broadcast.emit("answer", data);
  });
  socket.on("new-ice-candidate", (candidate) => {
    socket.broadcast.emit("new-ice-candidate", candidate);
  });
});
