// npm test -- --runInBand tests/CellMemberReclassifier.test.jsx
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CellMemberReclassifier } from "../src/pages/CellMemberReclassifier.jsx";
import { cellService, memberService } from "../src/api/apiClient.js";

jest.mock("../src/api/apiClient.js", () => ({
  cellService: {
    list: jest.fn().mockResolvedValue([]),
  },
  memberService: {
    list: jest.fn().mockResolvedValue([]),
    update: jest.fn(),
  },
}));

jest.mock("../src/components/Dropdown.jsx", () => ({
  __esModule: true,
  default: ({ value, placeholder }) => (
    <select value={value} onChange={() => {}}>
      <option value="">{placeholder}</option>
    </select>
  ),
}));

describe("CellMemberReclassifier", () => {
  test("renders the reclassification controls", async () => {
    render(
      <MemoryRouter>
        <CellMemberReclassifier />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/zonal membership reclassification hub/i),
    ).toBeInTheDocument();

    expect(screen.getByText(/from source cell/i)).toBeInTheDocument();

    expect(screen.getByText(/to target cell destination/i)).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(
        /search profiles inside source pool by name or role/i,
      ),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /transfer selected \(0\)/i,
        }),
      ).toBeInTheDocument();
    });
  });
  test("displays members belonging to the selected source cell", async () => {
    cellService.list.mockResolvedValue([
      { _id: "cell1", name: "Cell Alpha" },
      { _id: "cell2", name: "Cell Beta" },
    ]);

    memberService.list.mockResolvedValue([
      {
        _id: "member1",
        name: "John Doe",
        role: "Member",
        cell: "cell1",
        joined: "2025-01-01",
      },
      {
        _id: "member2",
        name: "Jane Smith",
        role: "Cell Leader",
        cell: "cell2",
        joined: "2025-02-01",
      },
    ]);

    render(
      <MemoryRouter>
        <CellMemberReclassifier />
      </MemoryRouter>,
    );

    expect(await screen.findByText("John Doe")).toBeInTheDocument();

    expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
  });
  test("selects a member for transfer", async () => {
    cellService.list.mockResolvedValue([
      { _id: "cell1", name: "Cell Alpha" },
      { _id: "cell2", name: "Cell Beta" },
    ]);

    memberService.list.mockResolvedValue([
      {
        _id: "member1",
        name: "John Doe",
        role: "Member",
        cell: "cell1",
        joined: "2025-01-01",
      },
    ]);

    render(
      <MemoryRouter>
        <CellMemberReclassifier />
      </MemoryRouter>,
    );

    const member = await screen.findByText("John Doe");

    expect(
      screen.getByRole("button", {
        name: /transfer selected \(0\)/i,
      }),
    ).toBeInTheDocument();

    fireEvent.pointerDown(member);

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /transfer selected \(1\)/i,
        }),
      ).toBeInTheDocument();
    });
  });
  test("transfers selected member to the target cell", async () => {
    cellService.list.mockResolvedValue([
      { _id: "cell1", name: "Cell Alpha" },
      { _id: "cell2", name: "Cell Beta" },
    ]);

    memberService.list
      .mockResolvedValueOnce([
        {
          _id: "member1",
          name: "John Doe",
          role: "Member",
          cell: "cell1",
          joined: "2025-01-01",
        },
      ])
      .mockResolvedValueOnce([
        {
          _id: "member1",
          name: "John Doe",
          role: "Member",
          cell: "cell2",
          joined: "2025-01-01",
        },
      ]);

    memberService.update.mockResolvedValue({
      _id: "member1",
      name: "John Doe",
      cell: "cell2",
    });

    render(
      <MemoryRouter>
        <CellMemberReclassifier />
      </MemoryRouter>,
    );

    const member = await screen.findByText("John Doe");

    fireEvent.pointerDown(member);

    const transferButton = await screen.findByRole("button", {
      name: /transfer selected \(1\)/i,
    });

    fireEvent.click(transferButton);

    await waitFor(() => {
      expect(memberService.update).toHaveBeenCalledWith(
        "member1",
        expect.objectContaining({
          cell: "cell2",
        }),
      );
    });
  });
});
