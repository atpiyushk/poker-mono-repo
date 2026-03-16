import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface RawTableMessage {
  tableId: string;
  sessionId: number | null;
  messageType: string;
  raw: any;
}

export async function storeMessage(msg: RawTableMessage): Promise<number | null> {
  if (!msg.sessionId) return null;

  const record = await prisma.messageEvent.create({
    data: {
      tableSessionId: msg.sessionId,
      tableId: msg.tableId,
      messageType: msg.messageType,
      rawJson: msg.raw,
    },
  });

  return record.id;
}
