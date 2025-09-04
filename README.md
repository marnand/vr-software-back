## 🏗️ Arquitetura

O projeto adota uma arquitetura baseada em **eventos e mensageria**, garantindo escalabilidade e desacoplamento.
Principais tecnologias utilizadas:

* **Express.js** → Framework web para APIs REST.
* **Socket.IO** → Comunicação em tempo real com os clientes.
* **RabbitMQ** → Message broker para enfileiramento e processamento assíncrono.
* **Jest** → Framework de testes unitários e cobertura de código.

Fluxo resumido:

1. O cliente envia uma notificação via **API REST**.
2. O servidor publica a mensagem no **RabbitMQ**.
3. Um **consumidor** processa a mensagem de forma assíncrona.
4. O status é atualizado e enviado ao cliente via **WebSocket**.

---

## 📁 Estrutura do Projeto

```bash
src/
├── app.js                    # Configuração do Express
├── server.js                 # Inicialização do servidor HTTP + Socket.IO
├── controllers/              # Controladores da API
│   └── notificationController.js
├── routes/                   # Definição das rotas
│   └── notificationRoutes.js
├── services/                 # Regras de negócio e serviços auxiliares
│   ├── notificationService.js
│   ├── rabbitmqService.js
│   └── socketService.js
└── consumers/                # Consumidores RabbitMQ
    └── notificationConsumer.js
```

---

## ⚙️ Pré-requisitos

Antes de rodar o projeto, instale:

* [Node.js](https://nodejs.org) (>= 16)
* npm ou yarn
* [Docker](https://www.docker.com/) (opcional, para rodar o RabbitMQ)
* RabbitMQ (local ou via Docker)

### Instalar RabbitMQ com Docker

```bash
docker run -d --name rabbitmq \
  -p 5672:5672 -p 15672:15672 \
  rabbitmq:3-management
```

Painel de gerenciamento: [http://localhost:15672](http://localhost:15672)

* Usuário: `guest`
* Senha: `guest`

---

## 🔧 Configuração

1. Clone o repositório e entre na pasta:

   ```bash
   git clone https://github.com/seu-usuario/node-notify-app.git
   cd node-notify-app
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente:

   ```bash
   cp .env.example .env
   ```

   Edite o arquivo `.env` conforme necessário:

   ```env
   RABBITMQ_URL=amqp://guest:guest@localhost:5672
   PORT=3000
   ```

---

## 🏃‍♂️ Executando o Projeto

### Ambiente de Desenvolvimento

```bash
npm run dev
```

Utiliza `nodemon` para hot-reload.

### Ambiente de Produção

```bash
npm start
```

Ao iniciar, você verá no console:

```
🔄 Conectando ao RabbitMQ...
✅ Conectado ao RabbitMQ
🚀 Servidor rodando na porta 3000
🔌 Socket.IO configurado e pronto
```

API disponível em: [http://localhost:3000/api](http://localhost:3000/api)

---

## 📡 Endpoints da API

### Health Check

```
GET /api/health
```

Retorna o status da aplicação.

### Enviar notificação

```
POST /api/notificar
```

Payload:

```json
{
  "mensagemId": "123e4567-e89b-12d3-a456-426614174000",
  "conteudoMensagem": "Teste de notificação"
}
```

Resposta (202 Accepted):

```json
{
  "mensagem": "Mensagem recebida para processamento",
  "mensagemId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### Consultar status

```
GET /api/status/:id
```

Exemplo:

```bash
curl http://localhost:3000/api/status/123e4567-e89b-12d3-a456-426614174000
```

Resposta:

```json
{
  "mensagemId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "PROCESSADO_SUCESSO"
}
```

---

## 🔌 WebSockets

O servidor também expõe atualizações via **Socket.IO** em tempo real.

* URL: `http://localhost:3000`
* Evento emitido: `statusAtualizado`

### Exemplo de cliente

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Conectado ao servidor WebSocket");
});

socket.on("statusAtualizado", (data) => {
  console.log("Atualização recebida:", data);
});
```

---

## 🧪 Testes

### Executar todos os testes

```bash
npm test
```

### Executar em modo watch

```bash
npm run test:watch
```

### Executar com relatório de cobertura

```bash
npm run test:coverage
```

Relatórios em: `coverage/`

---

## 🐛 Troubleshooting

### Erro de conexão com RabbitMQ

```
Error: connect ECONNREFUSED 127.0.0.1:5672
```

✅ Verifique se o RabbitMQ está rodando:

```bash
docker ps
# ou
rabbitmqctl status
```

### Porta já em uso

Mude a variável `PORT` no `.env` ou finalize o processo que está usando a porta 3000.

### Problemas com dependências

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

## 📜 Scripts Disponíveis

* `npm start` → Produção
* `npm run dev` → Desenvolvimento (com hot reload)
* `npm test` → Executa testes
* `npm run test:watch` → Executa testes em modo watch
* `npm run test:coverage` → Executa testes com relatório de cobertura

---

💻 Desenvolvido com ❤️ usando **Node.js, Express.js, Socket.IO e RabbitMQ**

---