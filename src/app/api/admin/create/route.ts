import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/db";
import bcrypt from "bcryptjs";

// This is a one-time setup endpoint
// After creating your admin user, you should delete this file or add authentication
export async function POST(req: NextRequest) {
  try {
    const { username, password, secret } = await req.json();

    // Simple security check - you should set this in your environment
    if (secret !== "create-admin-secret-2025") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!username || !password) {
      return NextResponse.json(
        { message: "Username and password are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await adminDb.getByUsername(username);
    if (existingUser) {
      return NextResponse.json(
        { message: `User '${username}' already exists` },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    await adminDb.create(username, hashedPassword);

    return NextResponse.json(
      {
        message: "Admin user created successfully",
        username,
        warning: "Please delete /api/admin/create route after setup",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating admin:", error);
    return NextResponse.json(
      { message: "Error creating admin user", error },
      { status: 500 }
    );
  }
}

