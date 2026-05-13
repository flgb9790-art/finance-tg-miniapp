import { createClient } from "@supabase/supabase-js";
import WebSocketImpl from "ws";
import { env } from "../config/env.js";

/**
 * Node 20: нет встроенного WebSocket для @supabase/realtime-js.
 * Полифилл globalThis + transport — чтобы работало и при «пустом» default import в ESM.
 * @see https://supabase.com/changelog/37869-change-in-realtime-js-affecting-node-js-22
 */
const Ws = WebSocketImpl as typeof WebSocketImpl & { default?: typeof WebSocketImpl };
const wsTransport = (Ws.default ?? Ws) as unknown as typeof WebSocket;

if (typeof globalThis.WebSocket === "undefined") {
  Object.assign(globalThis, { WebSocket: wsTransport });
}

export const supabase = createClient(
  env.supabaseUrl,
  env.supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    realtime: {
      transport: wsTransport as any
    }
  }
);
