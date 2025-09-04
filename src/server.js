import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { connectRabbit } from "./services/rabbitmqService.js";
import { initializeSocket } from "./services/socketService.js";

const PORT = process.env.PORT || 3000;

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

initializeSocket(io);

io.on("connection", (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);
  
  socket.on("subscribe", (mensagemId) => {
    socket.join(`mensagem_${mensagemId}`);
    console.log(`📡 Cliente ${socket.id} inscrito para mensagem: ${mensagemId}`);
  });
  
  socket.on("unsubscribe", (mensagemId) => {
    socket.leave(`mensagem_${mensagemId}`);
    console.log(`📡 Cliente ${socket.id} desinscrito da mensagem: ${mensagemId}`);
  });
  
  socket.on("disconnect", () => {
    console.log(`🔌 Cliente desconectado: ${socket.id}`);
  });
});

(async () => {
  try {
    await connectRabbit();

    await import("./consumers/notificationConsumer.js");

    server.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`🔌 Socket.IO configurado e pronto`);
    });
  } catch (err) {
    console.error("Erro ao iniciar servidor:", err);
    process.exit(1);
  }
})();
