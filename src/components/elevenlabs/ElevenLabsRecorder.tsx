"use client";
import { useScribe } from "@elevenlabs/react";
import { useState } from "react";

function ElevenLabsRecorder() {
  const [committedTranscripts, setCommittedTranscripts] = useState<
    Array<{ id: string; text: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    languageCode: "en",
    includeTimestamps: false,
    microphone: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    onCommittedTranscript: (data) => {
      console.log("Committed:", data.text);
      setCommittedTranscripts((prev) => [
        ...prev,
        { id: Date.now().toString(), text: data.text },
      ]);
    },
    onError: (error) => {
      console.error("Scribe error:", error);
      setError(
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "An error occurred"
      );
    },
  });

  const handleStart = async () => {
    try {
      setError(null);
      // Clear previous transcripts when starting a new session
      setCommittedTranscripts([]);

      // Fetch a single use token from the server
      const response = await fetch("/api/elevenlabs/token", {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get token");
      }

      const { token } = await response.json();
      console.log("Token received, connecting...");

      await scribe.connect({
        token,
        includeTimestamps: true,
        languageCode: "en",
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      console.log("Connected successfully");
    } catch (err) {
      console.error("Error starting recording:", err);
      setError(
        err instanceof Error ? err.message : "Failed to start recording"
      );
    }
  };

  const handleStopAndCommit = async () => {
    try {
      // Commit the current partial transcript first
      if (scribe.partialTranscript) {
        console.log("Committing current transcript:", scribe.partialTranscript);
        await scribe.commit();
        // Wait a bit for the commit callback to fire
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      // Then disconnect
      scribe.disconnect();
      console.log("Disconnected");
    } catch (err) {
      console.error("Error during stop and commit:", err);
      // Still disconnect even if commit fails
      scribe.disconnect();
    }
  };

  return (
    <div className="p-4 space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 p-2 rounded">
          Error: {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleStart}
          disabled={scribe.isConnected}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Start Recording
        </button>
        <button
          onClick={handleStopAndCommit}
          disabled={!scribe.isConnected}
          className="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50"
        >
          Stop
        </button>
      </div>

      {/* {scribe.partialTranscript && (
        <div className="p-2 bg-gray-800 rounded">
          <p className="text-sm text-gray-400">Live:</p>
          <p className="text-white">{scribe.partialTranscript}</p>
        </div>
      )} */}

      <div className="p-2 bg-gray-800 rounded">
        <p className="text-sm text-gray-400 mb-2">
          Final Transcripts ({committedTranscripts.length}):
        </p>
        {committedTranscripts.length === 0 ? (
          <p className="text-gray-500 italic">
            No committed transcripts yet. Speak in complete sentences with
            pauses.
          </p>
        ) : (
          committedTranscripts.map((t) => (
            <p key={t.id} className="text-white mb-1">
              {t.text}
            </p>
          ))
        )}
      </div>
    </div>
  );
}

export default ElevenLabsRecorder;
