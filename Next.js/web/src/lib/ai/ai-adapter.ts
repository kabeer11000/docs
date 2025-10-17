import { API_CONFIG } from "@/lib/api-config";

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

export interface IDocumentResponse {
  response: string;
  first_doc: {
    documents: Array<{
      content: string;
      metadata: {
        filename: string;
      };
      source: string;
      source_name: string;
    }>;
    sources: string[];
  };
  user_id: number;
  chat_id: number;
  message_id: number;
}

export interface IStreamResponse {
  command: string;
  new_message: string;
}

export type IMessageResponse = IDocumentResponse | IStreamResponse;

type EventHandler<T> = (event: T) => void;

interface MessageEvent {
  id: string;
  content: string;
  data: IDocumentResponse;
}

interface StreamDeltaEvent {
  id: string;
  content: string;
}

export class AIAdapter {
  private uid: number | string;
  private chatId: string | number;
  private _streamingMessageId: string | null = null;
  private COMMANDS = {
    OUTGOING_MESSAGE: "new_message",
    INCOMING_STREAM_CHUNK: "new_message",
    INCOMING_FINAL_RESPONSE: "ai_response",
  };
  private _streamDataBuffer: string = "";
  private transport: WebSocket | null = null;

  public get state() {
    return {
      OPEN: WebSocket.OPEN,
      CLOSED: WebSocket.CLOSED,
      CLOSING: WebSocket.CLOSING,
      CONNECTING: WebSocket.CONNECTING,
      readyState: this.transport?.readyState,
    };
  }

  private EVENT_LISTENER_MAP: {
    onmessage: Array<EventHandler<MessageEvent>>;
    onstreamdelta: Array<EventHandler<StreamDeltaEvent>>;
  } = {
    onmessage: [],
    onstreamdelta: [],
  };

  constructor(uid: string | number, chatId: string | number) {
    this.uid = uid;
    this.chatId = chatId;
  }

  addEventListener<K extends keyof typeof this.EVENT_LISTENER_MAP>(
    name: K,
    callback: K extends "onmessage"
      ? EventHandler<MessageEvent>
      : EventHandler<StreamDeltaEvent>,
  ) {
    if (!Object.keys(this.EVENT_LISTENER_MAP).includes(name)) {
      throw new Error(`Unrecognised event name: ${name}`);
    }
    (this.EVENT_LISTENER_MAP[name] as any[]).push(callback);
  }

  removeEventListener<K extends keyof typeof this.EVENT_LISTENER_MAP>(
    name: K,
    callback: K extends "onmessage"
      ? EventHandler<MessageEvent>
      : EventHandler<StreamDeltaEvent>,
  ) {
    if (!Object.keys(this.EVENT_LISTENER_MAP).includes(name)) {
      throw new Error(`Unrecognised event name: ${name}`);
    }
    const listeners = this.EVENT_LISTENER_MAP[name] as any[];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  private _onTransportMessage = (e: any) => {
    if (!e.data) return;

    try {
      const data: IMessageResponse = JSON.parse(e.data);

      // Check for streaming chunks FIRST (new_message field)
      if (this._streamingMessageId && "new_message" in data) {
        const streamData = data as IStreamResponse;

        // Skip SOF and EOF markers
        if (
          streamData.new_message === "<SOF>" ||
          streamData.new_message === "<EOF>"
        ) {
          return;
        }

        for (const listener of this.EVENT_LISTENER_MAP.onstreamdelta) {
          this._streamDataBuffer += streamData.new_message || "";
          listener({
            id: this._streamingMessageId,
            content: this._streamDataBuffer,
          });
        }
        return; // Don't process as final response
      }

      // Check for final response (response field)
      if (this._streamingMessageId && "response" in data && data.response) {
        const documentData = data as IDocumentResponse;

        for (const listener of this.EVENT_LISTENER_MAP.onmessage) {
          listener({
            id: this._streamingMessageId,
            content: documentData.response,
            data: documentData,
          });
        }
        this._streamingMessageId = null;
        this._streamDataBuffer = "";
      }
    } catch (_error) {
      // Silent fail
    }
  };

  async connect(): Promise<AIAdapter> {
    // const authToken = this.getAuthToken();
    // if (!authToken) {
    //     throw new Error('Authentication required');
    // }

    return new Promise<AIAdapter>((resolve, reject) => {
      const wsUrl = ensureSecureWebSocketURL(`${API_CONFIG.AI.WEBSOCKET_URL}`); //?token=${encodeURIComponent(authToken)}
      this.transport = new WebSocket(wsUrl);

      this.transport.addEventListener("open", () => {
        this.transport?.addEventListener("message", this._onTransportMessage);
        resolve(this);
      });

      this.transport.addEventListener("error", () => {
        reject(new Error("WebSocket connection failed"));
      });
    });
  }

  // private getAuthToken(): string | null {
  //     if (typeof window !== 'undefined') {
  //         const cookies = document.cookie.split(';');
  //         for (const cookie of cookies) {
  //             const trimmed = cookie.trim();
  //             if (trimmed.startsWith('lexa_access_token=')) {
  //                 return trimmed.substring('lexa_access_token='.length);
  //             }
  //         }
  //     }
  //     return null;
  // }

  message({
    id,
    content,
    fileIds,
  }: {
    id: string;
    content: string;
    fileIds?: string[];
  }) {
    if (!this.transport || this.transport.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    const payload: any = {
      command: this.COMMANDS.OUTGOING_MESSAGE,
      user_id: this.uid,
      chat_id: this.chatId,
      message: content,
    };

    // Include file ID if present (backend supports single file only)
    if (fileIds && fileIds.length > 0) {
      payload.file_id = fileIds[0]; // Send only the first file ID
    }

    console.log("Sending payload to AI:", JSON.stringify(payload, null, 2));
    this.transport.send(JSON.stringify(payload));

    this._streamingMessageId = id;
  }

  disconnect() {
    if (this.transport) {
      this.transport.close();
      this.transport = null;
    }
  }
}
