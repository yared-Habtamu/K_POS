import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { cn } from "@/lib/utils";
import { Send, MessageSquare } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

interface ChatUser {
  id: string;
  name: string;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  sender: ChatUser & { role: string };
}

interface Conversation {
  id: string;
  martId: string;
  managerId: string;
  cashierId: string;
  manager: ChatUser;
  cashier: ChatUser;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  updatedAt: string;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);

  if (days === 0) return formatTime(dateStr);
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ChatPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeConvIdRef = useRef<string | null>(null);

  const token = user?.token;
  const userId = user?.id;

  // Keep ref in sync
  useEffect(() => {
    activeConvIdRef.current = activeConvId;
  }, [activeConvId]);

  const authHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token],
  );

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/chat/conversations`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch conversations", e);
    } finally {
      setLoadingConvs(false);
    }
  }, [token, authHeaders]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(
    async (convId: string) => {
      if (!token || !convId) return;
      setLoadingMsgs(true);
      try {
        const res = await fetch(
          `${API_BASE}/api/chat/conversations/${convId}/messages`,
          { headers: authHeaders() },
        );
        if (res.ok) {
          const data = await res.json();
          setMessages(data.data || []);
        }
      } catch (e) {
        console.error("Failed to fetch messages", e);
      } finally {
        setLoadingMsgs(false);
      }
    },
    [token, authHeaders],
  );

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // When active conversation changes, fetch messages
  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
      // Mark as read
      if (token) {
        fetch(`${API_BASE}/api/chat/conversations/${activeConvId}/read`, {
          method: "PUT",
          headers: authHeaders(),
        }).then(() => {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConvId ? { ...c, unreadCount: 0 } : c,
            ),
          );
        });
      }
      inputRef.current?.focus();
    }
  }, [activeConvId, fetchMessages, token, authHeaders]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for incoming socket messages
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const payload = e.detail;
      if (!payload) return;

      const { conversationId, message } = payload;

      // If we're viewing this conversation, add the message
      if (activeConvIdRef.current === conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
        // Mark as read
        if (token) {
          fetch(
            `${API_BASE}/api/chat/conversations/${conversationId}/read`,
            { method: "PUT", headers: authHeaders() },
          );
        }
      }

      // Update conversation list
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conversationId) return c;
          return {
            ...c,
            lastMessage: message.message,
            lastMessageAt: message.createdAt,
            unreadCount:
              activeConvIdRef.current === conversationId
                ? 0
                : c.unreadCount + 1,
            updatedAt: message.createdAt,
          };
        }),
      );
    };

    window.addEventListener(
      "chat_message" as unknown as string,
      handler as EventListener,
    );
    return () =>
      window.removeEventListener(
        "chat_message" as unknown as string,
        handler as EventListener,
      );
  }, [token, authHeaders]);

  // Send message
  const handleSend = async () => {
    if (!activeConvId || !newMessage.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/chat/conversations/${activeConvId}/messages`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ message: newMessage.trim() }),
        },
      );
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setNewMessage("");
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConvId
              ? {
                  ...c,
                  lastMessage: msg.message,
                  lastMessageAt: msg.createdAt,
                  updatedAt: msg.createdAt,
                }
              : c,
          ),
        );
      }
    } catch (e) {
      console.error("Failed to send message", e);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const otherUser =
    activeConv && userId
      ? userId === activeConv.managerId
        ? activeConv.cashier
        : activeConv.manager
      : null;

  const getRole = (conv: Conversation) =>
    userId === conv.managerId ? conv.cashier : conv.manager;

  const role = user?.role;
  const allowedRoles =
    role === "manager"
      ? (["manager"] as const)
      : role === "cashier"
        ? (["cashier"] as const)
        : (["manager", "cashier"] as const);

  return (
    <RoleLayout allowedRoles={allowedRoles as any}>
      <div className="flex h-[calc(100vh-4rem)] -m-3 sm:-m-4 md:-m-6">
        {/* Conversation List */}
        <div className="w-80 border-r border-border flex flex-col bg-background">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              {t("chat_conversations")}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="p-4 text-muted-foreground text-sm">
                {t("loading")}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-muted-foreground text-sm">
                {t("no_conversations")}
              </div>
            ) : (
              conversations.map((conv) => {
                const other = getRole(conv);
                const isActive = conv.id === activeConvId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b border-border/50 transition-colors",
                      "hover:bg-accent/50",
                      isActive && "bg-accent",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">
                        {other?.name || "Unknown"}
                      </span>
                      <div className="flex items-center gap-2">
                        {conv.unreadCount > 0 && (
                          <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 font-medium">
                            {conv.unreadCount}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {conv.lastMessageAt
                            ? formatDate(conv.lastMessageAt)
                            : ""}
                        </span>
                      </div>
                    </div>
                    {conv.lastMessage && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {conv.lastMessage}
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Message Area */}
        <div className="flex-1 flex flex-col bg-background">
          {!activeConvId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{t("start_conversation")}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {otherUser?.name?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {otherUser?.name || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {t(
                      userId === activeConv?.managerId
                        ? "cashier"
                        : "manager",
                    )}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {loadingMsgs ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    {t("loading")}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    {t("new_message")}
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === userId;
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          isMe ? "justify-end" : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] rounded-xl px-3 py-2 text-sm",
                            isMe
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted",
                          )}
                        >
                          <p className="break-words">{msg.message}</p>
                          <p
                            className={cn(
                              "text-[10px] mt-1",
                              isMe
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground",
                            )}
                          >
                            {formatTime(msg.createdAt)}
                            {isMe && msg.readAt && " ✓✓"}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="px-4 py-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t("type_message")}
                    className="flex-1 h-10 px-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={sending}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sending}
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
                      newMessage.trim()
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </RoleLayout>
  );
}
