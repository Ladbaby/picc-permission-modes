import { describe, expect, it } from "vitest";
import { createEventBus } from "@earendil-works/pi-coding-agent";
import { PLAN_HOST_REQUEST, requestPlanHost, type PlanHostRequest } from "./headlessPlanHost.ts";

describe("headless plan host bridge", () => {
  it("fails closed when no host claims the request", async () => {
    const result = await requestPlanHost(createEventBus(), "EnterPlanMode", "enter", {});
    expect(result).toMatchObject({ behavior: "deny" });
  });
  it("waits until the host answers, including updated permission mode", async () => {
    const events = createEventBus();
    let request!: PlanHostRequest;
    events.on(PLAN_HOST_REQUEST, (data) => {
      request = data as PlanHostRequest;
      request.handled = true;
    });
    let settled = false;
    const result = requestPlanHost(events, "ExitPlanMode", "exit", { plan: "# Plan" });
    void result.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);
    request.respond({ behavior: "allow", updatedInput: { plan: "# Edited" }, updatedPermissions: [{ type: "setMode", mode: "acceptEdits" }] });
    expect(await result).toMatchObject({ behavior: "allow", updatedInput: { plan: "# Edited" } });
  });
  it("cancels without requiring the host to reply and ignores late approval", async () => {
    const events = createEventBus();
    let request!: PlanHostRequest;
    events.on(PLAN_HOST_REQUEST, (data) => {
      request = data as PlanHostRequest;
      request.handled = true;
    });
    const controller = new AbortController();
    const result = requestPlanHost(events, "EnterPlanMode", "enter", {}, controller.signal);
    controller.abort();
    expect(await result).toEqual({ behavior: "deny", message: "cancelled by client" });
    request.respond({ behavior: "allow" });
    expect(await result).toMatchObject({ behavior: "deny" });
  });
});
