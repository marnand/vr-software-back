let io = null;

export const initializeSocket = (socketInstance) => {
  io = socketInstance;
  console.log('🔌 Socket.IO service inicializado');
};

export const emitStatusUpdate = (mensagemId, status) => {
  if (!io) {
    console.warn('⚠️ Socket.IO não inicializado');
    return;
  }

  const updateData = {
    mensagemId,
    status,
    timestamp: new Date().toISOString()
  };

  io.to(`mensagem_${mensagemId}`).emit('statusUpdate', updateData);
  
  io.emit('globalStatusUpdate', updateData);
  
  console.log(`📡 Status emitido via Socket.IO - Mensagem: ${mensagemId}, Status: ${status}`);
};

export const getConnectedClients = () => {
  if (!io) return 0;
  return io.engine.clientsCount;
};