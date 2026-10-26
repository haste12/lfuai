"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useLang } from "../../context/LanguageContext";
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
import IntroModal from "../../components/IntroModal";
import styles from "./page.module.css";

/* ─── SVG Icons ─────────────────────────────────────────────────────────── */
const BotIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M12 2v4M8 2h8"/>
    <circle cx="9" cy="16" r="1" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="16" r="1" fill="currentColor" stroke="none"/>
    <path d="M9 20h6"/>
  </svg>
);

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
  </svg>
);

const LoadingIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
  </svg>
);

const MenuIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 12h18M3 6h18M3 18h18"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);

const ChatIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
);

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/>
  </svg>
);

const ArrowIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6"/>
  </svg>
);

const LFULogoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5" opacity="0.8"/>
    <path d="M8 8l4 8 4-8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 12h10" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
  </svg>
);

/* ─── Typing Indicator ───────────────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div className={`${styles.message} ${styles.bot}`}>
      <div className={`${styles.avatar} ${styles.avatarBot}`}><BotIcon /></div>
      <div className={`${styles.bubble} ${styles.bubbleBot}`} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "14px 18px" }}>
        <span className={styles.typingDot} style={{ animationDelay: "0s" }} />
        <span className={styles.typingDot} style={{ animationDelay: "0.2s" }} />
        <span className={styles.typingDot} style={{ animationDelay: "0.4s" }} />
      </div>
    </div>
  );
}

/* ─── LFU Logo SVG ───────────────────────────────────────────────────────── */
const LFULogo = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="chatLogoGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6c63ff"/>
        <stop offset="1" stopColor="#00b4d8"/>
      </linearGradient>
    </defs>
    <path d="M50 5C25.1 5 5 23.4 5 46c0 11.8 5.2 22.5 13.6 30L14 92l18.5-8.4C37.1 85 43.4 86 50 86c24.9 0 45-18.4 45-40S74.9 5 50 5z" fill="url(#chatLogoGrad)"/>
    <circle cx="50" cy="46" r="22" fill="white" opacity="0.9"/>
    <path d="M50 28c0 0-3 9-9 12 6 3 9 12 9 12s3-9 9-12c-6-3-9-12-9-12z" fill="url(#chatLogoGrad)"/>
  </svg>
);

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function ChatPage() {
  const { user, userData, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLang();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  const [messages, setMessages] = useState([]);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [limitInfo, setLimitInfo] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/login");

    // Show intro for first-time users
    const introDone = localStorage.getItem("lfu-intro-done");
    if (user && !introDone) {
      setShowIntro(true);
    }

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
              setMessages([]);
            } else {
              setActiveChatId(latest.id);
              setMessages(latest.messages || []);
            }
          } else {
            setActiveChatId(null);
            setMessages([]);
          }
        } catch (err) {
          console.error("Failed to load chat history", err);
          setActiveChatId(null);
          setMessages([]);
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
      const res = await chatApi.sendMessage(trimmed, user.uid, userData?.displayName, messages);
      const botMsg = { id: Date.now().toString() + "_bot", role: "bot", text: res.reply };
      const finalMessages = [...newMessagesAfterUser, botMsg];
      setMessages(finalMessages);

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
        const saveData = { messages: finalMessages, updatedAt: new Date() };
        if (title) saveData.title = title;
        await setDoc(chatDocRef, saveData, { merge: true });

        setChats((prev) => {
          let exists = false;
          let newChats = prev.map((c) => {
            if (c.id === currentChatId) {
              exists = true;
              return { ...c, messages: finalMessages, updatedAt: new Date(), title: title || c.title };
            }
            return c;
          });
          if (!exists) {
            newChats = [{ id: currentChatId, title: title || "New Chat", messages: finalMessages, updatedAt: new Date() }, ...prev];
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
    setMessages([]);
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

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  if (!mounted || loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingLogo}><LFULogo size={48} /></div>
        <p className={styles.loadingText}>{t.loadingText}</p>
      </div>
    );
  }

  return (
    <>
      {/* First-time intro modal */}
      {showIntro && <IntroModal onComplete={handleIntroComplete} />}

      <div className={styles.layout}>
        {/* Sidebar overlay (mobile) */}
        <div
          className={`${styles.sidebarOverlay} ${sidebarOpen ? styles.sidebarOverlayOpen : ""}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Sidebar */}
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>

          {/* Brand header */}
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarBrand}>
              <div className={styles.brandLogo}><LFULogo size={22} /></div>
              <div>
                <p className={styles.brandName}>LFU AI</p>
                <p className={styles.brandSub}>University Assistant</p>
              </div>
            </div>
            <button
              className={styles.newChatBtn}
              onClick={() => { startNewChat(); setSidebarOpen(false); }}
            >
              <PlusIcon />
              {t.newConversation}
            </button>
          </div>

          {/* Chat history */}
          <div className={styles.sidebarTop}>
            {chats.length > 0 && <p className={styles.chatListLabel}>{t.recentChats}</p>}
            <div className={styles.chatList}>
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`${styles.chatItem} ${chat.id === activeChatId ? styles.activeChatItem : ""}`}
                  onClick={() => { loadSpecificChat(chat.id); setSidebarOpen(false); }}
                >
                  <span className={styles.chatItemIcon}><ChatIcon /></span>
                  <span className={styles.chatTitle}>{chat.title || t.newChat}</span>
                </div>
              ))}
            </div>
            {limitInfo && (
              <div className={styles.limitCard}>
                <p className={styles.limitLabel}>{t.usage}</p>
                <p className={styles.limitText}>{limitInfo}</p>
              </div>
            )}
          </div>

          {/* User footer */}
          <div className={styles.sidebarBottom}>
            <div className={styles.sidebarUser} onClick={() => router.push("/profile")}>
              <div className={styles.avatarLg}>
                {userData?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}
              </div>
              <div style={{ overflow: "hidden", flex: 1 }}>
                <p className={styles.sidebarName}>{userData?.displayName || "Student"}</p>
                <p className={styles.sidebarEmail}>{user?.email}</p>
              </div>
              <span className={styles.sidebarUserArrow}><ArrowIcon /></span>
            </div>
          </div>
        </aside>

        {/* Chat area */}
        <div className={styles.chatArea}>

          {/* Header */}
          <div className={styles.chatHeader}>
            <div className={styles.headerLeft}>
              <button className={styles.hamburgerBtn} onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle Sidebar">
                <MenuIcon />
              </button>
              <div className={styles.headerBadge}>
                <div className={styles.headerAvatarWrap}>
                  <div className={styles.headerAvatar}><LFULogo size={20} /></div>
                  <span className={styles.onlinePing} />
                </div>
                <div>
                  <p className={styles.headerTitle}>LFU AI Assistant</p>
                  <p className={styles.headerSub}>● {t.online}</p>
                </div>
              </div>
            </div>

            <div className={styles.headerRight}>
              {/* Theme toggle */}
              <button
                className={styles.themeBtn}
                onClick={toggleTheme}
                aria-label="Toggle theme"
                title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
              >
                {theme === "light" ? <MoonIcon /> : <SunIcon />}
              </button>
              {/* Clear chat */}
              <button className={styles.mobileClearBtn} onClick={clearChat} aria-label="Clear chat" title="Clear Chat">
                <TrashIcon />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className={styles.messages}>
            {messages.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyLogo}><LFULogo size={56} /></div>
                <h2 className={styles.emptyTitle}>LFU AI Assistant</h2>
                <p className={styles.emptySubtitle}>
                  {userData?.displayName ? `Welcome, ${userData.displayName}!` : "Welcome!"} How can I help you today?
                </p>
                <div className={styles.suggestions}>
                  {[
                    "What courses does LFU offer?",
                    "Who are the department heads?",
                    "Tell me about LFU university",
                    "What are the student services?",
                  ].map((s) => (
                    <button
                      key={s}
                      className={styles.suggestionChip}
                      onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`${styles.message} ${msg.role === "user" ? styles.user : styles.bot}`}
              >
                {msg.role === "bot" && (
                  <div className={`${styles.avatar} ${styles.avatarBot}`}><BotIcon /></div>
                )}
                <div className={`${styles.bubble} ${msg.role === "user" ? styles.bubbleUser : styles.bubbleBot}`}>
                  {msg.role === "bot" ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
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
            {error && (
              <div className={styles.errorMsg}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                {error}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className={styles.inputArea}>
            <div className={styles.inputRow}>
              <textarea
                ref={textareaRef}
                className={styles.textarea}
                placeholder={t.placeholder}
                value={input}
                onChange={(e) => { setInput(e.target.value); autoResizeTextarea(); }}
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
                {sending ? <LoadingIcon /> : <SendIcon />}
              </button>
            </div>
            <p className={styles.inputHint}>{t.enterToSend}</p>
          </div>
        </div>
      </div>
    </>
  );
}
