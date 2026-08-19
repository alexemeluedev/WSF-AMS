// npm test -- --runInBand tests/Cell.test.jsx
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import CellManager from "../src/pages/CellManager.jsx";

import {
  zoneService,
  cellService,
  memberService,
} from "../src/api/apiClient.js";

jest.mock("../src/api/apiClient.js", () => ({
  zoneService: {
    list: jest.fn(),
  },
  cellService: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
  memberService: {
    create: jest.fn(),
  },
}));

jest.mock("../src/contexts/StatsContext.jsx", () => ({
  useStats: () => ({
    refreshStats: jest.fn(),
  }),
}));

describe("CellManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    zoneService.list.mockResolvedValue({
      zones: [],
    });

    cellService.list.mockResolvedValue({
      cells: [],
      totalPages: 1,
      currentPage: 1,
      totalItems: 0,
    });
  });

  test("renders the cell search, zone filter, and register controls", async () => {
    render(
      <MemoryRouter>
        <CellManager />
      </MemoryRouter>,
    );

    expect(
      await screen.findByPlaceholderText(/search with cell name or address/i),
    ).toBeInTheDocument();

    expect(screen.getByText(/select zone/i)).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /all zones/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /register new cell/i,
      }),
    ).toBeInTheDocument();
  });
  test("displays existing cell data", async () => {
    zoneService.list.mockResolvedValue({
      zones: [{ _id: "zone1", name: "Zone 1" }],
    });

    cellService.list.mockResolvedValue({
      cells: [
        {
          _id: "cell1",
          name: "Cell 1",
          address: "Lagos Road",
          zone: {
            _id: "zone1",
            name: "Zone 1",
          },
          memberCount: 5,
        },
      ],
      totalPages: 1,
      currentPage: 1,
      totalItems: 1,
    });

    render(
      <MemoryRouter>
        <CellManager />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Cell 1")).toBeInTheDocument();
    expect(screen.getByText("Lagos Road")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
  test("opens the register cell form", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <CellManager />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", {
        name: /register new cell/i,
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: /register new cell/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByText(/cell name/i)).toBeInTheDocument();
    expect(screen.getByText(/zone assignment/i)).toBeInTheDocument();
    expect(screen.getByText(/physical location address/i)).toBeInTheDocument();
  });
  test("creates a new cell", async () => {
    const user = userEvent.setup();

    zoneService.list.mockResolvedValue({
      zones: [{ _id: "zone1", name: "Zone 1" }],
    });

    cellService.list.mockResolvedValue({
      cells: [],
      totalPages: 1,
      currentPage: 1,
      totalItems: 0,
    });

    cellService.create.mockResolvedValue({
      _id: "cell2",
      name: "Cell 2",
      address: "Airport Road",
      zone: "zone1",
    });

    render(
      <MemoryRouter>
        <CellManager />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", {
        name: /register new cell/i,
      }),
    );

    // Fill Cell Name
    await user.type(screen.getByPlaceholderText(/empowerment004/i), "Cell 2");

    // Open the Parent Zone dropdown
    await user.click(
      screen.getByRole("button", {
        name: /select parent zone/i,
      }),
    );

    // Select Zone 1
    await user.click(screen.getByRole("option", { name: /zone 1/i }));

    // Fill address
    await user.type(
      screen.getByPlaceholderText(/enter street location/i),
      "Airport Road",
    );

    // Submit
    await user.click(
      screen.getByRole("button", {
        name: /save configuration/i,
      }),
    );

    expect(cellService.create).toHaveBeenCalledWith({
      name: "Cell 2",
      zone: "zone1",
      address: "Airport Road",
    });
  });
  test("opens the edit form with existing cell data", async () => {
    const user = userEvent.setup();

    zoneService.list.mockResolvedValue({
      zones: [{ _id: "zone1", name: "Zone 1" }],
    });

    cellService.list.mockResolvedValue({
      cells: [
        {
          _id: "cell1",
          name: "Cell 1",
          address: "Lagos Road",
          zone: {
            _id: "zone1",
            name: "Zone 1",
          },
          memberCount: 5,
        },
      ],
      totalPages: 1,
      currentPage: 1,
      totalItems: 1,
    });

    render(
      <MemoryRouter>
        <CellManager />
      </MemoryRouter>,
    );

    // Wait for the existing cell to appear
    expect(await screen.findByText("Cell 1")).toBeInTheDocument();

    // Open the Actions menu
    await user.click(
      screen.getByRole("button", {
        name: /actions/i,
      }),
    );

    // Click Edit
    await user.click(
      screen.getByRole("button", {
        name: /edit/i,
      }),
    );

    // Verify the edit form opens
    expect(
      screen.getByRole("heading", {
        name: /modify cell settings/i,
      }),
    ).toBeInTheDocument();

    // Verify existing cell data is populated
    expect(screen.getByDisplayValue("Cell 1")).toBeInTheDocument();

    expect(screen.getByDisplayValue("Lagos Road")).toBeInTheDocument();
  });
  test("updates an existing cell", async () => {
    const user = userEvent.setup();

    zoneService.list.mockResolvedValue({
      zones: [{ _id: "zone1", name: "Zone 1" }],
    });

    cellService.list.mockResolvedValue({
      cells: [
        {
          _id: "cell1",
          name: "Cell 1",
          address: "Lagos Road",
          zone: {
            _id: "zone1",
            name: "Zone 1",
          },
          memberCount: 5,
        },
      ],
      totalPages: 1,
      currentPage: 1,
      totalItems: 1,
    });

    cellService.update.mockResolvedValue({
      _id: "cell1",
      name: "Updated Cell",
      address: "Airport Road",
      zone: "zone1",
    });

    render(
      <MemoryRouter>
        <CellManager />
      </MemoryRouter>,
    );

    // Wait for the existing cell to appear
    expect(await screen.findByText("Cell 1")).toBeInTheDocument();

    // Open Actions menu
    await user.click(
      screen.getByRole("button", {
        name: /actions/i,
      }),
    );

    // Click Edit
    await user.click(
      screen.getByRole("button", {
        name: /edit/i,
      }),
    );

    // Update Cell Name
    const nameInput = screen.getByDisplayValue("Cell 1");
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Cell");

    // Update Address
    const addressInput = screen.getByDisplayValue("Lagos Road");
    await user.clear(addressInput);
    await user.type(addressInput, "Airport Road");

    // Save
    await user.click(
      screen.getByRole("button", {
        name: /save configuration/i,
      }),
    );

    expect(cellService.update).toHaveBeenCalledWith("cell1", {
      name: "Updated Cell",
      zone: "zone1",
      address: "Airport Road",
    });
  });
});
