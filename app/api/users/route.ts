import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Example API route
  const users = [
    { id: "1", name: "John Doe", email: "john@example.com" },
    { id: "2", name: "Jane Smith", email: "jane@example.com" },
  ];

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Example: Create new user
  const newUser = {
    id: Date.now().toString(),
    ...body,
  };

  return NextResponse.json(newUser, { status: 201 });
}
