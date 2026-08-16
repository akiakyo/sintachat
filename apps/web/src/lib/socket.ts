import { io, Socket } from "socket.io-client";
import { getAdminToken, getSessionId } from "./session";

let socket: Socket | null = null;

export function getSocket() {
  if (typeof window === "undefined") throw new Error("Socket is client-only");
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001", {
      auth: {
        sessionUuid: getSessionId(),
        adminToken: getAdminToken(),
      },
      transports: ["websocket", "polling"],
      reconnection: true,
    });
  }
  return socket;
}

export function resetSocket() {
  socket?.disconnect();
  socket = null;
}
