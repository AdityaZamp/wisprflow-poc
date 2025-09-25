"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle, Settings, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

interface WebSocketConfig {
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

interface ContextSelection {
  user_info: boolean;
  textbox_contents: boolean;
  content_fields: boolean;
  dictionary_context: boolean;
  screenshot: boolean;
  conversation: boolean;
}

interface ConfigModalProps {
  onConfigChange: (config: WebSocketConfig) => void;
  currentConfig: WebSocketConfig;
}

const ConfigModal = ({ onConfigChange, currentConfig }: ConfigModalProps) => {
  const [config, setConfig] = useState<WebSocketConfig>({
    language: "en",
    context: {
      app: {
        name: "Weather Forecast Chatbot",
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
  const [isOpen, setIsOpen] = useState(false);
  const [contextSelection, setContextSelection] = useState<ContextSelection>({
    user_info: true,
    textbox_contents: true,
    content_fields: false,
    dictionary_context: false,
    screenshot: false,
    conversation: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onConfigChange(config);
    setIsOpen(false);
  };

  const handleReset = () => {
    setConfig(currentConfig);
  };

  const handleContextToggle = (field: keyof ContextSelection) => {
    setContextSelection((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setConfig((prev) => ({
          ...prev,
          context: {
            ...prev.context,
            screenshot: result,
          },
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const FieldLabel = ({
    htmlFor,
    children,
    tooltip,
  }: {
    htmlFor: string;
    children: React.ReactNode;
    tooltip: string;
  }) => (
    <div className="flex items-center gap-2">
      <Label htmlFor={htmlFor} className="text-white">
        {children}
      </Label>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(true)}
              className="rounded-full cursor-pointer text-white hover:bg-white/10 hover:text-white"
            >
              <Settings size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Config</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {isOpen && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 bg-[#212121] border-gray-700">
            <DialogHeader className="p-6 pb-4 border-b border-gray-700">
              <DialogTitle className="text-white">
                WebSocket Configuration
              </DialogTitle>
              <DialogDescription className="mt-2 text-gray-300">
                Configure the authentication and context parameters for the
                WebSocket connection.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Authentication */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">
                  Authentication
                </h3>
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <FieldLabel
                      htmlFor="language"
                      tooltip="Optional ISO 639-1 language code that the user is expected to speak. Setting this forces the transcription into the specified language. Not providing an input attempts autodetection on full list of languages (less accurate)."
                    >
                      Language (ISO 639-1 Code)
                    </FieldLabel>
                    <Select
                      value={config.language}
                      onValueChange={(value) =>
                        setConfig((prev) => ({
                          ...prev,
                          language: value,
                        }))
                      }
                    >
                      <SelectTrigger className="cursor-pointer text-white bg-[#303030] border-gray-600 hover:bg-gray-700">
                        <SelectValue placeholder="Select language code" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English (en)</SelectItem>
                        <SelectItem value="es">Spanish (es)</SelectItem>
                        <SelectItem value="fr">French (fr)</SelectItem>
                        <SelectItem value="de">German (de)</SelectItem>
                        <SelectItem value="it">Italian (it)</SelectItem>
                        <SelectItem value="pt">Portuguese (pt)</SelectItem>
                        <SelectItem value="ru">Russian (ru)</SelectItem>
                        <SelectItem value="ja">Japanese (ja)</SelectItem>
                        <SelectItem value="ko">Korean (ko)</SelectItem>
                        <SelectItem value="zh">Chinese (zh)</SelectItem>
                        <SelectItem value="ar">Arabic (ar)</SelectItem>
                        <SelectItem value="hi">Hindi (hi)</SelectItem>
                        <SelectItem value="nl">Dutch (nl)</SelectItem>
                        <SelectItem value="sv">Swedish (sv)</SelectItem>
                        <SelectItem value="no">Norwegian (no)</SelectItem>
                        <SelectItem value="da">Danish (da)</SelectItem>
                        <SelectItem value="fi">Finnish (fi)</SelectItem>
                        <SelectItem value="pl">Polish (pl)</SelectItem>
                        <SelectItem value="tr">Turkish (tr)</SelectItem>
                        <SelectItem value="th">Thai (th)</SelectItem>
                        <SelectItem value="vi">Vietnamese (vi)</SelectItem>
                        <SelectItem value="id">Indonesian (id)</SelectItem>
                        <SelectItem value="ms">Malay (ms)</SelectItem>
                        <SelectItem value="tl">Filipino (tl)</SelectItem>
                        <SelectItem value="he">Hebrew (he)</SelectItem>
                        <SelectItem value="uk">Ukrainian (uk)</SelectItem>
                        <SelectItem value="cs">Czech (cs)</SelectItem>
                        <SelectItem value="hu">Hungarian (hu)</SelectItem>
                        <SelectItem value="ro">Romanian (ro)</SelectItem>
                        <SelectItem value="bg">Bulgarian (bg)</SelectItem>
                        <SelectItem value="hr">Croatian (hr)</SelectItem>
                        <SelectItem value="sk">Slovak (sk)</SelectItem>
                        <SelectItem value="sl">Slovenian (sl)</SelectItem>
                        <SelectItem value="et">Estonian (et)</SelectItem>
                        <SelectItem value="lv">Latvian (lv)</SelectItem>
                        <SelectItem value="lt">Lithuanian (lt)</SelectItem>
                        <SelectItem value="el">Greek (el)</SelectItem>
                        <SelectItem value="ca">Catalan (ca)</SelectItem>
                        <SelectItem value="eu">Basque (eu)</SelectItem>
                        <SelectItem value="ga">Irish (ga)</SelectItem>
                        <SelectItem value="cy">Welsh (cy)</SelectItem>
                        <SelectItem value="mt">Maltese (mt)</SelectItem>
                        <SelectItem value="is">Icelandic (is)</SelectItem>
                        <SelectItem value="mk">Macedonian (mk)</SelectItem>
                        <SelectItem value="sq">Albanian (sq)</SelectItem>
                        <SelectItem value="sr">Serbian (sr)</SelectItem>
                        <SelectItem value="bs">Bosnian (bs)</SelectItem>
                        <SelectItem value="me">Montenegrin (me)</SelectItem>
                        <SelectItem value="af">Afrikaans (af)</SelectItem>
                        <SelectItem value="sw">Swahili (sw)</SelectItem>
                        <SelectItem value="zu">Zulu (zu)</SelectItem>
                        <SelectItem value="xh">Xhosa (xh)</SelectItem>
                        <SelectItem value="st">Sesotho (st)</SelectItem>
                        <SelectItem value="tn">Tswana (tn)</SelectItem>
                        <SelectItem value="ss">Swati (ss)</SelectItem>
                        <SelectItem value="ve">Venda (ve)</SelectItem>
                        <SelectItem value="ts">Tsonga (ts)</SelectItem>
                        <SelectItem value="nr">Ndebele (nr)</SelectItem>
                        <SelectItem value="nso">
                          Northern Sotho (nso)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Context Selection */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">
                  Context Selection
                </h3>
                <p className="text-sm text-gray-300">
                  Choose which context fields to include in the WebSocket
                  message
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="user_info"
                      checked={contextSelection.user_info}
                      onCheckedChange={() => handleContextToggle("user_info")}
                    />
                    <Label
                      htmlFor="user_info"
                      className="text-sm font-medium text-white"
                    >
                      User Information
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="textbox_contents"
                      checked={contextSelection.textbox_contents}
                      onCheckedChange={() =>
                        handleContextToggle("textbox_contents")
                      }
                    />
                    <Label
                      htmlFor="textbox_contents"
                      className="text-sm font-medium text-white"
                    >
                      Textbox Contents
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="content_fields"
                      checked={contextSelection.content_fields}
                      onCheckedChange={() =>
                        handleContextToggle("content_fields")
                      }
                    />
                    <Label
                      htmlFor="content_fields"
                      className="text-sm font-medium text-white"
                    >
                      Content Fields
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="dictionary_context"
                      checked={contextSelection.dictionary_context}
                      onCheckedChange={() =>
                        handleContextToggle("dictionary_context")
                      }
                    />
                    <Label
                      htmlFor="dictionary_context"
                      className="text-sm font-medium text-white"
                    >
                      Dictionary Context
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="screenshot"
                      checked={contextSelection.screenshot}
                      onCheckedChange={() => handleContextToggle("screenshot")}
                    />
                    <Label
                      htmlFor="screenshot"
                      className="text-sm font-medium text-white"
                    >
                      Screenshot
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="conversation"
                      checked={contextSelection.conversation}
                      onCheckedChange={() =>
                        handleContextToggle("conversation")
                      }
                    />
                    <Label
                      htmlFor="conversation"
                      className="text-sm font-medium text-white"
                    >
                      Conversation
                    </Label>
                  </div>
                </div>
              </div>

              {/* App Configuration */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">
                  App Configuration
                </h3>
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <FieldLabel
                      htmlFor="app_name"
                      tooltip="The name of the application the user is dictating into, used to customize the writing style."
                    >
                      App Name
                    </FieldLabel>
                    <Input
                      id="app_name"
                      value={config.context.app.name}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          context: {
                            ...prev.context,
                            app: { ...prev.context.app, name: e.target.value },
                          },
                        }))
                      }
                      placeholder="Enter app name"
                      className="text-white placeholder-gray-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel
                      htmlFor="app_type"
                      tooltip="The type of the application. Flow formats appropriately depending on if the user is prompting AI, writing an email, or other tasks."
                    >
                      App Type
                    </FieldLabel>
                    <Select
                      value={config.context.app.type}
                      onValueChange={(value) =>
                        setConfig((prev) => ({
                          ...prev,
                          context: {
                            ...prev.context,
                            app: { ...prev.context.app, type: value },
                          },
                        }))
                      }
                    >
                      <SelectTrigger className="cursor-pointer text-white bg-[#303030] border-gray-600 hover:bg-gray-700">
                        <SelectValue placeholder="Select app type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="ai">AI</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <ul className="text-xs text-gray-300 list-disc list-inside space-y-1">
                      <li>
                        <strong>Email:</strong> Email clients and anywhere the
                        user would be trying to dictate an email.
                      </li>
                      <li>
                        <strong>AI:</strong> Applications where the user is
                        conversing with an AI chatbot/agent and not a human.
                      </li>
                      <li>
                        <strong>Other:</strong> Any application that does not
                        fit in the two groups above.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* User Information */}
              {contextSelection.user_info && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-white">
                    User Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <FieldLabel
                        htmlFor="user_identifier"
                        tooltip="User ID in the app that the person is dictating in, like their email address in an email client application."
                      >
                        User Identifier
                      </FieldLabel>
                      <Input
                        id="user_identifier"
                        value={config.context.user_identifier || ""}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            context: {
                              ...prev.context,
                              user_identifier: e.target.value,
                            },
                          }))
                        }
                        placeholder="Enter user identifier"
                        className="text-white placeholder-gray-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel
                        htmlFor="user_first_name"
                        tooltip="First name of the speaker, used to make sure Flow spells the speaker's name correctly."
                      >
                        First Name
                      </FieldLabel>
                      <Input
                        id="user_first_name"
                        value={config.context.user_first_name || ""}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            context: {
                              ...prev.context,
                              user_first_name: e.target.value,
                            },
                          }))
                        }
                        placeholder="Enter first name"
                        className="text-white placeholder-gray-400"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <FieldLabel
                        htmlFor="user_last_name"
                        tooltip="Last name of the speaker, used to make sure Flow spells the speaker's name correctly."
                      >
                        Last Name
                      </FieldLabel>
                      <Input
                        id="user_last_name"
                        value={config.context.user_last_name || ""}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            context: {
                              ...prev.context,
                              user_last_name: e.target.value,
                            },
                          }))
                        }
                        placeholder="Enter last name"
                        className="text-white placeholder-gray-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Textbox Contents */}
              {contextSelection.textbox_contents && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-white">
                    Textbox Contents
                  </h3>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <FieldLabel
                        htmlFor="before_text"
                        tooltip="The text immediately before the cursor. Flow uses this information to decide casing, spacing and punctuation."
                      >
                        Before Text
                      </FieldLabel>
                      <Textarea
                        id="before_text"
                        value={config.context.textbox_contents.before_text}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            context: {
                              ...prev.context,
                              textbox_contents: {
                                ...prev.context.textbox_contents,
                                before_text: e.target.value,
                              },
                            },
                          }))
                        }
                        placeholder="Text before cursor"
                        rows={2}
                        className="text-white placeholder-gray-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel
                        htmlFor="selected_text"
                        tooltip="The text the user has highlighted. Flow uses this information to decide casing, spacing and punctuation."
                      >
                        Selected Text
                      </FieldLabel>
                      <Textarea
                        id="selected_text"
                        value={config.context.textbox_contents.selected_text}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            context: {
                              ...prev.context,
                              textbox_contents: {
                                ...prev.context.textbox_contents,
                                selected_text: e.target.value,
                              },
                            },
                          }))
                        }
                        placeholder="Currently selected text"
                        rows={2}
                        className="text-white placeholder-gray-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel
                        htmlFor="after_text"
                        tooltip="The text immediately after the cursor. Flow uses this information to decide casing, spacing and punctuation."
                      >
                        After Text
                      </FieldLabel>
                      <Textarea
                        id="after_text"
                        value={config.context.textbox_contents.after_text}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            context: {
                              ...prev.context,
                              textbox_contents: {
                                ...prev.context.textbox_contents,
                                after_text: e.target.value,
                              },
                            },
                          }))
                        }
                        placeholder="Text after cursor"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Content Fields */}
              {contextSelection.content_fields && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-white">Content</h3>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <FieldLabel
                        htmlFor="content_text"
                        tooltip="Plaintext content of the current page in the app user is dictating in. This is a more efficient way of providing context compared to screenshot."
                      >
                        Content Text
                      </FieldLabel>
                      <Textarea
                        id="content_text"
                        value={config.context.content_text || ""}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            context: {
                              ...prev.context,
                              content_text: e.target.value,
                            },
                          }))
                        }
                        placeholder="Additional text content"
                        rows={3}
                        className="text-white placeholder-gray-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel
                        htmlFor="content_html"
                        tooltip="HTML content of the app user is dictating in (a more feature-rich alternative to content_text)."
                      >
                        Content HTML
                      </FieldLabel>
                      <Textarea
                        id="content_html"
                        value={config.context.content_html || ""}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            context: {
                              ...prev.context,
                              content_html: e.target.value,
                            },
                          }))
                        }
                        placeholder="HTML content"
                        rows={3}
                        className="text-white placeholder-gray-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Dictionary Context */}
              {contextSelection.dictionary_context && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-white">
                    Dictionary Context
                  </h3>
                  <div className="space-y-2">
                    <FieldLabel
                      htmlFor="dictionary_context"
                      tooltip="List of uncommon names or words relevant to the context that might be mentioned by the user."
                    >
                      Dictionary Context (JSON Array)
                    </FieldLabel>
                    <Textarea
                      id="dictionary_context"
                      value={JSON.stringify(
                        config.context.dictionary_context,
                        null,
                        2
                      )}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setConfig((prev) => ({
                            ...prev,
                            context: {
                              ...prev.context,
                              dictionary_context: parsed,
                            },
                          }));
                        } catch {
                          // Invalid JSON, keep the text but don't update the config
                        }
                      }}
                      placeholder='["word1", "word2", "word3"]'
                      rows={3}
                      className="text-white placeholder-gray-400"
                    />
                  </div>
                </div>
              )}

              {/* Screenshot */}
              {contextSelection.screenshot && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-white">
                    Screenshot
                  </h3>
                  <div className="space-y-4">
                    <FieldLabel
                      htmlFor="screenshot"
                      tooltip="Screenshot of the screen or the app the user is dictating in, for when the user is referencing something on the screen. Upload an image to convert it to base64."
                    >
                      Screenshot (Base64 or URL)
                    </FieldLabel>

                    {/* Image Upload Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 cursor-pointer text-white border-gray-600 hover:bg-gray-700"
                        >
                          <Upload className="w-4 h-4" />
                          Upload Image
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        {config.context.screenshot && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              setConfig((prev) => ({
                                ...prev,
                                context: {
                                  ...prev.context,
                                  screenshot: null,
                                },
                              }))
                            }
                            className="flex items-center gap-2 cursor-pointer text-white border-gray-600 hover:bg-gray-700"
                          >
                            <X className="w-4 h-4" />
                            Clear
                          </Button>
                        )}
                      </div>

                      {/* Image Preview */}
                      {config.context.screenshot && (
                        <div className="space-y-2">
                          <div className="relative max-w-xs">
                            <img
                              src={config.context.screenshot}
                              alt="Screenshot preview"
                              className="w-full h-auto rounded border"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Image converted to base64 format
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Manual Input */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="screenshot_manual"
                        className="text-sm font-medium text-white"
                      >
                        Or enter manually (Base64 or URL):
                      </Label>
                      <Textarea
                        id="screenshot_manual"
                        value={config.context.screenshot || ""}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            context: {
                              ...prev.context,
                              screenshot: e.target.value,
                            },
                          }))
                        }
                        placeholder="Enter screenshot data or URL"
                        rows={3}
                        className="text-white placeholder-gray-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Conversation */}
              {contextSelection.conversation && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-white">
                    Conversation
                  </h3>
                  <div className="space-y-2">
                    <FieldLabel
                      htmlFor="conversation"
                      tooltip="Chatbot style history of the conversation the user is dictating in. This typically applies to messaging and AI apps. Must include id, participants array, and messages array with role and content."
                    >
                      Conversation (JSON)
                    </FieldLabel>
                    <Textarea
                      id="conversation"
                      value={JSON.stringify(
                        config.context.conversation || {},
                        null,
                        2
                      )}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setConfig((prev) => ({
                            ...prev,
                            context: {
                              ...prev.context,
                              conversation: parsed,
                            },
                          }));
                        } catch {
                          // Invalid JSON, keep the text but don't update the config
                        }
                      }}
                      placeholder='{"id": "conversation_id", "participants": ["user1", "user2"], "messages": [{"role": "user", "content": "Hello"}]}'
                      rows={4}
                      className="text-white placeholder-gray-400"
                    />
                    <p className="text-xs text-gray-400">
                      Required fields: id (string), participants (string[]),
                      messages (array with role:
                      &quot;user&quot;|&quot;human&quot;|&quot;assistant&quot;
                      and content: string)
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 p-6 pt-4 border-t border-gray-700 bg-[#212121]">
              <Button
                variant="outline"
                onClick={handleReset}
                className="cursor-pointer text-gray-500 border-gray-500 hover:bg-gray-600 hover:text-white"
              >
                Reset
              </Button>
              <Button
                onClick={handleSave}
                className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white font-medium"
              >
                Save Configuration
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ConfigModal;
