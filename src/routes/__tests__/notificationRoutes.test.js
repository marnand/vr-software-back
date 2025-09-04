import request from 'supertest';
import express from 'express';
import router from '../notificationRoutes.js';
import { notificar, consultarStatus } from '../../controllers/notificationController.js';

jest.mock('../../controllers/notificationController.js');

describe('Notification Routes', () => {
  let app;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    app = express();
    app.use(express.json());
    app.use('/', router);
    
    notificar.mockImplementation((req, res) => {
      res.status(202).json({ mensagem: 'Mock response' });
    });
    
    consultarStatus.mockImplementation((req, res) => {
      res.json({ mensagemId: req.params.id, status: 'MOCK_STATUS' });
    });
  });

  describe('GET /', () => {
    it('deve retornar mensagem de boas-vindas', async () => {
      // Act
      const response = await request(app).get('/');
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.text).toBe('Serviço de Notificações!');
    });
  });

  describe('POST /notificar', () => {
    it('deve chamar o controller notificar', async () => {
      // Arrange
      const payload = {
        mensagemId: 'test-123',
        conteudoMensagem: 'Mensagem de teste'
      };
      
      // Act
      const response = await request(app)
        .post('/notificar')
        .send(payload);
      
      // Assert
      expect(response.status).toBe(202);
      expect(notificar).toHaveBeenCalled();
      
      const [req] = notificar.mock.calls[0];
      expect(req.body).toEqual(payload);
    });

    it('deve aceitar diferentes tipos de payload', async () => {
      // Arrange
      const payloads = [
        { mensagemId: '1', conteudoMensagem: 'Teste 1' },
        { mensagemId: '2', conteudoMensagem: 'Teste com caracteres especiais: áéíóú' },
        { mensagemId: '3', conteudoMensagem: 'Teste com números 123 e símbolos @#$' }
      ];
      
      // Act & Assert
      for (const payload of payloads) {
        const response = await request(app)
          .post('/notificar')
          .send(payload);
        
        expect(response.status).toBe(202);
      }
      
      expect(notificar).toHaveBeenCalledTimes(payloads.length);
    });
  });

  describe('GET /status/:id', () => {
    it('deve chamar o controller consultarStatus com ID correto', async () => {
      // Arrange
      const mensagemId = 'test-status-123';
      
      // Act
      const response = await request(app).get(`/status/${mensagemId}`);
      
      // Assert
      expect(response.status).toBe(200);
      expect(consultarStatus).toHaveBeenCalled();
      
      const [req] = consultarStatus.mock.calls[0];
      expect(req.params.id).toBe(mensagemId);
    });

    it('deve funcionar com diferentes formatos de ID', async () => {
      // Arrange
      const ids = ['123', 'abc-def-ghi', 'uuid-12345', 'test_message_001'];
      
      // Act & Assert
      for (const id of ids) {
        const response = await request(app).get(`/status/${id}`);
        expect(response.status).toBe(200);
      }
      
      expect(consultarStatus).toHaveBeenCalledTimes(ids.length);
    });
  });

  describe('GET /health', () => {
    it('deve retornar mensagem de health check', async () => {
      // Act
      const response = await request(app).get('/health');
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.text).toBe('Olá tester!');
    });
  });

  describe('Rotas inexistentes', () => {
    it('deve retornar 404 para rota não existente', async () => {
      // Act
      const response = await request(app).get('/rota-inexistente');
      
      // Assert
      expect(response.status).toBe(404);
    });

    it('deve retornar 404 para método não suportado', async () => {
      // Act
      const response = await request(app).delete('/notificar');
      
      // Assert
      expect(response.status).toBe(404);
    });
  });
});