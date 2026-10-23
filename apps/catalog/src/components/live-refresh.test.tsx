import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { LiveRefresh } from "./live-refresh";

const fetchMock = vi.fn();
let visibility: DocumentVisibilityState = "visible";

function answerWith(version: number) {
  fetchMock.mockResolvedValue(Response.json({ version }));
}

/** Runs the timers and the promise chain of the fetch they trigger. */
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function setVisibility(state: DocumentVisibilityState) {
  visibility = state;
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  visibility = "visible";
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
  refresh.mockReset();
  fetchMock.mockReset();
  answerWith(1);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("LiveRefresh", () => {
  it("renders nothing", () => {
    const { container } = render(<LiveRefresh />);

    expect(container).toBeEmptyDOMElement();
  });

  it("reads the version right away without refreshing the page", async () => {
    render(<LiveRefresh />);
    await advance(0);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/catalog-version");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("does not refresh while the version stays the same", async () => {
    render(<LiveRefresh />);
    await advance(12000);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refreshes once when the version changes", async () => {
    render(<LiveRefresh />);
    await advance(0);

    answerWith(2);
    await advance(4000);
    expect(refresh).toHaveBeenCalledTimes(1);

    await advance(4000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("ignores failed requests and keeps polling", async () => {
    render(<LiveRefresh />);
    await advance(0);

    fetchMock.mockRejectedValue(new TypeError("offline"));
    await advance(4000);
    fetchMock.mockResolvedValue(new Response("nope", { status: 500 }));
    await advance(4000);
    expect(refresh).not.toHaveBeenCalled();

    answerWith(2);
    await advance(4000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not poll while the tab is hidden", async () => {
    visibility = "hidden";
    render(<LiveRefresh />);
    await advance(20000);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stops polling when the tab is hidden and checks at once when it is shown again", async () => {
    render(<LiveRefresh />);
    await advance(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await setVisibility("hidden");
    await advance(20000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    answerWith(2);
    await setVisibility("visible");
    await advance(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("stops polling and drops its listener on unmount", async () => {
    const { unmount } = render(<LiveRefresh />);
    await advance(0);

    unmount();
    answerWith(2);
    await advance(20000);
    await setVisibility("visible");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });
});
