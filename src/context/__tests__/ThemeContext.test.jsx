import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "../ThemeContext";

function ThemeToggleTester() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button type="button" onClick={toggleTheme}>
      {isDark ? "dark" : "light"}
    </button>
  );
}

describe("ThemeProvider", () => {
  const originalMatchMedia = window.matchMedia;

  const mockMatchMedia = (matches) =>
    vi.fn().mockImplementation(() => ({
      matches,
      media: "(prefers-color-scheme: dark)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }));

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("defaults to dark when no stored value, regardless of system preference", () => {
    window.matchMedia = mockMatchMedia(false);

    render(
      <ThemeProvider>
        <ThemeToggleTester />
      </ThemeProvider>
    );

    expect(screen.getByRole("button")).toHaveTextContent("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("respects a stored light preference over the dark default", () => {
    localStorage.setItem("golfTripTheme", "light");

    render(
      <ThemeProvider>
        <ThemeToggleTester />
      </ThemeProvider>
    );

    expect(screen.getByRole("button")).toHaveTextContent("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("toggles between dark and light modes and persists choice", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeToggleTester />
      </ThemeProvider>
    );

    // Dark is the default starting state.
    const [toggleButton] = screen.getAllByRole("button", { name: /^dark$/i });
    await user.click(toggleButton);

    expect(toggleButton).toHaveTextContent("light");
    expect(localStorage.getItem("golfTripTheme")).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    await user.click(toggleButton);

    expect(toggleButton).toHaveTextContent("dark");
    expect(localStorage.getItem("golfTripTheme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});

