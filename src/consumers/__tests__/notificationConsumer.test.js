jest.mock('../../services/rabbitmqService.js');
jest.mock('../../services/notificationService.js');

jest.useFakeTimers();

import { connectRabbit, publishToQueue } from '../../services/rabbitmqService.js';
import { NotificationService } from '../../services/notificationService.js';

let startConsumer;

describe('Notification Consumer', () => {
  let mockChannel;
  let mockConnection;
  let mockNotificationService;
  let mockMessage;
  
  beforeAll(async () => {
    const consumerModule = await import('../notificationConsumer.js');
    startConsumer = consumerModule.startConsumer;
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockMessage = {
      content: Buffer.from(JSON.stringify({
        mensagemId: 'test-123',
        conteudoMensagem: 'Mensagem de teste'
      }))
    };
    
    mockChannel = {
      assertQueue: jest.fn().mockResolvedValue(undefined),
      consume: jest.fn(),
      ack: jest.fn(),
      nack: jest.fn(),
      on: jest.fn()
    };
    
    mockConnection = {
      on: jest.fn()
    };
    
    mockNotificationService = {
      atualizarStatus: jest.fn().mockResolvedValue(undefined)
    };
    
    connectRabbit.mockResolvedValue({ channel: mockChannel, connection: mockConnection });
    publishToQueue.mockResolvedValue(undefined);
    NotificationService.mockImplementation(() => mockNotificationService);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('startConsumer', () => {
    it('deve inicializar consumer com sucesso', async () => {
      // Act
      await startConsumer();
      
      // Assert
      expect(connectRabbit).toHaveBeenCalled();
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        'fila.notificacao.entrada.marnand-fernandes',
        { durable: true }
      );
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        'fila.notificacao.status.marnand-fernandes',
        { durable: true }
      );
      expect(mockChannel.consume).toHaveBeenCalled();
    });

    it('deve configurar event listeners para connection e channel', async () => {
      // Act
      await startConsumer();
      
      // Assert
      expect(mockConnection.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockConnection.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockChannel.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockChannel.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('deve processar mensagem com sucesso', async () => {
      // Arrange
      let messageHandler;
      mockChannel.consume.mockImplementation((queue, handler) => {
        messageHandler = handler;
        return Promise.resolve();
      });
      
      // Act
      await startConsumer();
      
      const messageProcessingPromise = messageHandler(mockMessage);
      
      jest.advanceTimersByTime(1000);
      
      await messageProcessingPromise;
      
      // Assert
      expect(mockNotificationService.atualizarStatus).toHaveBeenCalledWith('test-123', 'PROCESSANDO');
      expect(mockNotificationService.atualizarStatus).toHaveBeenCalledWith('test-123', 'PROCESSADO');
      expect(publishToQueue).toHaveBeenCalledWith('fila.notificacao.status.marnand-fernandes', {
        mensagemId: 'test-123',
        status: 'PROCESSADO'
      });
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    }, 10000);

    it('deve tratar erro no processamento da mensagem', async () => {
      // Arrange
      let messageHandler;
      mockChannel.consume.mockImplementation((queue, handler) => {
        messageHandler = handler;
        return Promise.resolve();
      });
      
      const invalidMessage = {
        content: Buffer.from('invalid json')
      };
      
      // Act
      await startConsumer();
      await messageHandler(invalidMessage);
      
      // Assert
      expect(mockChannel.nack).toHaveBeenCalledWith(invalidMessage, false, true);
    });

    it('deve ignorar mensagem nula', async () => {
      // Arrange
      let messageHandler;
      mockChannel.consume.mockImplementation((queue, handler) => {
        messageHandler = handler;
        return Promise.resolve();
      });
      
      // Act
      await startConsumer();
      await messageHandler(null);
      
      // Assert
      expect(mockNotificationService.atualizarStatus).not.toHaveBeenCalled();
      expect(mockChannel.ack).not.toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it('deve tratar erro na conexão', async () => {
      // Arrange
      const error = new Error('Connection error');
      connectRabbit.mockRejectedValueOnce(error);
      
      // Act
      await startConsumer();
      
      // Asser
      expect(connectRabbit).toHaveBeenCalled();
    });
  });
});