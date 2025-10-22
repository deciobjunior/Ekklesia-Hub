
// helpers/sendWhatsappMessage.js
export const sendWhatsappMessage = async (telefone, mensagem) => {
  try {
    const response = await fetch("https://n8n.srv1052060.hstgr.cloud/webhook/enviar-mensagem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { // Envova os dados dentro de um objeto 'data'
          telefone: telefone,
          mensagem: mensagem
        }
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Erro ao enviar mensagem via WhatsApp: ${response.statusText} - ${errorBody}`);
    }

    console.log("Mensagem enviada para a fila do n8n com sucesso!");
    // Não tentar fazer o parse da resposta como JSON, pois o n8n pode não retornar um corpo.
    return { success: true, message: 'Mensagem enviada para a fila.' };

  } catch (error) {
    console.error("Erro no envio para o n8n:", error);
    throw error;
  }
};

    
