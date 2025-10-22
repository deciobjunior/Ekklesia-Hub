
// helpers/sendWhatsappMessage.ts

export const sendWhatsappMessage = async (telefone: string, mensagem: string) => {
  try {
    const response = await fetch("https://n8n.srv1052060.hstgr.cloud/webhook/enviar-mensagem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          telefone: telefone,
          mensagem: mensagem
        }
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Webhook Error: ${response.statusText} - ${errorBody}`);
    }

    return { success: true, message: 'Mensagem enviada para a fila de processamento do webhook.' };

  } catch (error) {
    console.error("Erro na chamada do webhook n8n:", error);
    // Re-throw the error so the calling function can handle it
    throw error;
  }
};
