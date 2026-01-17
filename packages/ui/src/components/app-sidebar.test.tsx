import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AppSidebar } from "./app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

// Mock the AppSettings component since it has complex dialog behavior
vi.mock("./app-settings", () => ({
  AppSettings: () => <div data-testid="app-settings">Settings</div>,
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <SidebarProvider>{ui}</SidebarProvider>
    </MemoryRouter>
  );
};

describe("AppSidebar", () => {
  it("renders the sidebar", () => {
    renderWithProviders(<AppSidebar />);

    expect(document.querySelector("[data-sidebar='sidebar']")).toBeInTheDocument();
  });

  it("renders the Observatory logo and title", () => {
    renderWithProviders(<AppSidebar />);

    expect(screen.getByText("Observatory")).toBeInTheDocument();
    expect(screen.getByAltText("")).toHaveAttribute("src", "/ui/neural-network.png");
  });

  it("renders the Dashboard link", () => {
    renderWithProviders(<AppSidebar />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders navigation sections", () => {
    renderWithProviders(<AppSidebar />);

    expect(screen.getByText("Activity")).toBeInTheDocument();
    expect(screen.getByText("Errors")).toBeInTheDocument();
    expect(screen.getByText("Monitoring")).toBeInTheDocument();
  });

  it("renders Activity sub-items", () => {
    renderWithProviders(<AppSidebar />);

    expect(screen.getByText("Requests")).toBeInTheDocument();
    expect(screen.getByText("Jobs")).toBeInTheDocument();
    expect(screen.getByText("Schedules")).toBeInTheDocument();
    expect(screen.getByText("Queries")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Mails")).toBeInTheDocument();
    expect(screen.getByText("Outgoing Requests")).toBeInTheDocument();
  });

  it("renders Errors sub-items", () => {
    renderWithProviders(<AppSidebar />);

    expect(screen.getByText("Exceptions")).toBeInTheDocument();
  });

  it("renders Monitoring sub-items", () => {
    renderWithProviders(<AppSidebar />);

    expect(screen.getByText("Cache")).toBeInTheDocument();
    expect(screen.getByText("Logs")).toBeInTheDocument();
    expect(screen.getByText("Models")).toBeInTheDocument();
    expect(screen.getByText("Views")).toBeInTheDocument();
  });

  it("renders navigation links with correct URLs", () => {
    renderWithProviders(<AppSidebar />);

    expect(screen.getByRole("link", { name: /requests/i })).toHaveAttribute(
      "href",
      "/requests"
    );
    expect(screen.getByRole("link", { name: /jobs/i })).toHaveAttribute(
      "href",
      "/jobs"
    );
    expect(screen.getByRole("link", { name: /exceptions/i })).toHaveAttribute(
      "href",
      "/exceptions"
    );
  });

  it("renders the AppSettings component in footer", () => {
    renderWithProviders(<AppSidebar />);

    expect(screen.getByTestId("app-settings")).toBeInTheDocument();
  });

  it("renders the sidebar rail", () => {
    renderWithProviders(<AppSidebar />);

    expect(document.querySelector("[data-sidebar='rail']")).toBeInTheDocument();
  });

  it("has home link pointing to root", () => {
    renderWithProviders(<AppSidebar />);

    const homeLinks = screen.getAllByRole("link").filter(
      (link) => link.getAttribute("href") === "/"
    );
    expect(homeLinks.length).toBeGreaterThan(0);
  });

  it("passes props to Sidebar component", () => {
    renderWithProviders(<AppSidebar className="custom-class" />);

    const sidebar = document.querySelector("[data-sidebar='sidebar']");
    expect(sidebar).toHaveClass("custom-class");
  });
});

