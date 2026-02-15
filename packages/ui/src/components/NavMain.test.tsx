import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { NavMain } from "./NavMain";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Home, Settings, Users } from "lucide-react";

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <SidebarProvider>{ui}</SidebarProvider>
    </MemoryRouter>
  );
};

describe("NavMain", () => {
  const mockItems = [
    {
      title: "Activity",
      url: "#",
      icon: Home,
      isActive: true,
      items: [
        { title: "Dashboard", url: "/dashboard", icon: Home },
        { title: "Users", url: "/users", icon: Users },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings,
      isActive: false,
      items: [
        { title: "General", url: "/settings/general" },
        { title: "Security", url: "/settings/security" },
      ],
    },
  ];

  it("renders all top-level navigation items", () => {
    renderWithProviders(<NavMain items={mockItems} />);

    expect(screen.getByText("Activity")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders sub-items for expanded sections", () => {
    renderWithProviders(<NavMain items={mockItems} />);

    // Activity section is isActive: true, so should be expanded
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
  });

  it("renders navigation links with correct hrefs", () => {
    renderWithProviders(<NavMain items={mockItems} />);

    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");

    const usersLink = screen.getByRole("link", { name: /users/i });
    expect(usersLink).toHaveAttribute("href", "/users");
  });

  it("renders empty when no items provided", () => {
    const { container } = renderWithProviders(<NavMain items={[]} />);
    
    // Should still render the structure but with no menu items
    expect(container.querySelector("[data-sidebar='menu']")).toBeInTheDocument();
  });

  it("renders items without icons", () => {
    const itemsWithoutIcons = [
      {
        title: "No Icon Section",
        url: "#",
        isActive: true,
        items: [{ title: "Sub Item", url: "/sub" }],
      },
    ];

    renderWithProviders(<NavMain items={itemsWithoutIcons} />);

    expect(screen.getByText("No Icon Section")).toBeInTheDocument();
    expect(screen.getByText("Sub Item")).toBeInTheDocument();
  });

  it("renders chevron icon for collapsible sections", () => {
    renderWithProviders(<NavMain items={mockItems} />);

    // There should be chevron icons (one per collapsible section)
    const chevrons = document.querySelectorAll(".lucide-chevron-right");
    expect(chevrons.length).toBe(mockItems.length);
  });
});

