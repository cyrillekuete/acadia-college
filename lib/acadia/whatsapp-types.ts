export type WhatsAppSendResult = {
  sent: number;
  failed: number;
  skipped: number;
};

export function emptyWhatsAppSendResult(): WhatsAppSendResult {
  return { sent: 0, failed: 0, skipped: 0 };
}

export function formatWhatsAppSendToast(result: WhatsAppSendResult): string {
  const parts = [`Sent to ${result.sent} parent(s) on WhatsApp`];
  if (result.skipped > 0) {
    parts.push(`${result.skipped} had no number`);
  }
  if (result.failed > 0) {
    parts.push(`${result.failed} failed`);
  }
  return `${parts.join('. ')}.`;
}
