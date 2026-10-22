import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { refresh, createClient, removeChannel, subscribe, on, channel } = vi.hoisted(() => ({
  refresh: vi.fn(),
  createClient: vi.fn(),
  removeChannel: vi.fn(),
  subscribe: vi.fn(),
  on: vi.fn(),
  channel: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

import { LiveRefresh } from "./live-refresh";

/** Delivers a broadcast to the handler the component registered. */
function broadcast() {
  const handler = on.mock.calls[0]?.[2] as () => void;
  act(() => handler());
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  for (const mock of [refresh, createClient, removeChannel, subscribe, on, channel])
    mock.mockReset();
  const realtimeChannel = { on, subscribe };
  on.mockReturnValue(realtimeChannel);
  subscribe.mockReturnValue(realtimeChannel);
  channel.mockReturnValue(realtimeChannel);
  createClient.mockReturnValue({ channel, removeChannel });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("LiveRefresh", () => {
  it("listens to the catalog changed broadcast", () => {
    render(<LiveRefresh />);

    expect(createClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "sb_publishable_test",
      expect.anything(),
    );
    expect(channel).toHaveBeenCalledWith("catalog");
    expect(on).toHaveBeenCalledWith("broadcast", { event: "changed" }, expect.any(Function));
    expect(subscribe).toHaveBeenCalled();
  });

  it("renders nothing", () => {
    const { container } = render(<LiveRefresh />);

    expect(container).toBeEmptyDOMElement();
  });

  it("refreshes the page as soon as the ERP signals a change", () => {
    render(<LiveRefresh />);

    broadcast();

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("collapses a burst into the first refresh plus one trailing refresh", () => {
    render(<LiveRefresh />);

    for (let i = 0; i < 20; i++) broadcast();
    expect(refresh).toHaveBeenCalledTimes(1);

    advance(5000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("refreshes again on a later change once the pause has passed", () => {
    render(<LiveRefresh />);
    broadcast();

    advance(5000);
    broadcast();

    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it.each(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"])(
    "does not subscribe without %s",
    (name) => {
      vi.stubEnv(name, "");

      render(<LiveRefresh />);

      expect(createClient).not.toHaveBeenCalled();
    },
  );

  it("unsubscribes on unmount and drops a pending refresh", () => {
    const { unmount } = render(<LiveRefresh />);
    broadcast();
    broadcast();

    unmount();
    advance(5000);

    expect(removeChannel).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
