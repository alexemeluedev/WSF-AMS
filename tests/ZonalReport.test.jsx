import { render, screen, waitFor } from "@testing-library/react";
import ZonalReport from "../src/pages/ZonalReport.jsx";
import { attendanceService, cellService } from "../src/api/apiClient";

jest.mock("../src/api/apiClient", () => ({
  attendanceService: {
    summary: jest.fn(),
  },
  cellService: {
    list: jest.fn(),
  },
}));

describe("ZonalReport", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    cellService.list.mockResolvedValue({
      cells: [],
    });

    attendanceService.summary.mockResolvedValue({
      summaries: [],
    });
  });

  test("renders the zonal summary report controls", async () => {
    render(<ZonalReport />);

    expect(
      screen.getByText(/specialized zonal summary report matrix/i),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/filter report calendar date/i),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /print matrix report/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByText(/total present/i)).toBeInTheDocument();

    expect(screen.getByText(/total absent/i)).toBeInTheDocument();

    expect(screen.getByText(/avg attendance/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(cellService.list).toHaveBeenCalledTimes(1);
      expect(attendanceService.summary).toHaveBeenCalledTimes(1);
    });
  });
  test("displays attendance metrics for each cell", async () => {
    cellService.list.mockResolvedValue({
      cells: [
        {
          _id: "cell1",
          name: "Cell Alpha",
        },
        {
          _id: "cell2",
          name: "Cell Beta",
        },
      ],
    });

    attendanceService.summary.mockResolvedValue({
      summaries: [
        {
          cellName: "Cell Alpha",
          date: new Date().toISOString().split("T")[0],
          totalPresent: 20,
          totalAbsent: 5,
        },
        {
          cellName: "Cell Beta",
          date: new Date().toISOString().split("T")[0],
          totalPresent: 15,
          totalAbsent: 10,
        },
      ],
    });

    render(<ZonalReport />);

    expect(await screen.findByText("Cell Alpha")).toBeInTheDocument();

    expect(screen.getByText("Cell Beta")).toBeInTheDocument();

    expect(screen.getAllByText("Present:")).toHaveLength(2);
    expect(screen.getAllByText("Absent:")).toHaveLength(2);

    const alpha = screen.getByText("Cell Alpha").closest("div.border");
    const beta = screen.getByText("Cell Beta").closest("div.border");

    expect(alpha).toHaveTextContent("Present:");
    expect(alpha).toHaveTextContent("20");
    expect(alpha).toHaveTextContent("5");

    expect(beta).toHaveTextContent("Present:");
    expect(beta).toHaveTextContent("15");
    expect(beta).toHaveTextContent("10");
  });
  test("calculates attendance rate for each cell", async () => {
    cellService.list.mockResolvedValue({
      cells: [
        {
          _id: "cell1",
          name: "Cell Alpha",
        },
        {
          _id: "cell2",
          name: "Cell Beta",
        },
      ],
    });

    attendanceService.summary.mockResolvedValue({
      summaries: [
        {
          cellName: "Cell Alpha",
          date: new Date().toISOString().split("T")[0],
          totalPresent: 20,
          totalAbsent: 5,
        },
        {
          cellName: "Cell Beta",
          date: new Date().toISOString().split("T")[0],
          totalPresent: 15,
          totalAbsent: 10,
        },
      ],
    });

    render(<ZonalReport />);

    const alpha = await screen.findByText("Cell Alpha");
    const beta = screen.getByText("Cell Beta");

    const alphaCard = alpha.closest("div.border");
    const betaCard = beta.closest("div.border");

    // Cell Alpha: 20 / (20 + 5) = 80%
    expect(alphaCard).toHaveTextContent("80%");

    // Cell Beta: 15 / (15 + 10) = 60%
    expect(betaCard).toHaveTextContent("60%");
  });
});
