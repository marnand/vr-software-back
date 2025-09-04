import { NotificationService } from '../notificationService.js';
import { publishToQueue } from '../rabbitmqService.js';
import { emitStatusUpdate } from '../socketService.js';

jest.mock('../rabbitmqService.js');
jest.mock('../socketService.js');

describe('NotificationService - RabbitMQ Integration', () => {
  let notificationService;
  let mockPublishToQueue;
  let mockEmitStatusUpdate;
  
  beforeEach(() => {
    mockPublishToQueue = publishToQueue;
    mockEmitStatusUpdate = emitStatusUpdate;
    
    jest.clearAllMocks();
    
    mockPublishToQueue.mockResolvedValue(undefined);
    mockEmitStatusUpdate.mockReturnValue(undefined);
    
    notificationService = new NotificationService();
  });

  describe('Verificações específicas do RabbitMQ', () => {
    it('deve chamar publishToQueue com a fila correta', async () => {
      // Arrange
      const mensagemId = 'rabbitmq-test-1';
      const conteudoMensagem = 'Teste específico RabbitMQ';
      
      // Act
      await notificationService.publicarMensagem(mensagemId, conteudoMensagem);
      
      // Assert
      expect(mockPublishToQueue).toHaveBeenCalledWith(
        'fila.notificacao.entrada.marnand-fernandes',
        expect.any(Object)
      );
    });

    it('deve chamar publishToQueue com payload correto', async () => {
      // Arrange
      const mensagemId = 'rabbitmq-test-2';
      const conteudoMensagem = 'Payload test';
      
      // Act
      await notificationService.publicarMensagem(mensagemId, conteudoMensagem);
      
      // Assert
      expect(mockPublishToQueue).toHaveBeenCalledWith(
        expect.any(String),
        {
          mensagemId: mensagemId,
          conteudoMensagem: conteudoMensagem
        }
      );
    });

    it('deve chamar publishToQueue apenas uma vez por publicação', async () => {
      // Arrange
      const mensagemId = 'rabbitmq-test-3';
      const conteudoMensagem = 'Single call test';
      
      // Act
      await notificationService.publicarMensagem(mensagemId, conteudoMensagem);
      
      // Assert
      expect(mockPublishToQueue).toHaveBeenCalledTimes(1);
    });

    it('deve manter ordem de chamadas: primeiro emitStatusUpdate, depois publishToQueue', async () => {
      // Arrange
      const mensagemId = 'rabbitmq-test-order';
      const conteudoMensagem = 'Order test';
      
      // Act
      await notificationService.publicarMensagem(mensagemId, conteudoMensagem);
      
      // Assert
      const mockCalls = jest.mocked(mockEmitStatusUpdate).mock.invocationCallOrder;
      const publishCalls = jest.mocked(mockPublishToQueue).mock.invocationCallOrder;
      
      expect(mockCalls[0]).toBeLessThan(publishCalls[0]);
    });

    it('deve lidar com falha do RabbitMQ sem afetar o status local', async () => {
      // Arrange
      const mensagemId = 'rabbitmq-test-error';
      const conteudoMensagem = 'Error test';
      const erro = new Error('RabbitMQ connection failed');
      
      mockPublishToQueue.mockRejectedValueOnce(erro);
      
      // Act & Assert
      await expect(
        notificationService.publicarMensagem(mensagemId, conteudoMensagem)
      ).rejects.toThrow('RabbitMQ connection failed');
      
      expect(notificationService.obterStatus(mensagemId)).toBe('PENDENTE');
      expect(mockEmitStatusUpdate).toHaveBeenCalledWith(mensagemId, 'PENDENTE');
    });
  });
});