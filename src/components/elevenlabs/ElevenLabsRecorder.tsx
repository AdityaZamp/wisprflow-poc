"use client";
import AudioVisualizer from "@/components/ui/audio-visualizer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useScribe } from "@elevenlabs/react";
import { Check, Loader2, Mic, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  text: string;
  timestamp: Date;
}

function ElevenLabsRecorder() {
  const [committedTranscripts, setCommittedTranscripts] = useState<
    Array<{ id: string; text: string }>
  >([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "An error occurred";
      setError(errorMessage);
      setStatus("Error");
      setIsRecording(false);
      setMediaStream(null);
      scribe.disconnect();
      toast.error("Recording Error", {
        description: errorMessage,
        duration: 6000,
        style: {
          background: "#1a1a1a",
          border: "1px solid #ef4444",
          color: "#ffffff",
        },
      });
    },
    onAuthError: (error) => {
      console.error("Scribe error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "An error occurred";
      setError(errorMessage);
      setStatus("Error");
      setIsRecording(false);
      setMediaStream(null);
      scribe.disconnect();
      toast.error("Authentication Error", {
        description: errorMessage,
        duration: 6000,
        style: {
          background: "#1a1a1a",
          border: "1px solid #ef4444",
          color: "#ffffff",
        },
      });
    },
    onQuotaExceededError: (error) => {
      console.error("Scribe error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "An error occurred";
      setError(errorMessage);
      setStatus("Error");
      setIsRecording(false);
      setMediaStream(null);
      scribe.disconnect();
      console.log("Quota exceeded error:", error);
      toast.error("Quota Exceeded Error", {
        description: errorMessage,
        duration: 6000,
        style: {
          background: "#1a1a1a",
          border: "1px solid #ef4444",
          color: "#ffffff",
        },
      });
    },
  });

  // Cleanup media stream on unmount
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [mediaStream]);

  // Update current text from committed transcripts only
  useEffect(() => {
    const committedText = committedTranscripts.map((t) => t.text).join(" ");
    setCurrentText(committedText);
  }, [committedTranscripts]);

  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to get the correct scrollHeight
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      // Clamp height to container's max-height (200px) to prevent overflow
      const maxHeight = 200;
      const newHeight = Math.min(scrollHeight, maxHeight);
      textareaRef.current.style.height = `${newHeight}px`;
      // Ensure textarea doesn't overflow - container handles scrolling
      textareaRef.current.style.overflow = "hidden";
    }
  }, [currentText]);

  const handleStartRecording = async () => {
    try {
      setError(null);
      setStatus("Connecting...");
      setCurrentText("");
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

      await scribe.connect({
        token,
        includeTimestamps: true,
        languageCode: "en",
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      setIsRecording(true);
      setStatus("Recording");

      // Get the microphone stream for volume monitoring after connection
      // Note: This creates a separate stream for volume monitoring
      // since ElevenLabs manages its own stream internally
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        console.log("Microphone stream obtained for volume monitoring");
        setMediaStream(stream);
      } catch (err) {
        console.error(
          "Could not access microphone for volume monitoring:",
          err
        );
        // Don't fail the recording if volume monitoring fails
      }

      toast.info("Connecting...", {
        description: "Authenticating your session",
        duration: 2000,
        style: {
          background: "#1a1a1a",
          border: "1px solid #3b82f6",
          color: "#ffffff",
        },
      });
    } catch (err) {
      console.error("Error starting recording:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to start recording";
      setError(errorMessage);
      setStatus("Error");
      toast.error("Recording Error", {
        description: errorMessage,
        duration: 6000,
        style: {
          background: "#1a1a1a",
          border: "1px solid #ef4444",
          color: "#ffffff",
        },
      });
    }
  };

  const handleStopRecording = async () => {
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

      // Stop media stream
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        setMediaStream(null);
      }

      setIsRecording(false);
      setStatus("Ready");

      toast.info("Recording stopped", {
        description: "Processing audio...",
        duration: 2000,
        style: {
          background: "#1a1a1a",
          border: "1px solid #f59e0b",
          color: "#ffffff",
        },
      });
    } catch (err) {
      console.error("Error during stop and commit:", err);
      // Still disconnect even if commit fails
      scribe.disconnect();
      // Stop media stream
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        setMediaStream(null);
      }
      setIsRecording(false);
      setStatus("Ready");
    }
  };

  const handleAccept = () => {
    if (currentText.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        text: currentText.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, newMessage]);
      setCurrentText("");
      setCommittedTranscripts([]);

      toast.success("Message added", {
        description: "Text has been added to chat",
        duration: 2000,
        style: {
          background: "#1a1a1a",
          border: "1px solid #22c55e",
          color: "#ffffff",
        },
      });
    }
  };

  const handleReject = () => {
    setCurrentText("");
    setCommittedTranscripts([]);

    toast.info("Recording rejected", {
      description: "Text has been cleared",
      duration: 2000,
      style: {
        background: "#1a1a1a",
        border: "1px solid #6b7280",
        color: "#ffffff",
      },
    });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentText(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (currentText.trim()) {
        handleAccept();
      }
    }
  };

  return (
    <div className="h-full bg-[#212121] flex flex-col">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="flex justify-end">
            <Card className="bg-[#303030] text-white gap-2 px-4 py-2 max-w-xs lg:max-w-md">
              <p className="text-sm">{message.text}</p>
              <p className="text-xs text-gray-400">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </Card>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-[#303030] rounded-lg shadow-sm overflow-hidden">
            <div className="flex items-center p-3 gap-x-2 min-w-0">
              {!isRecording && (
                <div className="flex-1 min-h-[40px] max-h-[200px] overflow-y-auto overflow-x-hidden ml-3 min-w-0">
                  <Textarea
                    ref={textareaRef}
                    value={currentText}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything"
                    className="border-0 shadow-none resize-none text-lg leading-6 focus-visible:ring-0 min-h-[40px] py-2 px-0 text-white placeholder-gray-400 w-full"
                    rows={1}
                    disabled={isRecording}
                    style={{
                      wordWrap: "break-word",
                      overflowWrap: "break-word",
                      overflow: "hidden",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              )}

              <div
                className={cn(
                  "flex items-center space-x-1",
                  isRecording ? "w-full" : ""
                )}
              >
                {isRecording ? (
                  <div className="flex items-center justify-between w-full">
                    {/* Show loader while connecting, waveform after */}
                    {!scribe.isConnected ? (
                      <div className="flex items-center gap-2 flex-1 text-white ml-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      <AudioVisualizer stream={mediaStream} />
                    )}

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleStopRecording}
                            className="rounded-full cursor-pointer text-white hover:bg-white/10 ml-4"
                          >
                            <Square size={16} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Stop recording</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ) : currentText.trim() ? (
                  <div className="flex items-center space-x-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleReject}
                            className="text-white hover:text-red-400 hover:bg-white/10 rounded-full cursor-pointer"
                          >
                            <X size={16} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Reject text</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleAccept}
                            className="text-white hover:text-green-400 hover:bg-white/10 rounded-full cursor-pointer"
                          >
                            <Check size={20} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Accept text</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleStartRecording}
                          className="text-white hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-full cursor-pointer"
                        >
                          <Mic size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Dictate</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="mt-2 text-center">
            <div
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                error
                  ? "bg-red-900/20 text-red-400"
                  : isRecording
                  ? "bg-green-900/20 text-green-400"
                  : scribe.isConnected
                  ? "bg-blue-900/20 text-blue-400"
                  : "bg-gray-800 text-gray-400"
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full mr-2 ${
                  error
                    ? "bg-red-400"
                    : isRecording
                    ? "bg-green-400 animate-pulse"
                    : scribe.isConnected
                    ? "bg-blue-400"
                    : "bg-gray-400"
                }`}
              />
              {status}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ElevenLabsRecorder;
