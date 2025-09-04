import { NotificationService } from '../notificationService.js';
import { publishToQueue } from '../rabbitmqService.js';
import { emitStatusUpdate } from '../socketService.js';

jest.mock('../rabbitmqService.js', () => ({
  publishToQueue: jest.fn()
}));

jest.mock('../socketService.js', () => ({
  emitStatusUpdate: jest.fn()
}));

describe('NotificationService', () => {
  let notificationService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    notificationService = new NotificationService();
  });

  describe('publicarMensagem', () => {
    it('deve publicar mensagem na fila correta com os dados corretos', async () => {
      // Arrange
      const mensagemId = 'test-message-id-123';
      const conteudoMensagem = 'Conteúdo da mensagem de teste';
      const filaEsperada = 'fila.notificacao.entrada.marnand-fernandes';
      
      // Act
      await notificationService.publicarMensagem(mensagemId, conteudoMensagem);
      
      // Assert
      expect(publishToQueue).toHaveBeenCalledTimes(1);
      expect(publishToQueue).toHaveBeenCalledWith(
        filaEsperada,
        { mensagemId, conteudoMensagem }
      );
    });

    it('deve definir status como PENDENTE e emitir atualização de status', async () => {
      // Arrange
      const mensagemId = 'test-message-id-456';
      const conteudoMensagem = 'Outro conteúdo de teste';
      
      // Act
      await notificationService.publicarMensagem(mensagemId, conteudoMensagem);
      
      // Assert
      expect(notificationService.obterStatus(mensagemId)).toBe('PENDENTE');
      expect(emitStatusUpdate).toHaveBeenCalledTimes(1);
      expect(emitStatusUpdate).toHaveBeenCalledWith(mensagemId, 'PENDENTE');
    });

    it('deve propagar erro se publishToQueue falhar', async () => {
      // Arrange
      const mensagemId = 'test-message-error';
      const conteudoMensagem = 'Conteúdo que vai falhar';
      const erroEsperado = new Error('Falha na conexão RabbitMQ');
      
      publishToQueue.mockRejectedValueOnce(erroEsperado);
      
      // Act & Assert
      await expect(
        notificationService.publicarMensagem(mensagemId, conteudoMensagem)
      ).rejects.toThrow('Falha na conexão RabbitMQ');
      
      expect(notificationService.obterStatus(mensagemId)).toBe('PENDENTE');
      expect(emitStatusUpdate).toHaveBeenCalledWith(mensagemId, 'PENDENTE');
    });
  });

  describe('atualizarStatus', () => {
    it('deve atualizar o status da mensagem e emitir atualização', () => {
      // Arrange
      const mensagemId = 'test-message-update';
      const novoStatus = 'PROCESSANDO';
      
      // Act
      notificationService.atualizarStatus(mensagemId, novoStatus);
      
      // Assert
      expect(notificationService.obterStatus(mensagemId)).toBe(novoStatus);
      expect(emitStatusUpdate).toHaveBeenCalledTimes(1);
      expect(emitStatusUpdate).toHaveBeenCalledWith(mensagemId, novoStatus);
    });

    it('deve permitir múltiplas atualizações de status', () => {
      // Arrange
      const mensagemId = 'test-message-multiple';
      
      // Act
      notificationService.atualizarStatus(mensagemId, 'PROCESSANDO');
      notificationService.atualizarStatus(mensagemId, 'CONCLUIDO');
      
      // Assert
      expect(notificationService.obterStatus(mensagemId)).toBe('CONCLUIDO');
      expect(emitStatusUpdate).toHaveBeenCalledTimes(2);
      expect(emitStatusUpdate).toHaveBeenNthCalledWith(1, mensagemId, 'PROCESSANDO');
      expect(emitStatusUpdate).toHaveBeenNthCalledWith(2, mensagemId, 'CONCLUIDO');
    });
  });

  describe('obterStatus', () => {
    it('deve retornar undefined para mensagem inexistente', () => {
      // Arrange
      const mensagemIdInexistente = 'mensagem-nao-existe';
      
      // Act
      const status = notificationService.obterStatus(mensagemIdInexistente);
      
      // Assert
      expect(status).toBeUndefined();
    });

    it('deve retornar o status correto para mensagem existente', () => {
      // Arrange
      const mensagemId = 'test-message-status';
      const statusEsperado = 'ENVIADO';
      
      // Act
      notificationService.atualizarStatus(mensagemId, statusEsperado);
      const status = notificationService.obterStatus(mensagemId);
      
      // Assert
      expect(status).toBe(statusEsperado);
    });
  });

  describe('Integração entre métodos', () => {
    it('deve manter consistência entre publicarMensagem e obterStatus', async () => {
      // Arrange
      const mensagemId = 'test-integration';
      const conteudoMensagem = 'Teste de integração';
      
      // Act
      await notificationService.publicarMensagem(mensagemId, conteudoMensagem);
      
      // Assert
      expect(notificationService.obterStatus(mensagemId)).toBe('PENDENTE');
      
      // Act
      notificationService.atualizarStatus(mensagemId, 'PROCESSADO');
      
      // Assert
      expect(notificationService.obterStatus(mensagemId)).toBe('PROCESSADO');
    });
  });
});