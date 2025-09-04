jest.mock('amqplib');

jest.mock('dotenv', () => ({
  config: jest.fn()
}));

process.env.RABBITMQ_URL = 'amqp://localhost:5672';

import amqp from 'amqplib';
import * as rabbitmqService from '../rabbitmqService.js';

describe('RabbitMQ Service', () => {
  let mockConnection;
  let mockChannel;
  
  beforeEach(async () => {
    jest.clearAllMocks();
    
    mockChannel = {
      prefetch: jest.fn().mockResolvedValue(undefined),
      assertQueue: jest.fn().mockResolvedValue(undefined),
      sendToQueue: jest.fn().mockReturnValue(true),
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined)
    };
    
    mockConnection = {
      createChannel: jest.fn().mockResolvedValue(mockChannel),
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
      connection: {
        destroyed: false
      }
    };
    
    amqp.connect = jest.fn().mockResolvedValue(mockConnection);
  });

  describe('connectRabbit', () => {
    it('deve conectar com sucesso', async () => {
      // Act
      const result = await rabbitmqService.connectRabbit();
      
      // Assert
      expect(amqp.connect).toHaveBeenCalledWith(process.env.RABBITMQ_URL);
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(mockChannel.prefetch).toHaveBeenCalledWith(1);
      expect(result).toEqual({ connection: mockConnection, channel: mockChannel });
    });

    it('deve configurar event listeners', async () => {
      // Act
      await rabbitmqService.connectRabbit();
      
      // Assert
      expect(mockConnection.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockConnection.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockChannel.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockChannel.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('deve reutilizar conexão existente', async () => {
      // Arrange 
      await rabbitmqService.connectRabbit();
      jest.clearAllMocks();
      
      // Act 
      const result = await rabbitmqService.connectRabbit();
      
      // Assert
      expect(amqp.connect).not.toHaveBeenCalled();
      expect(result).toEqual({ connection: mockConnection, channel: mockChannel });
    });

    it('deve lançar erro em caso de falha na conexão', async () => {
      // Arrange
      const error = new Error('Connection failed');
      amqp.connect.mockRejectedValueOnce(error);
      
      // Act & Assert
      await expect(rabbitmqService.connectRabbit()).rejects.toThrow('Connection failed');
    });
  });

  describe('publishToQueue', () => {
    beforeEach(async () => {
      await rabbitmqService.connectRabbit();
    });

    it('deve publicar mensagem na fila com sucesso', async () => {
      // Arrange
      const queue = 'test-queue';
      const message = { id: '123', content: 'test message' };
      
      // Act
      await rabbitmqService.publishToQueue(queue, message);
      
      // Assert
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(queue, { durable: true });
      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        queue,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );
    });

    it('deve fazer retry em caso de falha', async () => {
      // Arrange
      const queue = 'test-queue';
      const message = { id: '123', content: 'test message' };
      
      mockChannel.sendToQueue
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      
      // Act
      await rabbitmqService.publishToQueue(queue, message);
      
      // Assert
      expect(mockChannel.sendToQueue).toHaveBeenCalledTimes(3);
    });

    it('deve lançar erro após esgotar tentativas', async () => {
      // Arrange
      const queue = 'test-queue';
      const message = { id: '123', content: 'test message' };
      
      mockChannel.sendToQueue.mockReturnValue(false);
      
      // Act & Assert
      await expect(rabbitmqService.publishToQueue(queue, message)).rejects.toThrow();
    });

    it('deve reconectar se conexão estiver perdida', async () => {
      // Arrange
      const queue = 'test-queue';
      const message = { id: '123', content: 'test message' };
      
      mockConnection.connection.destroyed = true;
      
      // Act
      await rabbitmqService.publishToQueue(queue, message);
      
      // Assert
      expect(amqp.connect).toHaveBeenCalled();
    });
  });
});