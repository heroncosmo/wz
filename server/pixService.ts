import { QrCodePix } from 'qrcode-pix';

interface PixPaymentData {
  planNome: string;
  valor: number;
  subscriptionId: string;
}

export async function generatePixQRCode(paymentData: PixPaymentData) {
  try {
    const qrCodePix = QrCodePix({
      version: '01',
      key: 'rodrigoconexao128@gmail.com', // Chave PIX do dono do sistema
      name: 'WHATSAPP CRM SAAS',
      city: 'SAO PAULO',
      transactionId: paymentData.subscriptionId.substring(0, 25),
      message: `Pagamento ${paymentData.planNome}`,
      value: paymentData.valor,
    });

    const payload = qrCodePix.payload();
    const qrCodeBase64 = await qrCodePix.base64();

    return {
      pixCode: payload,
      pixQrCode: qrCodeBase64,
    };
  } catch (error) {
    console.error('Error generating PIX QR Code:', error);
    throw error;
  }
}
