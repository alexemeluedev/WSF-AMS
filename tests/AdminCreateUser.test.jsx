// npm test -- --runInBand tests/AdminCreateUser.test.jsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import AdminCreateUser from "../src/pages/AdminCreateUser.jsx";

import { authService } from "../src/api/apiClient.js";

jest.mock("../src/api/apiClient.js", () => ({
  authService: {
    register: jest.fn(),
    listUsers: jest.fn(),
    list: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock("../src/contexts/StatsContext.jsx", () => ({
  useStats: () => ({
    refreshStats: jest.fn(),
  }),
}));

jest.mock("../src/contexts/AuthContext.jsx", () => ({
  useAuth: () => ({
    user: {
      id: "admin1",
      email: "admin@example.com",
      role: "admin",
    },
  }),
}));

jest.mock("../src/components/Toast.jsx", () => ({
  Toast: ({ message }) => <div>{message}</div>,
}));

describe("AdminCreateUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    authService.listUsers.mockResolvedValue({
      users: [],
    });
  });

  test("renders the admin user creation form and directory", async () => {
    render(<AdminCreateUser />);

    expect(
      screen.getByRole("heading", {
        name: /create new portal user/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/account role/i)).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /create account/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/system portal access users directory/i),
    ).toBeInTheDocument();

    expect(
      await screen.findByText(
        /no registered platform application access users found/i,
      ),
    ).toBeInTheDocument();
  });
  test("displays existing portal users", async () => {
    authService.listUsers.mockResolvedValue({
      users: [
        {
          _id: "user1",
          email: "john@example.com",
          role: "user",
        },
        {
          _id: "user2",
          email: "jane@example.com",
          role: "admin",
        },
      ],
    });

    render(<AdminCreateUser />);

    expect(await screen.findByText("john@example.com")).toBeInTheDocument();

    expect(screen.getByText("jane@example.com")).toBeInTheDocument();

    expect(screen.getByText(/role assignment: user/i)).toBeInTheDocument();

    expect(screen.getByText(/role assignment: admin/i)).toBeInTheDocument();
  });
  test("creates a new portal user", async () => {
    const user = userEvent.setup();

    authService.register.mockResolvedValue({
      user: {
        _id: "user3",
        email: "new.user@example.com",
        role: "user",
      },
    });

    render(<AdminCreateUser />);

    await user.type(
      screen.getByLabelText(/email address/i),
      "  New.User@Example.COM  ",
    );

    await user.type(screen.getByLabelText(/password/i), "secure123");

    await user.selectOptions(screen.getByLabelText(/account role/i), "user");

    await user.click(
      screen.getByRole("button", {
        name: /create account/i,
      }),
    );

    expect(authService.register).toHaveBeenCalledWith({
      email: "new.user@example.com",
      password: "secure123",
      role: "user",
    });
  });
  test("removes an existing portal user after confirmation", async () => {
    const user = userEvent.setup();

    authService.listUsers.mockResolvedValue({
      users: [
        {
          _id: "user2",
          email: "john@example.com",
          role: "user",
        },
      ],
    });

    authService.remove.mockResolvedValue({});

    window.confirm = jest.fn(() => true);

    render(<AdminCreateUser />);

    expect(await screen.findByText("john@example.com")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /remove user/i,
      }),
    );

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining("john@example.com"),
    );

    expect(authService.remove).toHaveBeenCalledWith("user2");

    expect(screen.queryByText("john@example.com")).not.toBeInTheDocument();
  });
  test("does not allow the current session user to be removed", async () => {
    authService.listUsers.mockResolvedValue({
      users: [
        {
          _id: "admin1",
          email: "admin@example.com",
          role: "admin",
        },
        {
          _id: "user2",
          email: "john@example.com",
          role: "user",
        },
      ],
    });

    render(<AdminCreateUser />);

    expect(await screen.findByText("admin@example.com")).toBeInTheDocument();

    expect(screen.getByText("Current Session")).toBeInTheDocument();

    expect(screen.getByText("john@example.com")).toBeInTheDocument();

    // Only the other user should have a Remove User button.
    expect(
      screen.getByRole("button", {
        name: /remove user/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getAllByRole("button", {
        name: /remove user/i,
      }),
    ).toHaveLength(1);
  });
});
