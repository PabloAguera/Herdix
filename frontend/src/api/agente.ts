import apiClient from "./client";

export interface MensajeHistorial {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  mensaje: string;
  historial: MensajeHistorial[];
}

export interface ChatResponse {
  respuesta: string;
}

export const agenteApi = {
  chat: (ganaderiaId: number, body: ChatRequest) =>
    apiClient
      .post<ChatResponse>(`/ganaderias/${ganaderiaId}/agente/chat`, body)
      .then((r) => r.data),
};
