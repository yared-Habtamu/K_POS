import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { cn } from "@/lib/utils";
import {
  Send,
  MessageSquare,
  Plus,
  X,
  Search,
  Users,
  Check,
  CheckCheck,
  ArrowLeft,
} from "lucide-react";
import type { UserRole } from "@/types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

interface ChatUser {
  id: string;
  name: string;
  role: string;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  sender: ChatUser;
}

interface Conversation {
  id: string;
  martId: string;
  user1Id: string;
  user2Id: string;
  user1: ChatUser;
  user2: ChatUser;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  updatedAt: string;
}

function normalizeRole(role: string): string {
  const map: Record<string, string> = {
    systemAdmin: "system_admin",
    system_admin: "system_admin",
    owner: "owner",
    manager: "manager",
    cashier: "cashier",
    storeKeeper: "store_keeper",
    store_keeper: "store_keeper",
  };
  return map[role] || role || "other";
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

function getOtherUser(conv: Conversation, userId?: string): ChatUser | null {
  if (!userId) return null;
  return userId === conv.user1Id ? conv.user2 : conv.user1;
}

function avatarColor(name: string): string {
  const colors = [
    "bg-blue-100 text-blue-600",
    "bg-emerald-100 text-emerald-600",
    "bg-amber-100 text-amber-600",
    "bg-violet-100 text-violet-600",
    "bg-rose-100 text-rose-600",
    "bg-cyan-100 text-cyan-600",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

function Avatar({ name, userId }: { name: string; userId: string }) {
  return (
    <div
      className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-medium",
        avatarColor(userId + name),
      )}
    >
      {name?.charAt(0)?.toUpperCase() || "?"}
    </div>
  );
}

export default function ChatPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
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

  const [showNewChat, setShowNewChat] = useState(false);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [convSearch, setConvSearch] = useState("");

  const token = user?.token;
  const userId = user?.id;
  const role = user?.role as string;

  useEffect(() => {
    activeConvIdRef.current = activeConvId;
  }, [activeConvId]);

  // Deep-link: open a specific conversation from a notification (?conv=...)
  const requestedConv = searchParams.get("conv");
  useEffect(() => {
    if (requestedConv) {
      setActiveConvId(requestedConv);
      setShowNewChat(false);
    }
  }, [requestedConv]);

  const authHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token],
  );

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/chat/conversations`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setConversations((prev) => {
          const next = data.data || [];
          // Preserve the currently selected conversation if it wasn't returned yet
          if (
            activeConvIdRef.current &&
            !next.some((c: Conversation) => c.id === activeConvIdRef.current)
          ) {
            const current = prev.find((c) => c.id === activeConvIdRef.current);
            if (current) return [current, ...next];
          }
          return next;
        });
      }
    } catch (e) {
      console.error("Failed to fetch conversations", e);
    } finally {
      setLoadingConvs(false);
    }
  }, [token, authHeaders]);

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

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_BASE}/api/chat/users`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch users", e);
    } finally {
      setLoadingUsers(false);
    }
  }, [token, authHeaders]);

  const markRead = useCallback(
    async (convId: string) => {
      if (!token) return;
      try {
        await fetch(`${API_BASE}/api/chat/conversations/${convId}/read`, {
          method: "PUT",
          headers: authHeaders(),
        });
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId ? { ...c, unreadCount: 0 } : c,
          ),
        );
      } catch (e) {
        console.error("Failed to mark read", e);
      }
    },
    [token, authHeaders],
  );

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
      markRead(activeConvId);
      inputRef.current?.focus();
    }
  }, [activeConvId, fetchMessages, markRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const payload = e.detail;
      if (!payload) return;

      const { conversationId, message } = payload;
      const isActive = activeConvIdRef.current === conversationId;

      if (isActive) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
        markRead(conversationId);
      }

      setConversations((prev) => {
        const existing = prev.find((c) => c.id === conversationId);
        if (!existing) {
          // A brand-new conversation arrived in realtime; refresh the list.
          fetchConversations();
          return prev;
        }
        return prev.map((c) => {
          if (c.id !== conversationId) return c;
          return {
            ...c,
            lastMessage: message.message,
            lastMessageAt: message.createdAt,
            unreadCount: isActive ? 0 : c.unreadCount + 1,
            updatedAt: message.createdAt,
          };
        });
      });
    };

    window.addEventListener("chat_message" as unknown as string, handler as EventListener);
    return () =>
      window.removeEventListener("chat_message" as unknown as string, handler as EventListener);
  }, [token, authHeaders, fetchConversations, markRead]);

  // When the other participant reads the conversation, flip my "sent" ticks
  // to "read" in realtime.
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const payload = e.detail;
      if (!payload || payload.conversationId !== activeConvIdRef.current) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId === userId && !m.readAt
            ? { ...m, readAt: payload.readAt || new Date().toISOString() }
            : m,
        ),
      );
    };

    window.addEventListener("chat_read" as unknown as string, handler as EventListener);
    return () =>
      window.removeEventListener("chat_read" as unknown as string, handler as EventListener);
  }, [userId]);

  const startConversation = useCallback(
    async (otherUserId: string) => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/api/chat/conversations`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ otherUserId }),
        });
        if (res.ok) {
          const conv = await res.json();
          await fetchConversations();
          setActiveConvId(conv.id);
          setShowNewChat(false);
          setUserSearch("");
        }
      } catch (e) {
        console.error("Failed to start conversation", e);
      }
    },
    [token, authHeaders, fetchConversations],
  );

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
  const otherUser = activeConv ? getOtherUser(activeConv, userId) : null;

  const filteredConversations = useMemo(() => {
    const q = convSearch.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const other = getOtherUser(c, userId);
      return other?.name?.toLowerCase().includes(q);
    });
  }, [conversations, convSearch, userId]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.name?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q),
    );
  }, [users, userSearch]);

  const openNewChat = () => {
    setShowNewChat(true);
    setUserSearch("");
    fetchUsers();
  };

  const allowedRoles: UserRole[] = ["owner", "manager", "cashier", "store_keeper"];

  return (
    <RoleLayout allowedRoles={allowedRoles}>
      <div className="flex h-[calc(100dvh-4rem)] -m-3 sm:-m-4 md:-m-6">
        {/* Conversation List */}
        <div
          className={cn(
            "border-r border-border flex-col bg-background",
            "w-full md:w-72 lg:w-80",
            showNewChat || activeConvId ? "hidden md:flex" : "flex",
          )}
        >
          <div className="p-3 border-b border-border flex items-center justify-between gap-2">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              {t("chat_conversations")}
            </h2>
            <button
              onClick={openNewChat}
              className="h-8 w-8 rounded-lg flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
              title={t("new_message")}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="p-2 border-b border-border/50 flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
              placeholder={t("search_conversations")}
              className="w-full bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="p-4 text-muted-foreground text-sm">
                {t("loading")}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-muted-foreground text-sm">
                {convSearch ? t("no_results") : t("no_conversations")}
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const other = getOtherUser(conv, userId);
                const isActive = conv.id === activeConvId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={cn(
                      "w-full text-left px-3 py-3 border-b border-border/50 transition-colors flex items-start gap-3",
                      "hover:bg-accent/50",
                      isActive && "bg-accent",
                    )}
                  >
                    <Avatar name={other?.name || "?"} userId={conv.id} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">
                          {other?.name || "Unknown"}
                        </span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {conv.lastMessageAt ? formatDate(conv.lastMessageAt) : ""}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastMessage || t("new_message")}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="bg-primary text-primary-foreground text-[10px] rounded-full min-w-[1.15rem] h-[1.15rem] px-1 flex items-center justify-center font-medium shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground/70 capitalize mt-0.5">
                        {t(normalizeRole(other?.role || ""))}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Message Area / New Conversation Panel */}
        <div
          className={cn(
            "flex-1 flex-col bg-background",
            !showNewChat && !activeConvId ? "hidden md:flex" : "flex",
          )}
        >
          {showNewChat ? (
            <div className="flex-1 flex flex-col">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {t("start_new_chat")}
                </h3>
                <button
                  onClick={() => setShowNewChat(false)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3 border-b border-border/50 flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  autoFocus
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder={t("search_users")}
                  className="w-full bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/60"
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                {loadingUsers ? (
                  <div className="p-4 text-muted-foreground text-sm">
                    {t("loading")}
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-4 text-muted-foreground text-sm">
                    {t("no_users_available")}
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const existing = conversations.find(
                      (c) =>
                        getOtherUser(c, userId)?.id === u.id,
                    );
                    return (
                      <button
                        key={u.id}
                        onClick={() => startConversation(u.id)}
                        className="w-full text-left px-4 py-3 border-b border-border/50 hover:bg-accent/50 transition-colors flex items-center gap-3"
                      >
                        <Avatar name={u.name} userId={u.id} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{u.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {t(normalizeRole(u.role))}
                            {existing && ` \u2022 ${t("existing_conversation")}`}
                          </p>
                        </div>
                        <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : !activeConvId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{t("select_contact")}</p>
                <button
                  onClick={openNewChat}
                  className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t("start_new_chat")}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                <button
                  onClick={() => {
                    setActiveConvId(null);
                    setShowNewChat(false);
                  }}
                  className="md:hidden h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors shrink-0"
                  title={t("back")}
                  aria-label={t("back")}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <Avatar
                  name={otherUser?.name || "?"}
                  userId={activeConvId}
                />
                <div>
                  <p className="font-medium text-sm">{otherUser?.name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {t(normalizeRole(otherUser?.role || ""))}
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
                              "max-w-[85%] md:max-w-[70%] rounded-xl px-3 py-2 text-sm",
                              isMe
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted",
                            )}
                          >
                          <p className="break-words">{msg.message}</p>
                          <p
                            className={cn(
                              "text-[10px] mt-1 flex items-center gap-[3px]",
                              isMe
                                ? "justify-end text-primary-foreground/70"
                                : "text-muted-foreground",
                            )}
                          >
                            <span>{formatTime(msg.createdAt)}</span>
                            {isMe &&
                              (msg.readAt ? (
                                <CheckCheck
                                  className="h-3.5 w-3.5"
                                  strokeWidth={2.75}
                                />
                              ) : (
                                <Check
                                  className="h-3.5 w-3.5"
                                  strokeWidth={2.75}
                                />
                              ))}
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