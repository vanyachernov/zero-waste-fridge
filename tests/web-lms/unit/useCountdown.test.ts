import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCountdown } from "@lms/lib/useCountdown";

describe("useCountdown", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("counts down once per second and stops at zero", () => {
    const { result } = renderHook(() => useCountdown());
    expect(result.current[0]).toBe(0);

    act(() => result.current[1](3));
    expect(result.current[0]).toBe(3);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current[0]).toBe(2);

    act(() => vi.advanceTimersByTime(2000));
    expect(result.current[0]).toBe(0);

    act(() => vi.advanceTimersByTime(5000));
    expect(result.current[0]).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("restarting resets the remaining time", () => {
    const { result } = renderHook(() => useCountdown());
    act(() => result.current[1](10));
    act(() => vi.advanceTimersByTime(7000));
    act(() => result.current[1](60));
    expect(result.current[0]).toBe(60);
  });
});
