import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppSettings } from "./AppSettings";

describe("AppSettings", () => {
  it("renders without crashing", () => {
    render(<AppSettings />);
    // The component renders a Dialog which may not show content initially
    expect(document.body).toBeInTheDocument();
  });

  it("contains dialog content with tabs", () => {
    render(<AppSettings />);

    // Dialog content should contain the tabs (even if not visible)
    const dialogContent = document.querySelector("[role='tablist']");
    expect(dialogContent).toBeInTheDocument();
  });

  it("renders all three tab triggers", () => {
    render(<AppSettings />);

    expect(screen.getByRole("tab", { name: /general/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /integrations/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /watchers/i })).toBeInTheDocument();
  });

  it("shows general tab content by default", () => {
    render(<AppSettings />);

    // General tab should be selected by default
    const generalTab = screen.getByRole("tab", { name: /general/i });
    expect(generalTab).toHaveAttribute("data-state", "active");
  });

  it("switches to integrations tab when clicked", () => {
    render(<AppSettings />);

    const integrationsTab = screen.getByRole("tab", { name: /integrations/i });
    fireEvent.click(integrationsTab);

    expect(integrationsTab).toHaveAttribute("data-state", "active");
  });

  it("switches to watchers tab when clicked", () => {
    render(<AppSettings />);

    const watchersTab = screen.getByRole("tab", { name: /watchers/i });
    fireEvent.click(watchersTab);

    expect(watchersTab).toHaveAttribute("data-state", "active");
  });

  it("renders refresh rate select in general tab", () => {
    render(<AppSettings />);

    expect(screen.getByLabelText(/auto refresh rate/i)).toBeInTheDocument();
  });

  it("renders ignored routes input in general tab", () => {
    render(<AppSettings />);

    expect(screen.getByLabelText(/ignored routes/i)).toBeInTheDocument();
  });

  it("changes refresh rate when selected", () => {
    render(<AppSettings />);

    const select = screen.getByLabelText(/auto refresh rate/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "30" } });

    expect(select.value).toBe("30");
  });

  it("changes ignored routes when typed", () => {
    render(<AppSettings />);

    const input = screen.getByPlaceholderText(/\/health, \/metrics/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "/new-route" } });

    expect(input.value).toBe("/new-route");
  });

  it("renders watcher checkboxes in watchers tab", () => {
    render(<AppSettings />);

    const watchersTab = screen.getByRole("tab", { name: /watchers/i });
    fireEvent.click(watchersTab);

    // Check that watcher checkboxes are rendered
    expect(screen.getByLabelText(/requests/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/queries/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/jobs/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/logs/i)).toBeInTheDocument();
  });

  it("toggles watcher checkbox when clicked", () => {
    render(<AppSettings />);

    const watchersTab = screen.getByRole("tab", { name: /watchers/i });
    fireEvent.click(watchersTab);

    const requestsCheckbox = screen.getByLabelText(/requests/i) as HTMLInputElement;
    expect(requestsCheckbox.checked).toBe(true);

    fireEvent.click(requestsCheckbox);
    expect(requestsCheckbox.checked).toBe(false);
  });

  it("renders save configuration buttons", () => {
    render(<AppSettings />);

    const saveButtons = screen.getAllByRole("button", { name: /save configuration/i });
    expect(saveButtons.length).toBeGreaterThan(0);
  });

  it("renders add buttons in integrations tab", () => {
    render(<AppSettings />);

    const integrationsTab = screen.getByRole("tab", { name: /integrations/i });
    fireEvent.click(integrationsTab);

    const addButtons = screen.getAllByText(/\+ add/i);
    expect(addButtons.length).toBe(2); // Mail Providers and Database ORM
  });
});

