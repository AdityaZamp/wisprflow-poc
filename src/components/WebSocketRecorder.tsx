"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { cn } from "@/lib/utils";
import { Check, Mic, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import ConfigModal from "./ConfigModal";

interface ChatMessage {
  id: string;
  text: string;
  timestamp: Date;
}

interface WebSocketConfig {
  access_token: string;
  language: string;
  context: {
    app: {
      name: string;
      type: string;
    };
    dictionary_context: string[];
    user_identifier?: string;
    user_first_name?: string;
    user_last_name?: string;
    textbox_contents: {
      before_text: string;
      selected_text: string;
      after_text: string;
    };
    screenshot?: string | null;
    content_text?: string | null;
    content_html?: string | null;
    conversation?: {
      id: string;
      participants: string[];
      messages: {
        role: "user" | "human" | "assistant";
        content: string;
      }[];
    };
  };
}

// 🔊 Waveform Component
const Waveform = ({ volume }: { volume: number }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [barCount, setBarCount] = useState(20);
  const [animationTime, setAnimationTime] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        // Each bar ~6px wide (4px bar + 2px gap)
        const count = Math.floor(width / 6);
        setBarCount(count > 10 ? count : 10); // at least 10 bars
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Animation loop for smooth waveform
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationTime(Date.now() * 0.01);
    }, 50); // Update every 50ms for smooth animation

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex-1 flex items-center justify-between px-2"
    >
      {Array.from({ length: barCount }, (_, i) => {
        const baseHeight = 4;
        const maxHeight = 20;
        const volumeMultiplier = Math.min(volume * 50, 1); // scale 0–1

        // If no volume detected, show a subtle static pattern
        const wavePattern =
          volume > 0
            ? Math.sin((animationTime + i * 0.5) % (Math.PI * 2))
            : Math.sin(i * 0.3) * 0.3; // Static pattern when no audio

        const height = Math.max(
          baseHeight,
          baseHeight +
            (maxHeight - baseHeight) *
              Math.max(volumeMultiplier, 0.1) *
              Math.abs(wavePattern)
        );

        return (
          <div
            key={i}
            className="flex-1 mx-[1px] bg-white rounded-full transition-all duration-75 ease-out"
            style={{
              height: `${height}px`,
              opacity: volume > 0 ? 0.7 + volumeMultiplier * 0.3 : 0.4,
            }}
          />
        );
      })}
    </div>
  );
};

const WebSocketRecorder = () => {
  const [wsConfig, setWsConfig] = useState<WebSocketConfig>({
    access_token: "",
    language: "en",
    context: {
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
  });

  const {
    state,
    startRecording,
    stopRecording,
    acceptRecording,
    rejectRecording,
  } = useAudioRecording(wsConfig);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state.transcript) {
      setCurrentText(state.transcript);
    }
  }, [state.transcript]);

  useEffect(() => {
    if (state.error) {
      toast.error("Recording Error", {
        description: state.error,
        duration: 6000,
        style: {
          background: "#1a1a1a",
          border: "1px solid #ef4444",
          color: "#ffffff",
        },
      });
    }
  }, [state.error]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [currentText]);

  const handleStartRecording = async () => {
    await startRecording();
    setIsRecording(true);
    setCurrentText("");

    toast.info("Recording started", {
      description: "Speak into your microphone",
      duration: 2000,
      style: {
        background: "#1a1a1a",
        border: "1px solid #3b82f6",
        color: "#ffffff",
      },
    });
  };

  const handleStopRecording = () => {
    stopRecording();
    setIsRecording(false);

    toast.info("Recording stopped", {
      description: "Processing audio...",
      duration: 2000,
      style: {
        background: "#1a1a1a",
        border: "1px solid #f59e0b",
        color: "#ffffff",
      },
    });
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
      acceptRecording();

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
    rejectRecording();

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
          <div className="relative bg-[#303030] rounded-full shadow-sm">
            <div className="flex items-center p-3 gap-x-2">
              {!isRecording && (
                <div className="flex-1 min-h-[40px] max-h-[200px] overflow-y-auto ml-3">
                  <Textarea
                    ref={textareaRef}
                    value={currentText}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything"
                    className="border-0 shadow-none resize-none text-lg leading-6 focus-visible:ring-0 min-h-[40px] py-2 px-0 text-white placeholder-gray-400"
                    rows={1}
                    disabled={isRecording}
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
                    {/* Dynamic Waveform */}
                    <Waveform volume={state.volume} />

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
                          disabled={state.error !== null}
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

                {/* Settings */}
                <ConfigModal
                  onConfigChange={setWsConfig}
                  currentConfig={wsConfig}
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="mt-2 text-center">
            <div
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                state.error
                  ? "bg-red-900/20 text-red-400"
                  : state.isRecording
                  ? "bg-green-900/20 text-green-400"
                  : state.isConnected
                  ? "bg-blue-900/20 text-blue-400"
                  : "bg-gray-800 text-gray-400"
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full mr-2 ${
                  state.error
                    ? "bg-red-400"
                    : state.isRecording
                    ? "bg-green-400 animate-pulse"
                    : state.isConnected
                    ? "bg-blue-400"
                    : "bg-gray-400"
                }`}
              />
              {state.status}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebSocketRecorder;
