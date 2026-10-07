import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/** In-process bridge only: callbacks and AbortSignal never go on the wire. */
export const PLAN_HOST_REQUEST = "picc:plan-host:request";
export type PlanHostDecision =
  | { behavior: "allow"; updatedInput?: Record<string, unknown>; updatedPermissions?: unknown[] }
  | { behavior: "deny"; message: string };
export interface PlanHostRequest {
  toolName: "EnterPlanMode" | "ExitPlanMode";
  toolCallId: string;
  input: Record<string, unknown>;
  signal?: AbortSignal;
  handled: boolean;
  respond: (decision: PlanHostDecision) => void;
}

/** Absent transport fails closed; a present transport waits for human input. */
export function requestPlanHost(
  events: ExtensionAPI["events"] | undefined,
  toolName: PlanHostRequest["toolName"],
  toolCallId: string,
  input: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<PlanHostDecision> {
  return new Promise((resolve) => {
    let settled = false;
    const respond = (decision: PlanHostDecision) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", abort);
      resolve(decision);
    };
    const abort = () => respond({ behavior: "deny", message: "cancelled by client" });
    if (signal?.aborted) return abort();
    signal?.addEventListener("abort", abort, { once: true });
    const request: PlanHostRequest = { toolName, toolCallId, input, signal, handled: false, respond };
    try {
      events?.emit(PLAN_HOST_REQUEST, request);
      if (!request.handled) respond({ behavior: "deny", message: "Plan mode requires an interactive UI or a connected host control channel." });
    } catch (error) {
      respond({ behavior: "deny", message: String(error) });
    }
  });
}
