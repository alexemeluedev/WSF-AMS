// npm test -- Home.test.jsx --runInBand

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { CustomTable } from "../src/components/CustomTable";
import Home from "../src/pages/Home.jsx";
import { memberService } from "../src/api/apiClient.js";

jest.mock("../src/api/apiClient.js", () => ({
  memberService: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock("../src/contexts/AuthContext.jsx", () => ({
  useAuth: () => ({
    user: {
      id: "user123",
      email: "admin@example.com",
    },
  }),
}));

jest.mock("../src/contexts/StatsContext.jsx", () => ({
  useStats: () => ({
    refreshStats: jest.fn(),
  }),
}));

jest.mock("../src/components/CustomTable", () => ({
  CustomTable: jest.fn(({ rows, onRowClick }) => (
    <div>
      Member Table
      {rows?.map((row) => (
        <button key={row.id} type="button" onClick={() => onRowClick(row)}>
          Edit {row.cells.name}
        </button>
      ))}
    </div>
  )),
}));

jest.mock("../src/components/Toast", () => ({
  Toast: () => <div>Toast</div>,
}));

jest.mock("../src/components/StatusBadge", () => ({
  StatusBadge: ({ status }) => <span>{status}</span>,
}));

jest.mock("../src/components/MemberModal", () => ({
  MemberModal: ({ isOpen, onSave, initialData }) =>
    isOpen ? (
      <div>
        Member Modal
        {initialData && (
          <div>
            <span>Editing: {initialData.raw?.name}</span>
            <span>Phone: {initialData.raw?.phone}</span>
          </div>
        )}
        <button
          type="button"
          onClick={() =>
            onSave({
              id: initialData ? initialData.id : null,
              cells: {
                name: "John Doe",
                phone: "08012345678",
                cell: "cell123",
                gender: "Male",
                status: "Active",
              },
            })
          }
        >
          Save Member
        </button>
      </div>
    ) : null,
}));

jest.mock("../src/components/ConfirmationDialog", () => ({
  ConfirmationDialog: () => <div>Confirmation Dialog</div>,
}));

describe("Home Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    memberService.list.mockResolvedValue({
      members: [],
    });
  });

  test("renders the home page", async () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        name: /winners cell register/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/find members & regional records/i),
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/search directory/i)).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /register member/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /find cell scope/i,
      }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(memberService.list).toHaveBeenCalledTimes(1);
    });
  });

  test("passes matching member to the table when searching", async () => {
    memberService.list.mockResolvedValue({
      members: [
        {
          _id: "member1",
          name: "John Doe",
          phone: "08012345678",
          cell: {
            name: "Grace Cell",
            zone: "Zone 1",
          },
          gender: "Male",
          status: "Active",
        },
        {
          _id: "member2",
          name: "Mary Smith",
          phone: "08087654321",
          cell: {
            name: "Faith Cell",
            zone: "Zone 2",
          },
          gender: "Female",
          status: "Active",
        },
      ],
    });

    const user = userEvent.setup();

    render(<Home />);

    await user.type(screen.getByLabelText(/search directory/i), "John");

    await waitFor(() => {
      expect(CustomTable).toHaveBeenCalled();
    });

    const tableProps = CustomTable.mock.calls.at(-1)[0];

    expect(tableProps.rows).toHaveLength(1);
    expect(tableProps.rows[0].cells.name).toBe("John Doe");
    expect(tableProps.rows[0].cells.cell).toBe("Grace Cell");
    expect(tableProps.rows[0].cells.status).toBe("Active");
  });

  test("opens the registration modal when Register Member is clicked", async () => {
    const user = userEvent.setup();

    render(<Home />);

    expect(screen.queryByText("Member Modal")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /register member/i,
      }),
    );

    expect(screen.getByText("Member Modal")).toBeInTheDocument();
  });

  test("creates a new member when the registration form is saved", async () => {
    memberService.create.mockResolvedValue({
      member: {
        _id: "member1",
        name: "John Doe",
        phone: "08012345678",
        cell: "cell123",
        gender: "Male",
        status: "Active",
      },
    });

    const user = userEvent.setup();

    render(<Home />);

    await user.click(
      screen.getByRole("button", {
        name: /register member/i,
      }),
    );

    await user.click(
      screen.getByRole("button", {
        name: /save member/i,
      }),
    );

    await waitFor(() => {
      expect(memberService.create).toHaveBeenCalledWith({
        name: "John Doe",
        phone: "08012345678",
        cell: "cell123",
        gender: "Male",
        status: "Active",
      });
    });
  });

  test("opens the member modal with existing data when editing", async () => {
    memberService.list.mockResolvedValue({
      members: [
        {
          _id: "member1",
          name: "John Doe",
          phone: "08012345678",
          cell: {
            _id: "cell123",
            name: "Grace Cell",
            zone: "Zone 1",
          },
          gender: "Male",
          status: "Active",
        },
      ],
    });

    const user = userEvent.setup();

    render(<Home />);

    await user.type(screen.getByLabelText(/search directory/i), "John");

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /edit john doe/i,
        }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", {
        name: /edit john doe/i,
      }),
    );

    expect(screen.getByText("Member Modal")).toBeInTheDocument();
  });

  test("passes the existing member data to the edit modal", async () => {
    memberService.list.mockResolvedValue({
      members: [
        {
          _id: "member1",
          name: "John Doe",
          phone: "08012345678",
          cell: {
            _id: "cell123",
            name: "Grace Cell",
            zone: "Zone 1",
          },
          gender: "Male",
          status: "Active",
        },
      ],
    });

    const user = userEvent.setup();

    render(<Home />);

    await user.type(screen.getByLabelText(/search directory/i), "John");

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /edit john doe/i,
        }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", {
        name: /edit john doe/i,
      }),
    );

    expect(screen.getByText("Editing: John Doe")).toBeInTheDocument();

    expect(screen.getByText("Phone: 08012345678")).toBeInTheDocument();
  });
});
