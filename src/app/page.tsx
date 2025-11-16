"use client";

import ElevenLabsRecorder from "@/components/elevenlabs/ElevenLabsRecorder";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import WebSocketRecorder from "@/components/wisprflow/WebSocketRecorder";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { useRef, useState } from "react";
import {
  ImperativePanelHandle,
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";

export default function Home() {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);

  const focusLeftPanel = () => {
    if (leftPanelRef.current && rightPanelRef.current) {
      leftPanelRef.current.resize(100);
      rightPanelRef.current.resize(0);
      setLeftCollapsed(false);
      setRightCollapsed(true);
    }
  };

  const focusRightPanel = () => {
    if (leftPanelRef.current && rightPanelRef.current) {
      rightPanelRef.current.resize(100);
      leftPanelRef.current.resize(0);
      setRightCollapsed(false);
      setLeftCollapsed(true);
    }
  };

  const resetPanels = () => {
    if (leftPanelRef.current && rightPanelRef.current) {
      leftPanelRef.current.resize(50);
      rightPanelRef.current.resize(50);
      setLeftCollapsed(false);
      setRightCollapsed(false);
    }
  };

  const toggleLeftPanel = () => {
    if (leftCollapsed || rightCollapsed) {
      resetPanels();
    } else {
      focusLeftPanel();
    }
  };

  const toggleRightPanel = () => {
    if (leftCollapsed || rightCollapsed) {
      resetPanels();
    } else {
      focusRightPanel();
    }
  };

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <div className="bg-[#1a1a1a] border-b border-[#333] px-4 py-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-white text-lg font-semibold">
              Speech to Text POC - WisprFlow vs ElevenLabs
            </h1>
            <div className="flex items-center space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleLeftPanel}
                    className="text-white hover:bg-white/10"
                  >
                    {leftCollapsed ? (
                      <ChevronRight size={16} />
                    ) : (
                      <ChevronLeft size={16} />
                    )}
                    WisprFlow
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {leftCollapsed || rightCollapsed
                      ? "Restore both panels"
                      : "Focus on WisprFlow panel"}
                  </p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleRightPanel}
                    className="text-white hover:bg-white/10"
                  >
                    {rightCollapsed ? (
                      <ChevronLeft size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                    ElevenLabs
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {leftCollapsed || rightCollapsed
                      ? "Restore both panels"
                      : "Focus on ElevenLabs panel"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Resizable Panels */}
        <div className="flex-1 min-h-0">
          <PanelGroup direction="horizontal">
            {/* WisprFlow WebSocket Panel */}
            <Panel
              ref={leftPanelRef}
              defaultSize={50}
              minSize={20}
              collapsible
              collapsedSize={0}
            >
              <div className="h-full flex flex-col">
                {/* WisprFlow Panel Header */}
                <div className="bg-[#2a2a2a] border-b border-[#333] px-4 py-2 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <h2 className="text-white font-medium">
                      WisprFlow WebSocket
                    </h2>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleLeftPanel}
                        className="text-white hover:bg-white/10"
                      >
                        {leftCollapsed || rightCollapsed ? (
                          <Maximize2 size={16} />
                        ) : (
                          <Minimize2 size={16} />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {leftCollapsed || rightCollapsed
                          ? "Restore both panels"
                          : "Focus on WisprFlow panel"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* WisprFlow Content */}
                <div className="flex-1 min-h-0">
                  <WebSocketRecorder />
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="w-1 bg-[#333] hover:bg-[#555] transition-colors" />

            {/* ElevenLabs Panel */}
            <Panel
              ref={rightPanelRef}
              defaultSize={50}
              minSize={20}
              collapsible
              collapsedSize={0}
            >
              <div className="h-full flex flex-col">
                {/* ElevenLabs Panel Header */}
                <div className="bg-[#2a2a2a] border-b border-[#333] px-4 py-2 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <h2 className="text-white font-medium">
                      ElevenLabs Scribe v2
                    </h2>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleRightPanel}
                        className="text-white hover:bg-white/10"
                      >
                        {leftCollapsed || rightCollapsed ? (
                          <Maximize2 size={16} />
                        ) : (
                          <Minimize2 size={16} />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {leftCollapsed || rightCollapsed
                          ? "Restore both panels"
                          : "Focus on ElevenLabs panel"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* ElevenLabs Content */}
                <div className="flex-1 min-h-0">
                  <ElevenLabsRecorder />
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </div>
      </div>
    </TooltipProvider>
  );
}
