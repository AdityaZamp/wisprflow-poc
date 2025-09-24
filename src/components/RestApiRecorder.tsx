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
import { cn } from "@/lib/utils";
import { Check, Mic, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import RestApiConfigModal from "./RestApiConfigModal";

interface ChatMessage {
  id: string;
  text: string;
  timestamp: Date;
}

interface RestApiConfig {
  access_token: string;
  language: string[];
  context: {
    app: {
      type: string;
    };
    dictionary_context: string[];
    textbox_contents: {
      before_text: string;
      selected_text: string;
      after_text: string;
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
      for (const entry of entries) {
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

const RestApiRecorder = () => {
  const [config, setConfig] = useState<RestApiConfig>({
    access_token: "",
    language: ["en"],
    context: {
      app: {
        type: "email",
      },
      dictionary_context: [],
      textbox_contents: {
        before_text: "",
        selected_text: "",
        after_text: "",
      },
    },
  });

  const handleConfigChange = (newConfig: RestApiConfig) => {
    setConfig(newConfig);
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [apiDuration, setApiDuration] = useState<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result.split(",")[1]);
        } else {
          reject(new Error("Failed to convert blob to base64"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Convert WebM to WAV
  const convertWebMToWAV = async (webmBlob: Blob): Promise<Blob> => {
    const audioContext = new AudioContext();
    const arrayBuffer = await webmBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Calculate the correct number of samples at 16 kHz
    const targetSampleRate = 16000;
    const resampleRatio = targetSampleRate / audioBuffer.sampleRate;
    const newLength = Math.floor(audioBuffer.length * resampleRatio);

    // Create an OfflineAudioContext with the correct length
    const offlineAudioContext = new OfflineAudioContext(
      1, // mono channel
      newLength,
      targetSampleRate
    );

    const source = offlineAudioContext.createBufferSource();
    source.buffer = audioBuffer;

    // Connect the source to the destination
    source.connect(offlineAudioContext.destination);

    source.start(0);
    const renderedBuffer = await offlineAudioContext.startRendering();

    // Prepare WAV file headers and data
    const numberOfChannels = 1;
    const length = renderedBuffer.length * numberOfChannels * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);

    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    let offset = 0;

    // RIFF chunk descriptor
    writeString(view, offset, "RIFF");
    offset += 4;
    view.setUint32(
      offset,
      36 + renderedBuffer.length * numberOfChannels * 2,
      true
    );
    offset += 4;
    writeString(view, offset, "WAVE");
    offset += 4;

    // fmt sub-chunk
    writeString(view, offset, "fmt ");
    offset += 4;
    view.setUint32(offset, 16, true); // PCM format
    offset += 4;
    view.setUint16(offset, 1, true); // PCM
    offset += 2;
    view.setUint16(offset, numberOfChannels, true); // Mono
    offset += 2;
    view.setUint32(offset, targetSampleRate, true); // Sample rate
    offset += 4;
    view.setUint32(offset, targetSampleRate * numberOfChannels * 2, true); // Byte rate
    offset += 4;
    view.setUint16(offset, numberOfChannels * 2, true); // Block align
    offset += 2;
    view.setUint16(offset, 16, true); // Bits per sample
    offset += 2;

    // data sub-chunk
    writeString(view, offset, "data");
    offset += 4;
    view.setUint32(offset, renderedBuffer.length * numberOfChannels * 2, true);
    offset += 4;

    // Write PCM samples
    const channelData = renderedBuffer.getChannelData(0);
    for (let i = 0; i < renderedBuffer.length; i++) {
      const sample = channelData[i];
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }

    return new Blob([view], { type: "audio/wav" });
  };

  // Setup audio context and analyser for volume monitoring
  const setupAudioContext = (stream: MediaStream) => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    // Start volume monitoring
    const monitorVolume = () => {
      if (!analyserRef.current) return;

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);

      const average =
        dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      setVolume(average / 255);

      if (isRecording) {
        animationFrameRef.current = requestAnimationFrame(monitorVolume);
      }
    };

    monitorVolume();
  };

  // Setup recorder
  const setupRecorder = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;
      setupAudioContext(stream);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        try {
          setIsProcessing(true);
          setStatus("Processing...");

          const webmBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          const wavBlob = await convertWebMToWAV(webmBlob);
          const base64Audio = await blobToBase64(wavBlob);

          await sendAudioToServer(wavBlob, base64Audio);
          audioChunksRef.current = [];
        } catch (err) {
          console.error("Error processing audio:", err);
          setError("Error processing audio");
          setStatus("Error");
        } finally {
          setIsProcessing(false);
        }
      };

      return true;
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Could not access microphone");
      setStatus("Error");
      return false;
    }
  };

  // Send audio to server
  const sendAudioToServer = async (audioBlob: Blob, base64Audio: string) => {
    try {
      setStatus("Sending to server...");
      setError(null);

      const startTime = performance.now();
      const response = await fetch("/api/audio/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audio: base64Audio,
          language: config.language,
          context: config.context,
        }),
      });

      const duration = (performance.now() - startTime) / 1000;
      setApiDuration(duration);
      console.log(`API call took ${duration}s`);

      if (response.ok) {
        const result = await response.json();
        setStatus("Success!");

        // Extract transcript from response (adjust based on actual API response structure)
        if (result.transcript || result.text) {
          const transcript = result.transcript || result.text;
          setCurrentText(transcript);
        }

        toast.success("Audio processed successfully", {
          description: `API call took ${duration.toFixed(2)}s`,
          duration: 4000,
          style: {
            background: "#1a1a1a",
            border: "1px solid #22c55e",
            color: "#ffffff",
          },
        });
      } else {
        throw new Error(`Server returned ${response.status}`);
      }
    } catch (err) {
      console.error("Error sending audio:", err);
      setError(
        err instanceof Error ? err.message : "Error sending audio to server"
      );
      setStatus("Error sending audio to server");
      toast.error("Error sending audio to server", {
        description: err instanceof Error ? err.message : "Unknown error",
        duration: 6000,
        style: {
          background: "#1a1a1a",
          border: "1px solid #ef4444",
          color: "#ffffff",
        },
      });
    }
  };

  // Start recording
  const startRecording = async () => {
    if (!mediaRecorderRef.current) {
      const setup = await setupRecorder();
      if (!setup) return;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "inactive"
    ) {
      audioChunksRef.current = [];
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setStatus("Recording...");
      setError(null);
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
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
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
    }
  };

  // Accept recording
  const acceptRecording = () => {
    if (currentText.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        text: currentText.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, newMessage]);
      setCurrentText("");
      setStatus("Ready");

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

  // Reject recording
  const rejectRecording = () => {
    setCurrentText("");
    setStatus("Ready");

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

  // Handle text change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentText(e.target.value);
  };

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (currentText.trim()) {
        acceptRecording();
      }
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [currentText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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
                    disabled={isRecording || isProcessing}
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
                    <Waveform volume={volume} />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={stopRecording}
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
                            onClick={rejectRecording}
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
                            onClick={acceptRecording}
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
                          onClick={startRecording}
                          disabled={error !== null || isProcessing}
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
                <RestApiConfigModal
                  onConfigChange={handleConfigChange}
                  currentConfig={config}
                />
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
                  : isProcessing
                  ? "bg-yellow-900/20 text-yellow-400"
                  : "bg-gray-800 text-gray-400"
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full mr-2 ${
                  error
                    ? "bg-red-400"
                    : isRecording
                    ? "bg-green-400 animate-pulse"
                    : isProcessing
                    ? "bg-yellow-400 animate-pulse"
                    : "bg-gray-400"
                }`}
              />
              {status}
              {apiDuration && (
                <span className="ml-2 text-xs opacity-75">
                  ({apiDuration.toFixed(2)}s)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestApiRecorder;
