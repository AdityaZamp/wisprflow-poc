import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.NEXT_WISPRFLOW_ACCESS_TOKEN;

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    // Return the token for WebSocket connection
    return NextResponse.json({ token: apiKey });
  } catch (error) {
    console.error("Error getting WebSocket token:", error);
    return NextResponse.json({ error: "Failed to get token" }, { status: 500 });
  }
}
