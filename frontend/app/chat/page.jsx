"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { chatApi } from "../../lib/api";
import { db } from "../../lib/firebase";
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./page.module.css";

function TypingIndicator() {
  return (
    <div className={`${styles.message} ${styles.bot}`}>
      <div className={styles.avatar}>⬡</div>
      <div className={`${styles.bubble} ${styles.bubbleBot}`}>
        <span className={styles.typingDot} style={{ animationDelay: "0s" }} />
        <span
          className={styles.typingDot}
          style={{ animationDelay: "0.15s" }}
        />
        <span className={styles.typingDot} style={{ animationDelay: "0.3s" }} />
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "bot",
      text: "Hello! I am the Lebanese French University (LFU) AI Assistant. I can help you with information about courses, departments, faculty, student services, and general university inquiries. How may I assist you today?",
    },
  ]);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [limitInfo, setLimitInfo] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Prevent hydration mismatch — only render after client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/login");

    const getWelcomeMessage = () => {
      const namePart = userData?.displayName
        ? ` ${userData.displayName} `
        : " ";
      return {
        id: "welcome",
        role: "bot",
        text: `Hello${namePart}! I am the Lebanese French University (LFU) AI Assistant. I can help you with information about courses, departments, faculty, student services, and general university inquiries. How may I assist you today?`,
      };
    };

    const loadHistory = async () => {
      if (user) {
        try {
          const q = query(
            collection(db, "users", user.uid, "chats"),
            orderBy("updatedAt", "desc"),
          );
          const snap = await getDocs(q);

          let loadedChats = [];
          snap.forEach((docSnap) => {
            loadedChats.push({ id: docSnap.id, ...docSnap.data() });
          });

          setChats(loadedChats);

          if (loadedChats.length > 0) {
            const latest = loadedChats[0];
            const updatedTime = latest.updatedAt?.toMillis
              ? latest.updatedAt.toMillis()
              : latest.updatedAt?.seconds * 1000 || Date.now();
            const timeDiff = Date.now() - updatedTime;

            if (timeDiff > 4 * 60 * 1000) {
              setActiveChatId(null);
              setMessages([getWelcomeMessage()]);
            } else {
              setActiveChatId(latest.id);
              setMessages(latest.messages || [getWelcomeMessage()]);
            }
          } else {
            setActiveChatId(null);
            setMessages([getWelcomeMessage()]);
          }
        } catch (err) {
          console.error("Failed to load chat history", err);
          setActiveChatId(null);
          setMessages([getWelcomeMessage()]);
        }
      }
    };
    loadHistory();
  }, [user, loading, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const autoResizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const userMsg = { id: Date.now().toString(), role: "user", text: trimmed };
    const newMessagesAfterUser = [...messages, userMsg];
    setMessages(newMessagesAfterUser);
    setInput("");
    setSending(true);
    setError("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const res = await chatApi.sendMessage(
        trimmed,
        user.uid,
        userData?.displayName,
        messages,
      );
      const botMsg = {
        id: Date.now().toString() + "_bot",
        role: "bot",
        text: res.reply,
      };
      const finalMessages = [...newMessagesAfterUser, botMsg];

      setMessages(finalMessages);

      // Save history to Firebase
      if (user) {
        let currentChatId = activeChatId;
        let isNewChat = false;
        if (!currentChatId) {
          currentChatId = Date.now().toString();
          setActiveChatId(currentChatId);
          isNewChat = true;
        }

        const title = isNewChat
          ? trimmed.substring(0, 30) + (trimmed.length > 30 ? "..." : "")
          : undefined;
        const chatDocRef = doc(db, "users", user.uid, "chats", currentChatId);

        const saveData = {
          messages: finalMessages,
          updatedAt: new Date(),
        };
        if (title) saveData.title = title;

        await setDoc(chatDocRef, saveData, { merge: true });

        setChats((prev) => {
          let exists = false;
          let newChats = prev.map((c) => {
            if (c.id === currentChatId) {
              exists = true;
              return {
                ...c,
                messages: finalMessages,
                updatedAt: new Date(),
                title: title || c.title,
              };
            }
            return c;
          });
          if (!exists) {
            newChats = [
              {
                id: currentChatId,
                title: title || "New Chat",
                messages: finalMessages,
                updatedAt: new Date(),
              },
              ...prev,
            ];
          }
          return newChats.sort((a, b) => b.updatedAt - a.updatedAt);
        });
      }

      if (res.limitInfo) setLimitInfo(res.limitInfo);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewChat = () => {
    setActiveChatId(null);
    const namePart = userData?.displayName ? ` ${userData.displayName} ` : " ";
    setMessages([
      {
        id: "welcome",
        role: "bot",
        text: `Hello${namePart}! I am the Lebanese French University (LFU) AI Assistant. I can help you with information about courses, departments, faculty, student services, and general university inquiries. How may I assist you today?`,
      },
    ]);
    setLimitInfo("");
    setError("");
  };

  const loadSpecificChat = (chatId) => {
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      setActiveChatId(chatId);
      setMessages(chat.messages);
    }
  };

  const clearChat = async () => {
    if (user && activeChatId) {
      try {
        await deleteDoc(doc(db, "users", user.uid, "chats", activeChatId));
        setChats((prev) => prev.filter((c) => c.id !== activeChatId));
      } catch (err) {
        console.error("Failed to delete chat", err);
      }
    }
    startNewChat();
  };

  if (!mounted || loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      {/* Dark overlay — tapping it closes sidebar on mobile/tablet */}
      <div
        className={`${styles.sidebarOverlay} ${sidebarOpen ? styles.sidebarOverlayOpen : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}
      >
        <div className={styles.sidebarTop}>
          <button
            className={styles.newChatBtn}
            onClick={() => {
              startNewChat();
              setSidebarOpen(false);
            }}
          >
            + New Chat
          </button>

          <div className={styles.chatList}>
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`${styles.chatItem} ${chat.id === activeChatId ? styles.activeChatItem : ""}`}
                onClick={() => {
                  loadSpecificChat(chat.id);
                  setSidebarOpen(false);
                }}
              >
                <span className={styles.chatTitle}>
                  {chat.title || "New Chat"}
                </span>
              </div>
            ))}
          </div>

          {limitInfo && (
            <div className={styles.limitCard}>
              <p className={styles.limitLabel}>Usage</p>
              <p className={styles.limitText}>{limitInfo}</p>
            </div>
          )}
        </div>

        <div className={styles.sidebarBottom}>
          <div
            className={styles.sidebarUser}
            onClick={() => router.push("/profile")}
            style={{
              cursor: "pointer",
              transition: "background 0.2s",
              width: "100%",
            }}
          >
            <div className={styles.avatarLg}>
              {userData?.displayName?.[0]?.toUpperCase() ||
                user?.email?.[0]?.toUpperCase() ||
                "?"}
            </div>
            <div style={{ overflow: "hidden" }}>
              <p
                className={styles.sidebarName}
                style={{
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                {userData?.displayName || "Student"}
              </p>
              <p
                className={styles.sidebarEmail}
                style={{
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Chat window */}
      <div className={styles.chatArea}>
        {/* Header strip */}
        <div className={styles.chatHeader}>
          <div className={styles.headerLeft}>
            <button
              className={styles.hamburgerBtn}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle Sidebar"
            >
              ☰
            </button>
            <span className={styles.headerIcon}>⬡</span>
            <div>
              <p className={styles.headerTitle}>LFU AI Assistant</p>
              <p className={styles.headerSub}>
                <span className={styles.onlineDot} /> Online — powered by Gemini
                AI
              </p>
            </div>
          </div>
          <div className={styles.headerRight}>
            <button
              className={styles.mobileClearBtn}
              onClick={clearChat}
              aria-label="Clear chat"
              title="Clear Chat"
            >
              🗑
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className={styles.messages}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`${styles.message} ${msg.role === "user" ? styles.user : styles.bot}`}
              style={{ animationDelay: "0.05s" }}
            >
              {msg.role === "bot" && <div className={styles.avatar}>⬡</div>}
              <div
                className={`${styles.bubble} ${msg.role === "user" ? styles.bubbleUser : styles.bubbleBot}`}
              >
                {msg.role === "bot" ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.text}
                  </ReactMarkdown>
                ) : (
                  msg.text
                )}
              </div>
              {msg.role === "user" && (
                <div className={`${styles.avatar} ${styles.avatarUser}`}>
                  {userData?.displayName?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </div>
          ))}

          {sending && <TypingIndicator />}

          {error && <div className={styles.errorMsg}>⚠️ {error}</div>}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className={styles.inputArea}>
          <div className={styles.inputRow}>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              placeholder="Ask about LFU courses, faculty, departments..."
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autoResizeTextarea();
              }}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={sending}
            />
            <button
              className={`${styles.sendBtn} ${!input.trim() || sending ? styles.sendBtnDisabled : ""}`}
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              aria-label="Send message"
            >
              {sending ? "⏳" : "↑"}
            </button>
          </div>
          <p className={styles.inputHint}>
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
