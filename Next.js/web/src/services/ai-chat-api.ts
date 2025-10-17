import { API_CONFIG, getCurrentUserId } from "../lib/api-config";

// Security: Ensure WebSocket URL uses secure protocol in production
function ensureSecureWebSocketURL(url: string): string {
  if (!url) return url;

  const isProduction = process.env.NEXT_PUBLIC_ENVIRONMENT === "production" ||
                       process.env.NEXT_PUBLIC_ENVIRONMENT === "staging";
  const isLocalhost = url.includes("localhost") || url.includes("127.0.0.1");

  // In production, force wss:// for all non-localhost URLs
  if (isProduction && !isLocalhost && url.startsWith("ws://")) {
    console.warn(
      "Security: Converting insecure ws:// to wss:// in production:",
      url
    );
    return url.replace("ws://", "wss://");
  }

  // In development, allow ws:// only for localhost
  if (!isProduction && !isLocalhost && url.startsWith("ws://")) {
    console.warn(
      "Security: Non-localhost WebSocket should use wss://:",
      url
    );
    return url.replace("ws://", "wss://");
  }

  return url;
}

// WebSocket message types from AI API documentation
export interface WebSocketMessage {
  command: "new_message" | "prepare_message_with_file" | "finish_upload";
  user_id?: number;
  chat_id?: number;
  message?: string;
  message_id?: number;
  file_info?: {
    filename: string;
    content_type: string;
    size: number;
  };
  upload_token?: string;
}

export interface AIResponse {
  response?: string;
  first_doc?: string;
  judgements?: string;
  user_id: number;
  chat_id: number;
  message_id: number;
  status?:
    | "waiting_for_file"
    | "file_uploaded"
    | "processing"
    | "completed"
    | "failed";
  file_upload?: {
    upload_url: string;
    upload_token: string;
    s3_key: string;
    expires_in: number;
  };
}

export interface ChatSession {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  last_message?: {
    id: number;
    content: string;
    sender: "USER" | "AI";
    timestamp: string;
  };
}

