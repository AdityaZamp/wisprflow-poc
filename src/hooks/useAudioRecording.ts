"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface AudioRecordingState {
  isRecording: boolean;
  isConnected: boolean;
  isAuthenticated: boolean;
  transcript: string;
  status: string;
  error: string | null;
  volume: number;
  mediaStream: MediaStream | null;
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

interface AudioRecordingHook {
  state: AudioRecordingState;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  acceptRecording: () => void;
  rejectRecording: () => void;
}

const BUFFER_SIZE = 2400; // 50 ms
const RECORDING_SAMPLE_RATE = 48000;
const TARGET_SAMPLE_RATE = 16000;
const PACKET_DURATION = BUFFER_SIZE / RECORDING_SAMPLE_RATE;

export const useAudioRecording = (
  wsConfig: WebSocketConfig
): AudioRecordingHook => {
  const [state, setState] = useState<AudioRecordingState>({
    isRecording: false,
    isConnected: false,
    isAuthenticated: false,
    transcript: "",
    status: "Ready",
    error: null,
    volume: 0,
    mediaStream: null,
  });

  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioProcessorRef = useRef<AudioWorkletNode | null>(null);
  const packetPositionRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);

  const updateState = useCallback((updates: Partial<AudioRecordingState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resampleAudio = useCallback(
    async (
      inputData: Float32Array,
      inputSampleRate: number,
      outputSampleRate: number
    ): Promise<Float32Array> => {
      const offlineCtx = new OfflineAudioContext(
        1,
        inputData.length * (outputSampleRate / inputSampleRate),
        outputSampleRate
      );

      const audioBuffer = offlineCtx.createBuffer(
        1,
        inputData.length,
        inputSampleRate
      );
      audioBuffer.copyToChannel(new Float32Array(inputData), 0);

      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start();

      const buffer = await offlineCtx.startRendering();
      return buffer.getChannelData(0);
    },
    []
  );

  const convertToInt16 = useCallback((floatData: Float32Array): Int16Array => {
    const intData = new Int16Array(floatData.length);
    for (let i = 0; i < floatData.length; i++) {
      const s = Math.max(-1, Math.min(1, floatData[i]));
      intData[i] = s < 0 ? Math.floor(s * 32768) : Math.floor(s * 32767);
    }
    return intData;
  }, []);

  const calculateVolume = useCallback((data: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }, []);

  const processAudioData = useCallback(
    async (inputData: Float32Array) => {
      if (!audioContextRef.current) return;

      const resampledData = await resampleAudio(
        inputData,
        audioContextRef.current.sampleRate,
        TARGET_SAMPLE_RATE
      );
      const intData = convertToInt16(resampledData);
      const volume = calculateVolume(resampledData);

      // Update volume in state for real-time visualization
      updateState({ volume });

      sendAudioData(intData.buffer as ArrayBuffer, volume);
    },
    [resampleAudio, convertToInt16, calculateVolume, updateState]
  );

  const sendAudioData = useCallback((buffer: ArrayBuffer, volume: number) => {
    if (
      !websocketRef.current ||
      websocketRef.current.readyState !== WebSocket.OPEN
    )
      return;

    const audioBytes = new Uint8Array(buffer);
    const base64Audio = btoa(String.fromCharCode(...audioBytes));

    websocketRef.current.send(
      JSON.stringify({
        type: "append",
        position: packetPositionRef.current,
        audio_packets: {
          packets: [base64Audio],
          volumes: [volume],
          packet_duration: PACKET_DURATION,
          audio_encoding: "wav",
          byte_encoding: "base64",
        },
      })
    );
    packetPositionRef.current++;
  }, []);

  const createAudioWorkletNode = useCallback(
    (context: AudioContext): AudioWorkletNode => {
      const audioProcessor = new AudioWorkletNode(
        context,
        "audioProcessorWorklet"
      );

      audioProcessor.port.onmessage = async (event) => {
        if (event.data.type === "audioData") {
          await processAudioData(event.data.data);
        }
      };

      audioProcessor.port.postMessage({
        type: "setSampleRate",
        sampleRate: RECORDING_SAMPLE_RATE,
        bufferSize: BUFFER_SIZE,
      });

      return audioProcessor;
    },
    [processAudioData]
  );

  const connectWebSocket = useCallback(() => {
    if (websocketRef.current) websocketRef.current.close();

    const apiKey = process.env.NEXT_PUBLIC_WISPRFLOW_ACCESS_TOKEN || "";
    websocketRef.current = new WebSocket(
      `wss://platform-api.wisprflow.ai/api/v1/dash/ws?api_key=Bearer%20${apiKey}`
    );

    websocketRef.current.onopen = () => {
      updateState({ isConnected: true, status: "Connected to WebSocket" });

      websocketRef.current?.send(
        JSON.stringify({
          type: "auth",
          access_token: apiKey,
          language: [wsConfig.language], // Convert single string to array
          context: wsConfig.context,
        })
      );
    };

    websocketRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log(`Received message: ${JSON.stringify(message)}`);

      if (message.status === "auth") {
        updateState({
          isAuthenticated: true,
          status: "Authenticated, ready to stream",
        });
      } else if (message.status === "info") {
        const info = message.message;
        updateState({ status: info.event });
      } else if (message.status === "text") {
        if (message.body.text) {
          updateState({ transcript: message.body.text });
        }
      } else if (message.error) {
        console.error("WebSocket error:", message.error);
        updateState({
          error: message.error,
          status: `Error: ${message.error}`,
        });
      }
    };

    websocketRef.current.onclose = () => {
      updateState({
        isConnected: false,
        status: "WebSocket connection closed",
      });
    };

    websocketRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      updateState({
        error: "WebSocket encountered an error",
        status: "Error: WebSocket encountered an error",
      });
    };
  }, [updateState, wsConfig]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const mediaStreamSource = audioContext.createMediaStreamSource(stream);
      mediaStreamSourceRef.current = mediaStreamSource;

      try {
        await audioContext.audioWorklet.addModule("/audioProcessorWorklet.js");
      } catch (error) {
        console.error("Failed to load audio worklet:", error);
        throw new Error("Failed to load audio worklet");
      }

      const audioProcessor = createAudioWorkletNode(audioContext);
      audioProcessorRef.current = audioProcessor;

      mediaStreamSource.connect(audioProcessor);
      audioProcessor.connect(audioContext.destination);

      packetPositionRef.current = 0;
      connectWebSocket();

      updateState({
        isRecording: true,
        status: "Recording and streaming...",
        error: null,
        transcript: "",
        mediaStream: stream,
      });
    } catch (err) {
      console.error("Error accessing microphone:", err);
      updateState({
        error: "Could not access microphone",
        status: "Error: Could not access microphone",
      });
    }
  }, [connectWebSocket, createAudioWorkletNode, updateState]);

  const stopRecording = useCallback(async () => {
    if (
      audioContextRef.current &&
      audioContextRef.current.state === "running"
    ) {
      await audioContextRef.current.suspend();

      if (audioProcessorRef.current) {
        audioProcessorRef.current.disconnect();
        mediaStreamSourceRef.current?.disconnect();
        audioProcessorRef.current = null;
        audioContextRef.current = null;
      }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (
      websocketRef.current &&
      websocketRef.current.readyState === WebSocket.OPEN
    ) {
      websocketRef.current.send(
        JSON.stringify({
          type: "commit",
          total_packets: packetPositionRef.current,
        })
      );
    }

    updateState({
      isRecording: false,
      status: "Stopped streaming",
      mediaStream: null,
    });
  }, [updateState]);

  const acceptRecording = useCallback(() => {
    updateState({
      status: "Recording accepted",
      transcript: state.transcript,
    });
  }, [state.transcript, updateState]);

  const rejectRecording = useCallback(() => {
    updateState({
      status: "Recording rejected",
      transcript: "",
    });
  }, [updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    state,
    startRecording,
    stopRecording,
    acceptRecording,
    rejectRecording,
  };
};
