import { QrCodePix } from 'qrcode-pix';
import { storage } from './storage';

interface PixPaymentData {
  planNome: string;
  valor: number;
  subscriptionId: string;
}

export async function generatePixQRCode(paymentData: PixPaymentData) {
  try {
    const pixKeyConfig = await storage.getSystemConfig('pix_key');
    const pixKey = pixKeyConfig?.valor || 'rodrigoconexao128@gmail.com';

    const qrCodePix = QrCodePix({
      version: '01',
      key: pixKey,
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
