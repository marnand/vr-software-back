import amqp from "amqplib";
import dotenv from "dotenv";

dotenv.config();

let connection, channel;
let isConnecting = false;

export const connectRabbit = async () => {
  if (connection && !connection.connection.destroyed && channel) {
    return { connection, channel };
  }

  if (isConnecting) {
    while (isConnecting) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (connection && channel) {
      return { connection, channel };
    }
  }

  isConnecting = true;

  try {
    console.log('🔄 Conectando ao RabbitMQ...');
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.prefetch(1);

    connection.on('error', (err) => {
      console.error('❌ Erro na conexão RabbitMQ:', err.message);
      resetConnection();
    });

    connection.on('close', () => {
      console.log('🔌 Conexão RabbitMQ fechada');
      resetConnection();
    });

    channel.on('error', (err) => {
      console.error('❌ Erro no canal RabbitMQ:', err.message);
      resetConnection();
    });

    channel.on('close', () => {
      console.log('📡 Canal RabbitMQ fechado');
      resetConnection();
    });

    console.log("✅ Conectado ao RabbitMQ");
    isConnecting = false;
    return { connection, channel };
  } catch (error) {
    console.error('❌ Erro ao conectar no RabbitMQ:', error.message);
    resetConnection();
    isConnecting = false;
    throw error;
  }
};

const resetConnection = () => {
  connection = null;
  channel = null;
  isConnecting = false;
};

export const publishToQueue = async (queue, message) => {
  let retries = 3;
  
  while (retries > 0) {
    try {
      if (!channel || !connection || connection.connection.destroyed) {
        console.log('🔄 Reconectando ao RabbitMQ para publicação...');
        await connectRabbit();
      }
      
      if (!channel) throw new Error("Canal RabbitMQ não disponível");
      
      await channel.assertQueue(queue, { durable: true });
      const sent = channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
      
      if (!sent) {
        throw new Error("Falha ao enviar mensagem - buffer cheio");
      }
      
      console.log(`📤 Mensagem publicada na fila: ${queue}`, message);
      return;
    } catch (error) {
      console.error(`❌ Erro ao publicar mensagem (tentativas restantes: ${retries - 1}):`, error.message);
      resetConnection();
      retries--;
      
      if (retries === 0) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};
