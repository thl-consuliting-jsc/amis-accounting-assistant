export const RECENT_EMOJI_LIMIT = 16;
export const RECENT_EMOJI_STORAGE_LIMIT = 32;

export const DIRECT_ROOM_READY_TIMEOUT_MS = 15000;
export const SIGNALR_RECONNECT_DELAYS_MS = [0, 2000, 5000, 10000, 30000] as const;

export const CONVERSATION_DEFAULTS = {
  emptyRoomMessage: "Chua co tin nhan",
  groupName: "Nhom chat",
  directName: "Nguoi dung",
} as const;
