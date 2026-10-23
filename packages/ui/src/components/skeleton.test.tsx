import { render } from "@testing-library/react";
import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("is hidden from assistive technology", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("pulses, but not for users who prefer reduced motion", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild).toHaveClass("animate-pulse", "motion-reduce:animate-none");
  });

  it("merges the caller's classes and props", () => {
    const { container } = render(<Skeleton className="h-4 w-20" data-testid="block" />);
    expect(container.firstElementChild).toHaveClass("h-4", "w-20", "bg-subtle");
    expect(container.firstElementChild).toHaveAttribute("data-testid", "block");
  });
});
