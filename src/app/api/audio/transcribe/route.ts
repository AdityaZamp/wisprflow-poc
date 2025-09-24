import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audio, language, context } = body;

    if (!audio) {
      return NextResponse.json(
        { error: "Audio data is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_WISPRFLOW_ACCESS_TOKEN;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://platform-api.wisprflow.ai/api/v1/dash/api",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          audio,
          language: language || "en",
          context: context || {
            app: {
              name: "WisprFlow POC",
              type: "ai",
            },
            dictionary_context: [],
            user_identifier: "john_doe_1",
            user_first_name: "John",
            user_last_name: "Doe",
            textbox_contents: {
              before_text: "",
              selected_text: "",
              after_text: "",
            },
            screenshot: null,
            content_text: null,
            content_html: null,
            conversation: {
              id: "",
              participants: [],
              messages: [],
            },
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in audio transcription API:", error);
    return NextResponse.json(
      { error: "Failed to process audio" },
      { status: 500 }
    );
  }
}
