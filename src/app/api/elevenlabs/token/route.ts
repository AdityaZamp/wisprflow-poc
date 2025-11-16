import { NextResponse } from "next/server";

export async function POST() {
  try {
    const apiKey = process.env.NEXT_ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    // Create a single-use token for ElevenLabs Realtime Scribe
    const response = await fetch(
      "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error?.message || "Failed to create token" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ token: data.token });
  } catch (error) {
    console.error("Error getting ElevenLabs token:", error);
    return NextResponse.json({ error: "Failed to get token" }, { status: 500 });
  }
}
