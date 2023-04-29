import { User } from "firebase/auth";
import { render, screen, fireEvent } from "@testing-library/react";
import Navbar from "./Navbar";

describe("Navbar", () => {
  it("should render the navigation bar", () => {
    const currUser: User | null | undefined = null;
    const userLogin = jest.fn();
    const userLogout = jest.fn();
    render(
      <Navbar currentUser={currUser} login={userLogin} logout={userLogout} />
    );
    expect(screen.getByText("High Chat")).toBeInTheDocument();
  });
  it("renders the log in button when no user is logged in", () => {
    const currentUser: User | null | undefined = null;
    const login = jest.fn();
    const logout = jest.fn();
    render(<Navbar currentUser={currentUser} login={login} logout={logout} />);
    expect(screen.getByText("Log In")).toBeInTheDocument();
  });

  it("renders the log out button when a user is logged in", () => {
    const currentUser: User | null | undefined = { uid: "user123" } as User;
    const login = jest.fn();
    const logout = jest.fn();
    render(<Navbar currentUser={currentUser} login={login} logout={logout} />);
    expect(screen.getByText("Log Out")).toBeInTheDocument();
  });

  it("calls the login function when the log in button is clicked", () => {
    const currentUser: User | null | undefined = null;
    const login = jest.fn();
    const logout = jest.fn();
    render(<Navbar currentUser={currentUser} login={login} logout={logout} />);
    fireEvent.click(screen.getByText("Log In"));
    expect(login).toHaveBeenCalledTimes(1);
  });

  it("calls the logout function when the log out button is clicked", () => {
    const currentUser: User | null | undefined = { uid: "user123" } as User;
    const login = jest.fn();
    const logout = jest.fn();
    render(<Navbar currentUser={currentUser} login={login} logout={logout} />);
    fireEvent.click(screen.getByText("Log Out"));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