// AI Chat API Service using WebSocket
export class AIChatAPIService {
  private websocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000; // Start with 1 second
  private userId: number;
  private currentChatId: number | null = null;
  private messageCallbacks: Map<string, (response: AIResponse) => void> =
    new Map();
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    const userIdStr = getCurrentUserId();
    // Extract numeric ID from user ID format (user-123 -> 123)
    this.userId =
      parseInt(userIdStr.replace("user-", ""), 10) ||
      Math.floor(Math.random() * 1000);
  }

  // Connect to WebSocket
  async connect(): Promise<void> {
    // If already connected, return immediately
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    // If connection is in progress, wait for it
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        const wsUrl = ensureSecureWebSocketURL(API_CONFIG.AI.WEBSOCKET_URL);
        console.log("🔗 Connecting to WebSocket:", wsUrl);

        // Validate WebSocket URL
        if (
          !wsUrl ||
          (!wsUrl.startsWith("ws://") && !wsUrl.startsWith("wss://"))
        ) {
          throw new Error(`Invalid WebSocket URL: ${wsUrl}`);
        }

        this.websocket = new WebSocket(wsUrl);

        // Set up connection timeout
        const connectionTimeout = setTimeout(() => {
          if (
            this.websocket &&
            this.websocket.readyState === WebSocket.CONNECTING
          ) {
            console.log("⏰ WebSocket connection timeout");
            this.websocket.close();
            reject(new Error("WebSocket connection timeout"));
          }
        }, 10000); // 10 second timeout

        // Set up keepalive ping
        let pingInterval: NodeJS.Timeout;

        this.websocket.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log("🤖 Connected to AI WebSocket:", wsUrl);
          console.log("🤖 WebSocket readyState:", this.websocket?.readyState);
          this.reconnectAttempts = 0;
          this.reconnectInterval = 1000;

          // Send ping every 30 seconds to keep connection alive
          pingInterval = setInterval(() => {
            if (
              this.websocket &&
              this.websocket.readyState === WebSocket.OPEN
            ) {
              this.websocket.send(JSON.stringify({ command: "ping" }));
            }
          }, 30000);

          resolve();
        };

        this.websocket.onmessage = (event) => {
          try {
            const data: AIResponse = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        this.websocket.onclose = (event) => {
          console.log(
            "🔌 AI WebSocket disconnected:",
            event.code,
            event.reason,
          );
          console.log("🔌 Was clean:", event.wasClean);

          // Clear ping interval
          if (pingInterval) {
            clearInterval(pingInterval);
          }

          this.connectionPromise = null;

          // Always try to reconnect unless it's a clean disconnect (1000) or authentication error (1008)
          if (
            event.code !== 1000 &&
            event.code !== 1008 &&
            this.reconnectAttempts < this.maxReconnectAttempts
          ) {
            this.scheduleReconnect();
          }
        };

        this.websocket.onerror = (error) => {
          console.error("❌ AI WebSocket error:", error);
          console.error("❌ WebSocket URL:", API_CONFIG.AI.WEBSOCKET_URL);
          reject(
            new Error(
              `Failed to connect to AI service: ${API_CONFIG.AI.WEBSOCKET_URL}`,
            ),
          );
        };
      } catch (error) {
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  // Handle incoming WebSocket messages
  private handleMessage(data: AIResponse) {
    console.log("📨 Received AI message:", data);

    // Handle ping/pong responses
    if ((data as any).command === "pong") {
      console.log("🏓 Received pong from server");
      return;
    }

    // Handle message callbacks for file upload workflow
    if (data.status === "waiting_for_file" && data.file_upload) {
      const callbackKey = `${this.userId}-${data.chat_id || "new"}-upload`;
      const callback = this.messageCallbacks.get(callbackKey);
      if (callback) {
        this.messageCallbacks.delete(callbackKey);
        callback(data);
        return;
      }
    }

    // Update current chat ID if provided
    if (data.chat_id) {
      this.currentChatId = data.chat_id;
    }

    // Emit custom event for components to listen to
    window.dispatchEvent(new CustomEvent("ai-message", { detail: data }));
  }

  // Schedule reconnection with exponential backoff
  private scheduleReconnect() {
    this.reconnectAttempts++;
    console.log(
      `🔄 Attempting to reconnect to AI (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
    );

    setTimeout(() => {
      this.connect().catch(console.error);
    }, this.reconnectInterval);

    // Exponential backoff with max 30 seconds
    this.reconnectInterval = Math.min(this.reconnectInterval * 2, 30000);
  }

  // Send a regular message to AI
  async sendMessage(message: string, chatId?: number): Promise<void> {
    console.log("🚀 sendMessage called with:", { message, chatId });

    // Check if connection is already open
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      console.log("✅ Using existing WebSocket connection");
    } else {
      console.log("🔗 WebSocket not ready, connecting...");
      try {
        await this.connect();
        console.log(
          "🔗 Connection established, WebSocket state:",
          this.websocket?.readyState,
        );
      } catch (error) {
        console.error("🚨 Failed to connect:", error);
        throw error;
      }
    }

    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      console.error("🚨 WebSocket not ready:", {
        exists: !!this.websocket,
        readyState: this.websocket?.readyState,
        CONNECTING: WebSocket.CONNECTING,
        OPEN: WebSocket.OPEN,
        CLOSING: WebSocket.CLOSING,
        CLOSED: WebSocket.CLOSED,
      });
      throw new Error("WebSocket connection not available");
    }

    const wsMessage: WebSocketMessage = {
      command: "new_message",
      user_id: this.userId,
      chat_id: chatId,
      message,
    };

    console.log("📤 Sending message:", wsMessage);
    console.log("🔢 User ID being sent:", this.userId);
    this.websocket.send(JSON.stringify(wsMessage));
  }

  // Prepare file upload (Step 1 of file upload process)
  async prepareFileUpload(
    message: string,
    fileInfo: { filename: string; content_type: string; size: number },
    chatId?: number,
  ): Promise<AIResponse> {
    // Check if connection is already open
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      console.log("✅ Using existing WebSocket connection for file upload");
    } else {
      await this.connect();
    }

    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket connection not available");
    }

    const wsMessage: WebSocketMessage = {
      command: "prepare_message_with_file",
      user_id: this.userId,
      chat_id: chatId || undefined,
      message,
      file_info: fileInfo,
    };

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("File upload preparation timeout"));
      }, 10000);

      const callbackKey = `${this.userId}-${chatId || "new"}-upload`;

      this.messageCallbacks.set(callbackKey, (response) => {
        clearTimeout(timeoutId);
        resolve(response);
      });

      this.websocket?.send(JSON.stringify(wsMessage));
    });
  }

  // Upload file to S3 using presigned URL
  async uploadFileToS3(file: File, uploadUrl: string): Promise<boolean> {
    try {
      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      return response.ok;
    } catch (error) {
      console.error("S3 upload failed:", error);
      return false;
    }
  }

  // Complete file upload (Step 3 of file upload process)
  async finishFileUpload(uploadToken: string): Promise<AIResponse> {
    // Check if connection is already open
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      console.log(
        "✅ Using existing WebSocket connection for upload completion",
      );
    } else {
      await this.connect();
    }

    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket connection not available");
    }

    const wsMessage: WebSocketMessage = {
      command: "finish_upload",
      upload_token: uploadToken,
    };

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("File upload completion timeout"));
      }, 15000);

      // Listen for any response after finish_upload
      const eventListener = (event: CustomEvent<AIResponse>) => {
        clearTimeout(timeoutId);
        window.removeEventListener(
          "ai-message",
          eventListener as EventListener,
        );
        resolve(event.detail);
      };

      window.addEventListener("ai-message", eventListener as EventListener);
      this.websocket?.send(JSON.stringify(wsMessage));
    });
  }

  // Full file upload workflow
  async uploadFileWithMessage(
    file: File,
    message: string,
    chatId?: number,
  ): Promise<void> {
    try {
      // Step 1: Prepare upload
      const prepareResponse = await this.prepareFileUpload(
        message,
        {
          filename: file.name,
          content_type: file.type,
          size: file.size,
        },
        chatId,
      );

      if (!prepareResponse.file_upload) {
        throw new Error("Failed to prepare file upload");
      }

      // Step 2: Upload to S3
      const uploadSuccess = await this.uploadFileToS3(
        file,
        prepareResponse.file_upload.upload_url,
      );

      if (!uploadSuccess) {
        throw new Error("Failed to upload file to S3");
      }

      // Step 3: Notify completion
      await this.finishFileUpload(prepareResponse.file_upload.upload_token);

      // Update current chat ID if new chat was created
      if (prepareResponse.chat_id) {
        this.currentChatId = prepareResponse.chat_id;
      }
    } catch (error) {
      console.error("File upload workflow failed:", error);
      throw error;
    }
  }

  // REST API methods for chat history
  async getChatHistory(
    userId?: number,
  ): Promise<{ user_id: number; chats: ChatSession[] }> {
    const targetUserId = userId || this.userId;
    const response = await fetch(
      `${API_CONFIG.AI.BASE_URL}${API_CONFIG.AI.ENDPOINTS.CHATS}/${targetUserId}`,
    );
    return await response.json();
  }

  async getChatMessages(
    chatId: number,
    userId?: number,
  ): Promise<{ chat_id: number; user_id: number; messages: any[] }> {
    const targetUserId = userId || this.userId;
    const response = await fetch(
      `${API_CONFIG.AI.BASE_URL}${API_CONFIG.AI.ENDPOINTS.MESSAGES}/${targetUserId}/${chatId}`,
    );
    return await response.json();
  }

  // Clean up WebSocket connection
  disconnect() {
    if (this.websocket) {
      this.websocket.close(1000, "Client disconnect");
      this.websocket = null;
    }
    this.connectionPromise = null;
    this.messageCallbacks.clear();
  }

  // Set current chat ID
  setCurrentChatId(chatId: number | null) {
    this.currentChatId = chatId;
  }

  getCurrentChatId(): number | null {
    return this.currentChatId;
  }
}

// Singleton instance
export const aiChatAPI = new AIChatAPIService();
