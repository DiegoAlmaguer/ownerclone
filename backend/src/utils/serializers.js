export function userDto(row) {
  return {
    id: row.id,
    phone: row.phone,
    name: row.name,
    username: row.username ?? null,
    role: row.role,
    isBlocked: row.is_blocked
  };
}

export function chatDto(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    ownerId: row.owner_id,
    updatedAt: row.updated_at,
    createdAt: row.created_at
  };
}

export function messageDto(row) {
  return {
    id: row.id,
    chatId: row.chat_id,
    senderId: row.sender_id,
    clientMessageId: row.client_message_id,
    body: row.body,
    type: row.type,
    attachmentUrl: row.attachment_url,
    status: row.status,
    createdAt: row.created_at
  };
}
