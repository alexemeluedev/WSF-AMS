// npm test -- --runInBand tests/Zone.test.jsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ZoneManager from "../src/pages/ZoneManager.jsx";

jest.mock("../src/api/apiClient.js", () => ({
  zoneService: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
  districtService: {
    list: jest.fn(),
  },
}));

jest.mock("../src/contexts/StatsContext.jsx", () => ({
  useStats: () => ({
    refreshStats: jest.fn(),
  }),
}));

import { zoneService, districtService } from "../src/api/apiClient.js";

describe("ZoneManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    districtService.list.mockResolvedValue({
      districts: [],
    });

    zoneService.list.mockResolvedValue({
      zones: [],
      totalPages: 1,
      currentPage: 1,
      totalItems: 0,
    });
  });

  test("renders the zone search and register controls", async () => {
    render(
      <MemoryRouter>
        <ZoneManager />
      </MemoryRouter>,
    );

    expect(
      screen.getByPlaceholderText(/search zone name or headquarters/i),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /register new zone/i,
      }),
    ).toBeInTheDocument();

    await screen.findByText(/no zone elements found matching active filters/i);
  });
  test("displays existing zone data", async () => {
    zoneService.list.mockResolvedValue({
      zones: [
        {
          _id: "zone1",
          name: "Zone 1",
          headquarters: "Benin City",
          district: {
            _id: "district1",
            name: "Benin District 1",
          },
          activeCells: 10,
          dateCreated: "2026-08-10",
        },
      ],
      totalPages: 1,
      currentPage: 1,
      totalItems: 1,
    });

    render(
      <MemoryRouter>
        <ZoneManager />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Zone 1")).toBeInTheDocument();
    });

    expect(screen.getByText("Benin City")).toBeInTheDocument();
    expect(screen.getByText("Benin District 1")).toBeInTheDocument();
  });
  test("opens the register zone form", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ZoneManager />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", {
        name: /register new zone/i,
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: /register new zone/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByPlaceholderText(/e\.g\., zone c/i)).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(/airport road annex/i),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/assign parent district group linkage/i),
    ).toBeInTheDocument();
  });
  test("creates a new zone", async () => {
    const user = userEvent.setup();

    districtService.list.mockResolvedValue({
      districts: [
        {
          _id: "district1",
          name: "Benin District 1",
        },
      ],
    });

    zoneService.create.mockResolvedValue({
      _id: "zone2",
      name: "Zone 2",
      headquarters: "Lagos Road",
      district: {
        _id: "district1",
        name: "Benin District 1",
      },
    });

    zoneService.list.mockResolvedValue({
      zones: [],
      totalPages: 1,
      currentPage: 1,
      totalItems: 0,
    });

    render(
      <MemoryRouter>
        <ZoneManager />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", {
        name: /register new zone/i,
      }),
    );

    await user.type(screen.getByPlaceholderText(/e\.g\., zone c/i), "Zone 2");

    await user.type(
      screen.getByPlaceholderText(/airport road annex/i),
      "Lagos Road",
    );

    await user.click(
      screen.getByRole("button", {
        name: /select associated district/i,
      }),
    );

    await user.click(
      screen.getByRole("option", {
        name: /Benin District 1/,
      }),
    );

    await user.click(
      screen.getByRole("button", {
        name: /save configuration/i,
      }),
    );

    await waitFor(() => {
      expect(zoneService.create).toHaveBeenCalledWith({
        name: "Zone 2",
        headquarters: "Lagos Road",
        district: "district1",
      });
    });
  });
  test("opens the edit form with existing zone data", async () => {
    const user = userEvent.setup();

    zoneService.list.mockResolvedValue({
      zones: [
        {
          _id: "zone1",
          name: "Zone 1",
          headquarters: "Benin City",
          district: {
            _id: "district1",
            name: "Benin District 1",
          },
          activeCells: 10,
          dateCreated: "2026-08-10",
        },
      ],
      totalPages: 1,
      currentPage: 1,
      totalItems: 1,
    });

    districtService.list.mockResolvedValue({
      districts: [
        {
          _id: "district1",
          name: "Benin District 1",
        },
      ],
    });

    render(
      <MemoryRouter>
        <ZoneManager />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Zone 1")).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", {
        name: /actions/i,
      }),
    );

    await user.click(
      screen.getByRole("button", {
        name: /edit/i,
      }),
    );

    expect(screen.getByDisplayValue("Zone 1")).toBeInTheDocument();

    expect(screen.getByDisplayValue("Benin City")).toBeInTheDocument();
  });
  test("updates an existing zone", async () => {
    const user = userEvent.setup();

    zoneService.list.mockResolvedValue({
      zones: [
        {
          _id: "zone1",
          name: "Zone 1",
          headquarters: "Benin City",
          district: {
            _id: "district1",
            name: "Benin District 1",
          },
          activeCells: 10,
          dateCreated: "2026-08-10",
        },
      ],
      totalPages: 1,
      currentPage: 1,
      totalItems: 1,
    });

    districtService.list.mockResolvedValue({
      districts: [
        {
          _id: "district1",
          name: "Benin District 1",
        },
      ],
    });

    zoneService.update.mockResolvedValue({
      _id: "zone1",
      name: "Zone Updated",
      headquarters: "Lagos Road",
      district: "district1",
    });

    render(
      <MemoryRouter>
        <ZoneManager />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Zone 1")).toBeInTheDocument();
    });

    // Open Actions
    await user.click(
      screen.getByRole("button", {
        name: /actions/i,
      }),
    );

    // Open Edit
    await user.click(
      screen.getByRole("button", {
        name: /edit/i,
      }),
    );

    // Change Zone name
    const zoneNameInput = screen.getByDisplayValue("Zone 1");

    await user.clear(zoneNameInput);
    await user.type(zoneNameInput, "Zone Updated");

    // Change headquarters
    const headquartersInput = screen.getByDisplayValue("Benin City");

    await user.clear(headquartersInput);
    await user.type(headquartersInput, "Lagos Road");

    // Save
    await user.click(
      screen.getByRole("button", {
        name: /save configuration/i,
      }),
    );

    await waitFor(() => {
      expect(zoneService.update).toHaveBeenCalledWith("zone1", {
        name: "Zone Updated",
        headquarters: "Lagos Road",
        district: "district1",
      });
    });
  });
  test("deletes an existing zone", async () => {
    const user = userEvent.setup();

    zoneService.list.mockResolvedValue({
      zones: [
        {
          _id: "zone1",
          name: "Zone 1",
          headquarters: "Benin City",
          district: {
            _id: "district1",
            name: "Benin District 1",
          },
          activeCells: 10,
          dateCreated: "2026-08-10",
        },
      ],
      totalPages: 1,
      currentPage: 1,
      totalItems: 1,
    });

    districtService.list.mockResolvedValue({
      districts: [
        {
          _id: "district1",
          name: "Benin District 1",
        },
      ],
    });

    zoneService.remove.mockResolvedValue({
      message: "Zone deleted successfully",
    });

    render(
      <MemoryRouter>
        <ZoneManager />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Zone 1")).toBeInTheDocument();
    });

    // Open Actions menu
    await user.click(
      screen.getByRole("button", {
        name: /actions/i,
      }),
    );

    // Click Delete
    await user.click(
      screen.getByRole("button", {
        name: /delete/i,
      }),
    );

    // Confirmation modal should appear
    expect(
      screen.getByRole("button", {
        name: /yes, purge record/i,
      }),
    ).toBeInTheDocument();

    // Confirm deletion
    await user.click(
      screen.getByRole("button", {
        name: /yes, purge record/i,
      }),
    );

    await waitFor(() => {
      expect(zoneService.remove).toHaveBeenCalledWith("zone1");
    });
  });
  test("searches for a zone", async () => {
    const user = userEvent.setup();

    zoneService.list.mockResolvedValue({
      zones: [],
      totalPages: 1,
      currentPage: 1,
      totalItems: 0,
    });

    render(
      <MemoryRouter>
        <ZoneManager />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText(
      /search zone name or headquarters/i,
    );

    await user.type(searchInput, "Lagos");

    await waitFor(() => {
      expect(zoneService.list).toHaveBeenCalledWith(
        "Lagos",
        1,
        expect.any(Number),
      );
    });
  });
  test("moves to the next page", async () => {
    const user = userEvent.setup();

    zoneService.list
      .mockResolvedValueOnce({
        zones: [
          {
            _id: "zone1",
            name: "Zone 1",
            headquarters: "Benin City",
            district: {
              _id: "district1",
              name: "Benin District 1",
            },
          },
        ],
        totalPages: 2,
        currentPage: 1,
        totalItems: 2,
      })
      .mockResolvedValueOnce({
        zones: [
          {
            _id: "zone2",
            name: "Zone 2",
            headquarters: "Lagos",
            district: {
              _id: "district2",
              name: "Lagos District",
            },
          },
        ],
        totalPages: 2,
        currentPage: 2,
        totalItems: 2,
      });

    render(
      <MemoryRouter>
        <ZoneManager />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Zone 1")).toBeInTheDocument();
    });

    const nextButton = screen.getByRole("button", {
      name: /^next$/i,
    });

    expect(nextButton).not.toBeDisabled();

    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText("Zone 2")).toBeInTheDocument();
    });

    expect(zoneService.list).toHaveBeenCalledWith("", 2, expect.any(Number));
  });
});
