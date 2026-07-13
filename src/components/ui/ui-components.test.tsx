/**
 * Smoke test for atomic UI components installed in Task 1.4.
 *
 * Verifies that each component renders without throwing and that
 * key accessibility attributes (data-slot, role) are present.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./dialog";
import { Input } from "./input";
import { Label } from "./label";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "./table";

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
describe("Button", () => {
  it("renders default variant with data-slot attribute", () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole("button", { name: /click me/i });
    expect(btn).toBeInTheDocument();
    expect(btn.dataset.slot).toBe("button");
  });

  it("applies variant classes", () => {
    render(<Button variant="destructive">Delete</Button>);
    const btn = screen.getByRole("button", { name: /delete/i });
    expect(btn.className).toMatch(/destructive/);
  });

  it("applies size classes", () => {
    render(<Button size="lg">Large</Button>);
    const btn = screen.getByRole("button", { name: /large/i });
    expect(btn).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
describe("Card", () => {
  it("renders full card structure", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Account Summary</CardTitle>
          <CardDescription>Your balance overview</CardDescription>
        </CardHeader>
        <CardContent>Total: $12,450.00</CardContent>
        <CardFooter>Last updated: today</CardFooter>
      </Card>
    );

    expect(screen.getByText("Account Summary")).toBeInTheDocument();
    expect(screen.getByText("Your balance overview")).toBeInTheDocument();
    expect(screen.getByText(/Total: \$12,450\.00/)).toBeInTheDocument();
    expect(screen.getByText(/Last updated: today/)).toBeInTheDocument();
  });

  it("has data-slot attribute on Card", () => {
    const { container } = render(<Card />);
    const card = container.querySelector("[data-slot='card']");
    expect(card).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Dialog (non-modal rendering)
// ---------------------------------------------------------------------------
describe("Dialog", () => {
  it("renders trigger and content when open", () => {
    render(
      <Dialog defaultOpen>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm</DialogTitle>
            <DialogDescription>Are you sure?</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  it("dialog content carries data-slot", () => {
    render(
      <Dialog defaultOpen>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
    const content = document.querySelector("[data-slot='dialog-content']");
    expect(content).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
describe("Input", () => {
  it("renders with data-slot attribute", () => {
    render(<Input placeholder="Enter amount" />);
    const input = screen.getByPlaceholderText("Enter amount");
    expect(input).toBeInTheDocument();
    expect(input.dataset.slot).toBe("input");
  });

  it("accepts type prop", () => {
    render(<Input type="number" placeholder="0.00" />);
    const input = screen.getByPlaceholderText("0.00");
    expect(input).toHaveAttribute("type", "number");
  });
});

// ---------------------------------------------------------------------------
// Label
// ---------------------------------------------------------------------------
describe("Label", () => {
  it("renders with data-slot", () => {
    render(<Label>Transaction Name</Label>);
    const label = screen.getByText("Transaction Name");
    expect(label).toBeInTheDocument();
    expect(label.dataset.slot).toBe("label");
  });
});

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------
describe("Table", () => {
  it("renders complete table structure", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>2026-07-12</TableCell>
            <TableCell>Food</TableCell>
            <TableCell>-$25.50</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
    expect(screen.getByText("2026-07-12")).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("-$25.50")).toBeInTheDocument();
  });

  it("table container carries data-slot", () => {
    const { container } = render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Col</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    );
    expect(container.querySelector("[data-slot='table-container']")).toBeInTheDocument();
    expect(container.querySelector("[data-slot='table']")).toBeInTheDocument();
  });
});