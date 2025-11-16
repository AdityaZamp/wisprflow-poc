"use client";

import { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  stream: MediaStream | null;
}

const AudioVisualizer = ({ stream }: AudioVisualizerProps) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const historyBufferRef = useRef<number[]>(new Array(40).fill(0));
  const frameCounterRef = useRef<number>(0);

  // Adjust this to control wave speed:
  // 1 = fastest (update every frame)
  // 2 = update every 2 frames (slower)
  // 3 = update every 3 frames (even slower)
  const FRAME_SKIP = 2;

  // Adjust these to control bar heights:
  const MIN_HEIGHT = 8; // Minimum bar height in pixels (idle state)
  const MAX_HEIGHT = 200; // Maximum bar height as percentage (0-100)

  useEffect(() => {
    if (!stream) {
      // Reset to idle state
      historyBufferRef.current = new Array(40).fill(0);
      frameCounterRef.current = 0;
      barsRef.current.forEach((bar) => {
        if (bar) {
          bar.style.height = `${MIN_HEIGHT}px`;
          bar.style.opacity = "0.6";
        }
      });
      return;
    }

    // Set up audio analysis
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateVisualization = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);

      // Get average of frequency data for the current frame
      const samples = 40;
      const step = Math.floor(bufferLength / samples);
      let sum = 0;
      for (let i = 0; i < samples; i++) {
        sum += dataArray[i * step];
      }
      const average = sum / samples / 255; // Normalize to 0-1

      // Increment frame counter
      frameCounterRef.current += 1;

      // Only shift buffer every FRAME_SKIP frames
      if (frameCounterRef.current >= FRAME_SKIP) {
        frameCounterRef.current = 0;
        historyBufferRef.current.shift();
        historyBufferRef.current.push(average);
      }

      // Update bars with buffered values
      for (let i = 0; i < samples; i++) {
        const bar = barsRef.current[i];
        if (!bar) continue;

        const value = historyBufferRef.current[i];
        const height = Math.max(MIN_HEIGHT, value * MAX_HEIGHT);
        const opacity = 0.7 + value * 0.3;

        bar.style.height = `${height}%`;
        bar.style.opacity = opacity.toString();
      }

      animationFrameRef.current = requestAnimationFrame(updateVisualization);
    };

    updateVisualization();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stream]);

  return (
    <div className="flex h-5 w-full flex-1 items-center justify-center gap-[2px] overflow-hidden">
      {Array.from({ length: 40 }).map((_, index) => (
        <div
          key={index}
          ref={(el) => {
            if (el) {
              barsRef.current[index] = el;
            }
          }}
          className="w-1 rounded-full bg-white"
          style={{
            height: `${MIN_HEIGHT}px`,
            opacity: 0.6,
            transition: "height 0.05s ease-out, opacity 0.05s ease-out",
          }}
        />
      ))}
    </div>
  );
};

export default AudioVisualizer;
