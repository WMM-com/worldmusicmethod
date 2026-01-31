/**
 * Agora Error Code to User-Friendly Message Mapping
 * 
 * Reference: https://api-ref.agora.io/en/voice-sdk/web/4.x/interfaces/iagorartcerror.html
 */

export const AGORA_ERROR_MESSAGES: Record<string, string> = {
  // Authentication & App ID errors
  "INVALID_VENDOR_KEY": "Invalid App ID. Please check your Agora configuration.",
  "DYNAMIC_KEY_TIMEOUT": "Token has expired. Please refresh and try again.",
  "DYNAMIC_KEY_EXPIRED": "Token has expired. Please refresh and try again.",
  "NO_AUTHORIZED": "Not authorized to join this channel. Check token validity.",
  "INVALID_DYNAMIC_KEY": "Invalid token. Please check Agora App Certificate configuration.",
  
  // Network & Connection errors
  "CAN_NOT_GET_GATEWAY_SERVER": "Cannot connect to Agora servers. Check your internet connection or Agora App ID.",
  "SOCKET_ERROR": "Network connection lost. Please check your internet and try again.",
  "NETWORK_TIMEOUT": "Connection timed out. Please check your network.",
  "NETWORK_RESPONSE_ERROR": "Server connection error. Please try again later.",
  "NETWORK_ERROR": "Network error occurred. Please check your connection.",
  "WS_DISCONNECT": "WebSocket disconnected. Attempting to reconnect...",
  
  // Media & Permission errors
  "PERMISSION_DENIED": "Camera/microphone access was denied. Please allow access in browser settings.",
  "NOT_READABLE": "Camera or microphone is being used by another application.",
  "DEVICE_NOT_FOUND": "No camera or microphone found. Please connect a device.",
  "NOT_SUPPORTED": "Your browser doesn't support video calling. Try Chrome or Firefox.",
  "CONSTRAINT_NOT_SATISFIED": "Camera/microphone settings not supported by your device.",
  "MEDIA_OPTION_INVALID": "Invalid media configuration. Please try again.",
  
  // Channel errors
  "JOIN_CHANNEL_REJECTED": "Unable to join the room. It may be full or inactive.",
  "OPERATION_ABORTED": "Operation was cancelled. Please try again.",
  "UID_CONFLICT": "User ID conflict. Please try rejoining.",
  "REPEAT_JOIN": "Already joined this channel. Leave first before rejoining.",
  
  // General errors
  "UNEXPECTED_ERROR": "An unexpected error occurred. Please refresh and try again.",
  "CROSS_CHANNEL_CONFLICT": "Channel state conflict. Please leave and rejoin.",
};

/**
 * Parse an Agora error and return a user-friendly message
 */
export function getAgoraErrorMessage(error: unknown): string {
  if (!error) return "Unknown error occurred";
  
  const anyError = error as any;
  const code = String(anyError?.code ?? "");
  const message = String(anyError?.message ?? "");
  
  // Check for exact code match
  if (AGORA_ERROR_MESSAGES[code]) {
    return AGORA_ERROR_MESSAGES[code];
  }
  
  // Check if message contains known error patterns
  for (const [key, friendlyMessage] of Object.entries(AGORA_ERROR_MESSAGES)) {
    if (message.toUpperCase().includes(key) || code.toUpperCase().includes(key)) {
      return friendlyMessage;
    }
  }
  
  // Check for specific patterns in error message
  if (/invalid.*vendor.*key/i.test(message)) {
    return AGORA_ERROR_MESSAGES["INVALID_VENDOR_KEY"];
  }
  if (/gateway.*server/i.test(message)) {
    return AGORA_ERROR_MESSAGES["CAN_NOT_GET_GATEWAY_SERVER"];
  }
  if (/permission.*denied|not.*allowed/i.test(message)) {
    return AGORA_ERROR_MESSAGES["PERMISSION_DENIED"];
  }
  if (/token.*expired|dynamic.*key.*expired/i.test(message)) {
    return AGORA_ERROR_MESSAGES["DYNAMIC_KEY_EXPIRED"];
  }
  
  // Return the original message if no match found
  return message || "An error occurred while connecting to the call";
}

/**
 * Check if an error is related to invalid App ID or token
 */
export function isAuthError(error: unknown): boolean {
  const anyError = error as any;
  const code = String(anyError?.code ?? "");
  const message = String(anyError?.message ?? "");
  
  const authPatterns = [
    "INVALID_VENDOR_KEY",
    "DYNAMIC_KEY",
    "NO_AUTHORIZED",
    "invalid.*vendor.*key",
    "invalid.*token",
    "token.*expired",
  ];
  
  return authPatterns.some(pattern => {
    const regex = new RegExp(pattern, "i");
    return regex.test(code) || regex.test(message);
  });
}

/**
 * Check if an error is related to network issues
 */
export function isNetworkError(error: unknown): boolean {
  const anyError = error as any;
  const code = String(anyError?.code ?? "");
  const message = String(anyError?.message ?? "");
  
  const networkPatterns = [
    "GATEWAY_SERVER",
    "SOCKET_ERROR",
    "NETWORK",
    "WS_DISCONNECT",
    "TIMEOUT",
  ];
  
  return networkPatterns.some(pattern => {
    const regex = new RegExp(pattern, "i");
    return regex.test(code) || regex.test(message);
  });
}

/**
 * Check if an error is related to media/permission issues
 */
export function isMediaError(error: unknown): boolean {
  const anyError = error as any;
  const code = String(anyError?.code ?? "");
  const message = String(anyError?.message ?? "");
  
  const mediaPatterns = [
    "PERMISSION",
    "NOT_READABLE",
    "DEVICE_NOT_FOUND",
    "NOT_SUPPORTED",
    "CONSTRAINT",
    "NotAllowedError",
    "NotReadableError",
  ];
  
  return mediaPatterns.some(pattern => {
    const regex = new RegExp(pattern, "i");
    return regex.test(code) || regex.test(message);
  });
}
