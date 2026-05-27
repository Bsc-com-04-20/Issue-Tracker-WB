export type SmsMessage = {
  to: string;
  body: string;
};

export interface SmsAdapter {
  send(message: SmsMessage): Promise<void>;
}
