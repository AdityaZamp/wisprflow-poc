"use client";

import RestApiRecorder from "@/components/rest-api/RestApiRecorder";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import WebSocketRecorder from "@/components/websocket/WebSocketRecorder";
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
              WisprFlow Speech to Text POC
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
                    WebSocket
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {leftCollapsed || rightCollapsed
                      ? "Restore both panels"
                      : "Focus on WebSocket panel"}
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
                    REST API
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {leftCollapsed || rightCollapsed
                      ? "Restore both panels"
                      : "Focus on REST API panel"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Resizable Panels */}
        <div className="flex-1 min-h-0">
          <PanelGroup direction="horizontal">
            {/* WebSocket Panel */}
            <Panel
              ref={leftPanelRef}
              defaultSize={50}
              minSize={20}
              collapsible
              collapsedSize={0}
            >
              <div className="h-full flex flex-col">
                {/* WebSocket Panel Header */}
                <div className="bg-[#2a2a2a] border-b border-[#333] px-4 py-2 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <h2 className="text-white font-medium">
                      WebSocket Approach
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
                          : "Focus on WebSocket panel"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* WebSocket Content */}
                <div className="flex-1 min-h-0">
                  <WebSocketRecorder />
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="w-1 bg-[#333] hover:bg-[#555] transition-colors" />

            {/* REST API Panel */}
            <Panel
              ref={rightPanelRef}
              defaultSize={50}
              minSize={20}
              collapsible
              collapsedSize={0}
            >
              <div className="h-full flex flex-col">
                {/* REST API Panel Header */}
                <div className="bg-[#2a2a2a] border-b border-[#333] px-4 py-2 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <h2 className="text-white font-medium">
                      REST API Approach
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
                          : "Focus on REST API panel"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* REST API Content */}
                <div className="flex-1 min-h-0">
                  <RestApiRecorder />
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </div>
      </div>
    </TooltipProvider>
  );
}
