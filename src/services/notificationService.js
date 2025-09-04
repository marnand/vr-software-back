import { publishToQueue } from "./rabbitmqService.js";
import { emitStatusUpdate } from "./socketService.js";

export class NotificationService {
  constructor() {
    this.statusMap = new Map();
  }

  async publicarMensagem(mensagemId, conteudoMensagem) {
    const filaEntrada = "fila.notificacao.entrada.marnand-fernandes";

    this.statusMap.set(mensagemId, "PENDENTE");
    
    emitStatusUpdate(mensagemId, "PENDENTE");

    await publishToQueue(filaEntrada, { mensagemId, conteudoMensagem });
  }

  atualizarStatus(mensagemId, status) {
    this.statusMap.set(mensagemId, status);
    
    emitStatusUpdate(mensagemId, status);
  }

  obterStatus(mensagemId) {
    return this.statusMap.get(mensagemId);
  }
}
