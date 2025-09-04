import { NotificationService } from "../services/notificationService.js";

const service = new NotificationService();

export const notificar = async (req, res) => {
  try {
    const { mensagemId, conteudoMensagem } = req.body;

    if (!mensagemId || !conteudoMensagem?.trim()) {
      return res.status(400).json({ erro: "mensagemId e conteudoMensagem são obrigatórios" });
    }

    await service.publicarMensagem(mensagemId, conteudoMensagem);

    return res.status(202).json({
      mensagem: "Mensagem recebida para processamento",
      mensagemId
    });
  } catch (err) {
    console.error("Erro no endpoint /notificar:", err);
    res.status(500).json({ erro: "Erro interno no servidor" });
  }
};

export const consultarStatus = (req, res) => {
  const { id } = req.params;
  const status = service.obterStatus(id);

  if (!status) {
    return res.status(404).json({ erro: "Mensagem não encontrada" });
  }

  return res.json({ mensagemId: id, status });
};
