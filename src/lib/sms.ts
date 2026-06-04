export interface SmsSender {
  send(to: string, message: string): Promise<{ id: string } | null>;
}

// Stub implementation — replace with a real provider (Twilio, Greek SMS gateway) later.
export const stubSmsSender: SmsSender = {
  async send(to: string, message: string) {
    console.warn(`[sms] No SMS provider configured — skipping send to ${to}: ${message.slice(0, 40)}`);
    return null;
  },
};

export async function sendSms(to: string, message: string): Promise<{ id: string } | null> {
  return stubSmsSender.send(to, message);
}
