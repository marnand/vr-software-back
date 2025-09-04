import { connectRabbit, publishToQueue } from "../services/rabbitmqService.js";
import { NotificationService } from "../services/notificationService.js";

const service = new NotificationService();

let isReconnecting = false;
let reconnectionTimeout = null;

const startConsumer = async () => {
  if (isReconnecting) {
    console.log('🔄 Reconexão já em andamento, aguardando...');
    return;
  }

  try {
    const { channel, connection } = await connectRabbit();
    const filaEntrada = "fila.notificacao.entrada.marnand-fernandes";
    const filaStatus = "fila.notificacao.status.marnand-fernandes";

    await channel.assertQueue(filaEntrada, { durable: true });
    await channel.assertQueue(filaStatus, { durable: true });

    connection.on('error', (err) => {
      console.error('❌ Erro na conexão do consumer:', err.message);
      handleReconnection();
    });

    connection.on('close', () => {
      console.log('🔌 Conexão do consumer fechada');
      handleReconnection();
    });

    channel.on('error', (err) => {
      console.error('❌ Erro no canal do consumer:', err.message);
      handleReconnection();
    });

    channel.on('close', () => {
      console.log('📡 Canal do consumer fechado');
      handleReconnection();
    });

    channel.consume(filaEntrada, async (msg) => {
      if (!msg) {
        console.log("⚠️ Mensagem nula recebida");
        return;
      }

      let mensagemId = 'unknown';
      let conteudoMensagem = null;
      
      try {
        if (msg.content) {
          const parsedContent = JSON.parse(msg.content.toString());
          mensagemId = parsedContent.mensagemId || 'unknown';
          conteudoMensagem = parsedContent.conteudoMensagem;
        }
        
        if (!conteudoMensagem) {
          throw new Error('Conteúdo da mensagem inválido ou ausente');
        }

        console.log(`📨 Processando mensagem: ${mensagemId}`);
        
        await service.atualizarStatus(mensagemId, "PROCESSANDO");
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const resultado = "PROCESSADO";
        await service.atualizarStatus(mensagemId, resultado);
        
        await publishToQueueWithRetry(filaStatus, { mensagemId, status: resultado });

        console.log(`✅ Mensagem ${mensagemId} processada com status: ${resultado}`);
        
        channel.ack(msg);
      } catch (err) {
        console.error("❌ Erro no processamento da mensagem:", err.message);
        
        try {
          await service.atualizarStatus(mensagemId, "FALHA_PROCESSAMENTO");
        } catch (statusErr) {
          console.error("❌ Erro ao atualizar status de falha:", statusErr.message);
        }
        
        channel.nack(msg, false, true);
      }
    }, { noAck: false });

    console.log("👂 Consumidor rodando na fila:", filaEntrada);
    isReconnecting = false;
    
    if (reconnectionTimeout) {
      clearTimeout(reconnectionTimeout);
      reconnectionTimeout = null;
    }
  } catch (error) {
    console.error('❌ Erro ao iniciar consumer:', error.message);
    handleReconnection();
  }
};

const handleReconnection = () => {
  if (isReconnecting || reconnectionTimeout) return;
  
  isReconnecting = true;
  console.log('🔄 Iniciando processo de reconexão em 5 segundos...');
  
  reconnectionTimeout = setTimeout(async () => {
    try {
      console.log('🔄 Tentando reconectar consumer...');
      reconnectionTimeout = null;
      await startConsumer();
    } catch (err) {
      console.error('❌ Falha na reconexão:', err.message);
      isReconnecting = false;
      reconnectionTimeout = null;
      handleReconnection();
    }
  }, 5000);
};

const publishToQueueWithRetry = async (queue, message, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await publishToQueue(queue, message);
      return;
    } catch (error) {
      console.error(`❌ Tentativa ${i + 1} falhou ao publicar mensagem:`, error.message);
      if (i === maxRetries - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};

export { startConsumer };

if (process.env.NODE_ENV !== 'test') {
  startConsumer();
}
