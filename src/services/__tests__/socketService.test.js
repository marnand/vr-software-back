import { initializeSocket, emitStatusUpdate, getConnectedClients } from '../socketService.js';

describe('Socket Service', () => {
  let mockIo;
  let mockSocket;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSocket = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis()
    };
    
    mockIo = {
      to: jest.fn().mockReturnValue(mockSocket),
      emit: jest.fn(),
      engine: {
        clientsCount: 5
      }
    };
  });

  describe('initializeSocket', () => {
    it('deve inicializar o socket service corretamente', () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Act
      initializeSocket(mockIo);
      
      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('🔌 Socket.IO service inicializado');
      
      consoleSpy.mockRestore();
    });

    it('deve permitir emissão de eventos após inicialização', () => {
      // Arrange
      initializeSocket(mockIo);
      
      // Act
      emitStatusUpdate('test-123', 'PROCESSANDO');
      
      // Assert
      expect(mockIo.to).toHaveBeenCalled();
      expect(mockIo.emit).toHaveBeenCalled();
    });
  });

  describe('emitStatusUpdate', () => {
    beforeEach(() => {
      initializeSocket(mockIo);
    });

    it('deve emitir status update para sala específica e globalmente', () => {
      // Arrange
      const mensagemId = 'test-message-123';
      const status = 'PROCESSANDO';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Act
      emitStatusUpdate(mensagemId, status);
      
      // Assert
      expect(mockIo.to).toHaveBeenCalledWith(`mensagem_${mensagemId}`);
      expect(mockSocket.emit).toHaveBeenCalledWith('statusUpdate', {
        mensagemId,
        status,
        timestamp: expect.any(String)
      });
      expect(mockIo.emit).toHaveBeenCalledWith('globalStatusUpdate', {
        mensagemId,
        status,
        timestamp: expect.any(String)
      });
      
      consoleSpy.mockRestore();
    });

    it('deve incluir timestamp no formato ISO', () => {
      // Arrange
      const mensagemId = 'test-timestamp';
      const status = 'CONCLUIDO';
      
      // Act
      emitStatusUpdate(mensagemId, status);
      
      // Assert
      const emitCall = mockSocket.emit.mock.calls[0];
      const updateData = emitCall[1];
      
      expect(updateData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('deve exibir warning se socket não estiver inicializado', () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      initializeSocket(null);
      
      // Act
      emitStatusUpdate('test-123', 'ERRO');
      
      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('⚠️ Socket.IO não inicializado');
      
      consoleSpy.mockRestore();
    });

    it('deve retornar early se socket não estiver inicializado', () => {
      // Arrange
      initializeSocket(null);
      
      // Act
      emitStatusUpdate('test-123', 'ERRO');
      
      // Assert
      expect(mockIo.to).not.toHaveBeenCalled();
      expect(mockIo.emit).not.toHaveBeenCalled();
    });
  });

  describe('getConnectedClients', () => {
    it('deve retornar número de clientes conectados', () => {
      // Arrange
      initializeSocket(mockIo);
      
      // Act
      const clientCount = getConnectedClients();
      
      // Assert
      expect(clientCount).toBe(5);
    });

    it('deve retornar 0 se socket não estiver inicializado', () => {
      // Arrange
      initializeSocket(null);
      
      // Act
      const clientCount = getConnectedClients();
      
      // Assert
      expect(clientCount).toBe(0);
    });
  });
});