// npm test -- --runInBand tests/District.test.jsx

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

import DistrictManager from "../src/pages/DistrictManager.jsx";
import { districtService, zoneService } from "../src/api/apiClient.js";

const mockRefreshStats = jest.fn();

jest.mock("../src/api/apiClient.js", () => ({
  districtService: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
  zoneService: {
    list: jest.fn(),
  },
}));

jest.mock("../src/contexts/StatsContext.jsx", () => ({
  useStats: () => ({
    refreshStats: mockRefreshStats,
  }),
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("DistrictManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    zoneService.list.mockResolvedValue([]);

    districtService.list.mockResolvedValue({
      districts: [],
    });
  });

  test("renders the district search and register controls", async () => {
    // render(<DistrictManager />);
    render(
      <MemoryRouter>
        <DistrictManager />
      </MemoryRouter>,
    );

    expect(
      screen.getByPlaceholderText(/search district name or code/i),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /register district/i,
      }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(districtService.list).toHaveBeenCalled();
    });
  });
  test("displays existing district data", async () => {
    districtService.list.mockResolvedValue({
      districts: [
        {
          _id: "district1",
          name: "Benin District 1",
          code: "DST-001",
          activeCells: 8,
          dateCreated: "2026-08-10",
        },
      ],
    });

    render(
      <MemoryRouter>
        <DistrictManager />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Benin District 1")).toBeInTheDocument();
    expect(screen.getByText("DST-001")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("2026-08-10")).toBeInTheDocument();
  });
  test("opens the register district form", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <DistrictManager />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", {
        name: /register district/i,
      }),
    );

    expect(screen.getByText("➕ Register New District")).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(/benin district 1/i),
    ).toBeInTheDocument();

    expect(screen.getByPlaceholderText(/dst-001/i)).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /save configuration/i,
      }),
    ).toBeInTheDocument();
  });
  test("creates a new district", async () => {
    const user = userEvent.setup();

    districtService.create.mockResolvedValue({
      district: {
        _id: "district2",
        name: "Benin District 2",
        code: "DST-002",
      },
    });

    render(
      <MemoryRouter>
        <DistrictManager />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", {
        name: /register district/i,
      }),
    );

    await user.type(
      screen.getByPlaceholderText(/benin district 1/i),
      "Benin District 2",
    );

    await user.type(screen.getByPlaceholderText(/dst-001/i), "DST-002");

    await user.click(
      screen.getByRole("button", {
        name: /save configuration/i,
      }),
    );

    await waitFor(() => {
      expect(districtService.create).toHaveBeenCalledWith({
        name: "Benin District 2",
        code: "DST-002",
      });
    });

    expect(mockRefreshStats).toHaveBeenCalled();
  });
  test("opens the edit form with existing district data", async () => {
    const user = userEvent.setup();

    districtService.list.mockResolvedValue({
      districts: [
        {
          _id: "district1",
          name: "Benin District 1",
          code: "DST-001",
          activeCells: 8,
          dateCreated: "2026-08-10",
        },
      ],
    });

    render(
      <MemoryRouter>
        <DistrictManager />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Benin District 1")).toBeInTheDocument();
    });

    const actionButton = screen.getByRole("button", {
      name: /actions/i,
    });

    await user.click(actionButton);

    await user.click(
      screen.getByRole("button", {
        name: /edit/i,
      }),
    );

    expect(screen.getByText("📝 Modify District Profile")).toBeInTheDocument();

    expect(screen.getByDisplayValue("Benin District 1")).toBeInTheDocument();

    expect(screen.getByDisplayValue("DST-001")).toBeInTheDocument();
  });
  test("updates an existing district", async () => {
    const user = userEvent.setup();

    districtService.list.mockResolvedValue({
      districts: [
        {
          _id: "district1",
          name: "Benin District 1",
          code: "DST-001",
          activeCells: 8,
          dateCreated: "2026-08-10",
        },
      ],
    });

    districtService.update.mockResolvedValue({
      district: {
        _id: "district1",
        name: "Benin District Updated",
        code: "DST-010",
      },
    });

    render(
      <MemoryRouter>
        <DistrictManager />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Benin District 1")).toBeInTheDocument();
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

    const nameInput = screen.getByDisplayValue("Benin District 1");
    const codeInput = screen.getByDisplayValue("DST-001");

    await user.clear(nameInput);
    await user.type(nameInput, "Benin District Updated");

    await user.clear(codeInput);
    await user.type(codeInput, "DST-010");

    await user.click(
      screen.getByRole("button", {
        name: /save configuration/i,
      }),
    );

    await waitFor(() => {
      expect(districtService.update).toHaveBeenCalledWith("district1", {
        name: "Benin District Updated",
        code: "DST-010",
      });
    });

    expect(mockRefreshStats).toHaveBeenCalled();
  });
  test("deletes an existing district", async () => {
    const user = userEvent.setup();

    districtService.list.mockResolvedValue({
      districts: [
        {
          _id: "district1",
          name: "Benin District 1",
          code: "DST-001",
          activeCells: 8,
          dateCreated: "2026-08-10",
        },
      ],
    });

    districtService.remove.mockResolvedValue({
      message: "District deleted successfully",
    });

    render(
      <MemoryRouter>
        <DistrictManager />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Benin District 1")).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", {
        name: /actions/i,
      }),
    );

    await user.click(
      screen.getByRole("button", {
        name: /delete/i,
      }),
    );

    expect(screen.getByText(/delete district/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /yes, purge record/i,
      }),
    );

    await waitFor(() => {
      expect(districtService.remove).toHaveBeenCalledWith("district1");
    });

    expect(mockRefreshStats).toHaveBeenCalled();
  });
  test("searches for a district", async () => {
    const user = userEvent.setup();

    districtService.list
      .mockResolvedValueOnce({
        districts: [
          {
            _id: "district1",
            name: "Benin District 1",
            code: "DST-001",
            activeCells: 8,
            dateCreated: "2026-08-10",
          },
          {
            _id: "district2",
            name: "Lagos District",
            code: "DST-002",
            activeCells: 5,
            dateCreated: "2026-08-11",
          },
        ],
      })
      .mockResolvedValue({
        districts: [
          {
            _id: "district1",
            name: "Benin District 1",
            code: "DST-001",
            activeCells: 8,
            dateCreated: "2026-08-10",
          },
        ],
      });

    render(
      <MemoryRouter>
        <DistrictManager />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Benin District 1")).toBeInTheDocument();
      expect(screen.getByText("Lagos District")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      /search district name or code/i,
    );

    await user.type(searchInput, "Benin");

    await waitFor(() => {
      expect(districtService.list).toHaveBeenCalledWith("Benin");
    });
  });
  test("moves to the next page", async () => {
    const user = userEvent.setup();

    districtService.list.mockResolvedValue({
      districts: [
        {
          _id: "district1",
          name: "District 1",
          code: "DST-001",
          activeCells: 8,
          dateCreated: "2026-08-01",
        },
        {
          _id: "district2",
          name: "District 2",
          code: "DST-002",
          activeCells: 7,
          dateCreated: "2026-08-02",
        },
        {
          _id: "district3",
          name: "District 3",
          code: "DST-003",
          activeCells: 6,
          dateCreated: "2026-08-03",
        },
        {
          _id: "district4",
          name: "District 4",
          code: "DST-004",
          activeCells: 5,
          dateCreated: "2026-08-04",
        },
        {
          _id: "district5",
          name: "District 5",
          code: "DST-005",
          activeCells: 4,
          dateCreated: "2026-08-05",
        },
        {
          _id: "district6",
          name: "District 6",
          code: "DST-006",
          activeCells: 3,
          dateCreated: "2026-08-06",
        },
      ],
    });

    render(
      <MemoryRouter>
        <DistrictManager />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("District 1")).toBeInTheDocument();
    });

    const perPageSelect = screen.getByRole("combobox");

    await user.selectOptions(perPageSelect, "5");

    expect(screen.getByText("District 5")).toBeInTheDocument();
    expect(screen.queryByText("District 6")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /next/i,
      }),
    );

    expect(screen.getByText("District 6")).toBeInTheDocument();
    expect(screen.queryByText("District 1")).not.toBeInTheDocument();
  });
  test("changes the number of districts displayed per page", async () => {
    const user = userEvent.setup();

    districtService.list.mockResolvedValue({
      districts: [
        {
          _id: "district1",
          name: "District 1",
          code: "DST-001",
          activeCells: 8,
          dateCreated: "2026-08-01",
        },
        {
          _id: "district2",
          name: "District 2",
          code: "DST-002",
          activeCells: 7,
          dateCreated: "2026-08-02",
        },
        {
          _id: "district3",
          name: "District 3",
          code: "DST-003",
          activeCells: 6,
          dateCreated: "2026-08-03",
        },
        {
          _id: "district4",
          name: "District 4",
          code: "DST-004",
          activeCells: 5,
          dateCreated: "2026-08-04",
        },
        {
          _id: "district5",
          name: "District 5",
          code: "DST-005",
          activeCells: 4,
          dateCreated: "2026-08-05",
        },
        {
          _id: "district6",
          name: "District 6",
          code: "DST-006",
          activeCells: 3,
          dateCreated: "2026-08-06",
        },
      ],
    });

    render(
      <MemoryRouter>
        <DistrictManager />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("District 1")).toBeInTheDocument();
    });

    // Default is 5 records per page.
    expect(screen.getByText("District 5")).toBeInTheDocument();
    expect(screen.queryByText("District 6")).not.toBeInTheDocument();

    const perPageSelect = screen.getByRole("combobox");

    await user.selectOptions(perPageSelect, "10");

    expect(screen.getByText("District 6")).toBeInTheDocument();
  });
});
