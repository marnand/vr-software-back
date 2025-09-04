import { notificar, consultarStatus } from '../notificationController.js';

jest.mock('../../services/notificationService.js', () => {
  const mockInstance = {
    publicarMensagem: jest.fn().mockResolvedValue(undefined),
    obterStatus: jest.fn()
  };
  
  return {
    NotificationService: jest.fn().mockImplementation(() => mockInstance),
    __mockInstance: mockInstance
  };
});

import { NotificationService } from '../../services/notificationService.js';

describe('Notification Controller', () => {
  let mockReq;
  let mockRes;
  let mockServiceInstance;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockServiceInstance = new NotificationService();
    
    mockReq = {
      body: {},
      params: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

  describe('notificar', () => {
    it('deve processar mensagem válida com sucesso', async () => {
      // Arrange
      mockReq.body = {
        mensagemId: 'test-123',
        conteudoMensagem: 'Mensagem de teste'
      };
      
      // Act
      await notificar(mockReq, mockRes);
      
      // Assert
      expect(mockServiceInstance.publicarMensagem).toHaveBeenCalledWith(
        'test-123',
        'Mensagem de teste'
      );
      expect(mockRes.status).toHaveBeenCalledWith(202);
      expect(mockRes.json).toHaveBeenCalledWith({
        mensagem: 'Mensagem enviada para processamento',
        mensagemId: 'test-123',
        status: 'PENDENTE'
      });
    });

    it('deve retornar erro 400 para mensagemId inválido', async () => {
      // Arrange
      mockReq.body = {
        mensagemId: '',
        conteudoMensagem: 'Mensagem de teste'
      };
      
      // Act
      await notificar(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        erro: 'mensagemId e conteudoMensagem são obrigatórios'
      });
    });

    it('deve retornar erro 400 para conteudoMensagem inválido', async () => {
      // Arrange
      mockReq.body = {
        mensagemId: 'test-123',
        conteudoMensagem: ''
      };
      
      // Act
      await notificar(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        erro: 'mensagemId e conteudoMensagem são obrigatórios'
      });
    });

    it('deve tratar erro do serviço', async () => {
      // Arrange
      mockReq.body = {
        mensagemId: 'test-123',
        conteudoMensagem: 'Mensagem de teste'
      };
      
      const error = new Error('Service error');
      mockServiceInstance.publicarMensagem.mockRejectedValueOnce(error);
      
      // Act
      await notificar(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        erro: 'Erro interno do servidor'
      });
    });
  });

  describe('consultarStatus', () => {
    it('deve retornar status da mensagem existente', async () => {
      // Arrange
      mockReq.params.id = 'test-123';
      mockServiceInstance.obterStatus.mockReturnValue('PROCESSADO_SUCESSO');
      
      // Act
      await consultarStatus(mockReq, mockRes);
      
      // Assert
      expect(mockServiceInstance.obterStatus).toHaveBeenCalledWith('test-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        mensagemId: 'test-123',
        status: 'PROCESSADO_SUCESSO'
      });
    });

    it('deve retornar 404 para mensagem não encontrada', async () => {
      // Arrange
      mockReq.params.id = 'inexistente';
      mockServiceInstance.obterStatus.mockReturnValue(undefined);
      
      // Act
      await consultarStatus(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        erro: 'Mensagem não encontrada'
      });
    });

    it('deve retornar erro 400 para ID inválido', async () => {
      // Arrange
      mockReq.params.id = '';
      
      // Act
      await consultarStatus(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        erro: 'ID da mensagem é obrigatório'
      });
    });

    it('deve tratar erro do serviço', async () => {
      // Arrange
      mockReq.params.id = 'test-123';
      const error = new Error('Service error');
      mockServiceInstance.obterStatus.mockImplementation(() => {
        throw error;
      });
      
      // Act
      await consultarStatus(mockReq, mockRes);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        erro: 'Erro interno do servidor'
      });
    });
  });
});