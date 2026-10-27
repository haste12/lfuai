"use client";
import { useState, useRef, useEffect, useCallback } from "react";
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
  updateDoc,
  collection,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SourceCitations from "../../components/SourceCitations";
import styles from "./page.module.css";

// ─── Session Storage Keys ─────────────────────────────────────────────────────
const GUEST_SESSION_KEY = "lfu-guest-session-id";
const GUEST_CONV_KEY = "lfu-guest-conversation";

function getOrCreateGuestSessionId() {
  if (typeof window === "undefined") return "guest";
  let id = sessionStorage.getItem(GUEST_SESSION_KEY);
  if (!id) {
    id = "gs_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
    sessionStorage.setItem(GUEST_SESSION_KEY, id);
  }
  return id;
}

function saveGuestConversation(messages) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(GUEST_CONV_KEY, JSON.stringify(messages));
  } catch (_) {}
}

function loadGuestConversation() {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(GUEST_CONV_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function clearGuestConversation() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(GUEST_CONV_KEY);
}

// ─── SVG Icons ─────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16, strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const PlusIcon = () => <Icon d="M12 5v14M5 12h14" size={16} strokeWidth={2} />;
const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);
const MenuIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 12h18M3 6h18M3 18h18" />
  </svg>
);
const SunIcon = () => <Icon d="M12 7a5 5 0 100 10A5 5 0 0012 7zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" size={16} strokeWidth={1.8} />;
const MoonIcon = () => <Icon d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" size={16} strokeWidth={1.8} />;
const TrashIcon = () => <Icon d="M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" size={14} strokeWidth={1.8} />;
const EditIcon = () => <Icon d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" size={14} strokeWidth={1.8} />;
const ChatIcon = () => <Icon d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" size={14} strokeWidth={1.8} />;
const SearchIcon = () => <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" size={14} strokeWidth={1.8} />;
const CopyIcon = () => <Icon d="M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2M8 4a2 2 0 002 2h4a2 2 0 002-2M8 4a2 2 0 012-2h4a2 2 0 012 2" size={14} strokeWidth={1.8} />;
const CheckIcon = () => <Icon d="M20 6L9 17l-5-5" size={14} strokeWidth={2.2} />;
const XIcon = () => <Icon d="M18 6L6 18M6 6l12 12" size={16} strokeWidth={2} />;
const MoreIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
  </svg>
);
const UserIcon = () => <Icon d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" size={14} strokeWidth={1.8} />;
const SettingsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);
const GlobeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
  </svg>
);
const LogOutIcon = () => <Icon d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" size={14} strokeWidth={1.8} />;
const StopIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
  </svg>
);

// ─── LFU Logo ─────────────────────────────────────────────────────────────────
const LFULogo = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" rx="10" fill="#2563eb"/>
    <path d="M10 10h6v14h10v6H10V10z" fill="white" opacity="0.9"/>
    <path d="M28 10h-6v8h6v-8z" fill="white" opacity="0.7"/>
  </svg>
);

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className={styles.typingRow}>
      <div className={styles.botAvatar}><LFULogo size={20} /></div>
      <div className={styles.typingBubble}>
        <span className={styles.dot} style={{ animationDelay: "0s" }} />
        <span className={styles.dot} style={{ animationDelay: "0.15s" }} />
        <span className={styles.dot} style={{ animationDelay: "0.3s" }} />
      </div>
    </div>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyButton({ text, className }) {
  const [copied, setCopied] = useState(false);
  const { t } = useLang();
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };
  return (
    <button className={className || styles.copyBtn} onClick={handleCopy} title={copied ? t.copied : t.copy}>
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}

// ─── Message Item ─────────────────────────────────────────────────────────────
function MessageItem({ msg, userInitial }) {
  const isUser = msg.role === "user";
  return (
    <div className={`${styles.messageRow} ${isUser ? styles.userRow : styles.botRow}`}>
      {!isUser && (
        <div className={styles.botAvatar}><LFULogo size={20} /></div>
      )}
      <div className={`${styles.messageBubble} ${isUser ? styles.userBubble : styles.botBubble}`}>
        {isUser ? (
          <p className={styles.userText}>{msg.text}</p>
        ) : (
          <div className={styles.markdownBody}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ inline, className, children, ...props }) {
                  const content = String(children).replace(/\n$/, "");
                  if (inline) {
                    return <code className={styles.inlineCode} {...props}>{children}</code>;
                  }
                  return (
                    <div className={styles.codeBlock}>
                      <div className={styles.codeHeader}>
                        <span className={styles.codeLang}>{className?.replace("language-", "") || "code"}</span>
                        <CopyButton text={content} className={styles.codeHeaderCopy} />
                      </div>
                      <pre className={styles.pre}><code {...props}>{children}</code></pre>
                    </div>
                  );
                },
              }}
            >{msg.text}</ReactMarkdown>
            {/* Source citations from RAG knowledge base */}
            {msg.sources && msg.sources.length > 0 && (
              <SourceCitations sources={msg.sources} />
            )}
          </div>
        )}
        {!isUser && (
          <div className={styles.messageActions}>
            <CopyButton text={msg.text} />
          </div>
        )}
      </div>
      {isUser && (
        <div className={styles.userAvatar}>{userInitial}</div>
      )}
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ isOpen, title, body, onConfirm, onCancel, confirmLabel, confirmDanger }) {
  const { t } = useLang();
  if (!isOpen) return null;
  return (
    <div className={styles.dialogOverlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <h3 className={styles.dialogTitle}>{title}</h3>
        {body && <p className={styles.dialogBody}>{body}</p>}
        <div className={styles.dialogActions}>
          <button className={`btn btn-ghost ${styles.dialogBtn}`} onClick={onCancel}>{t.cancel}</button>
          <button
            className={`btn ${confirmDanger ? "btn-danger" : "btn-primary"} ${styles.dialogBtn}`}
            onClick={onConfirm}
          >{confirmLabel || t.confirm}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Save Guest Conversation Dialog ──────────────────────────────────────────
function SaveConvDialog({ isOpen, onSave, onSkip }) {
  const { t } = useLang();
  if (!isOpen) return null;
  return (
    <div className={styles.dialogOverlay}>
      <div className={styles.dialog}>
        <div className={styles.dialogIcon}>
          <ChatIcon />
        </div>
        <h3 className={styles.dialogTitle}>{t.saveConvTitle}</h3>
        <p className={styles.dialogBody}>{t.saveConvBody}</p>
        <div className={styles.dialogActions}>
          <button className={`btn btn-ghost ${styles.dialogBtn}`} onClick={onSkip}>{t.skipSave}</button>
          <button className={`btn btn-primary ${styles.dialogBtn}`} onClick={onSave}>{t.saveConv}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────
function SettingsPanel({ isOpen, onClose }) {
  const { t, lang, setLang, translations } = useLang();
  const { theme, setTheme } = useTheme();
  if (!isOpen) return null;
  return (
    <div className={styles.settingsOverlay} onClick={onClose}>
      <div className={styles.settingsPanel} onClick={e => e.stopPropagation()}>
        <div className={styles.settingsHeader}>
          <h3 className={styles.settingsTitle}>{t.settings}</h3>
          <button className={styles.closeBtn} onClick={onClose}><XIcon /></button>
        </div>

        <div className={styles.settingsSection}>
          <p className={styles.settingLabel}>{t.appearance}</p>
          <div className={styles.themeOptions}>
            {["light", "dark"].map(opt => (
              <button
                key={opt}
                className={`${styles.themeOption} ${theme === opt ? styles.themeOptionActive : ""}`}
                onClick={() => setTheme(opt)}
              >
                {opt === "light" ? <SunIcon /> : <MoonIcon />}
                <span>{opt === "light" ? t.lightMode : t.darkMode}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.settingsSection}>
          <p className={styles.settingLabel}>{t.language}</p>
          <div className={styles.langOptions}>
            {Object.entries(translations).map(([code, tr]) => (
              <button
                key={code}
                className={`${styles.langOption} ${lang === code ? styles.langOptionActive : ""}`}
                onClick={() => setLang(code)}
              >
                {tr.langLabel}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Chat Page ───────────────────────────────────────────────────────────
export default function ChatPage() {
  const { user, userData, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLang();
  const router = useRouter();

  // UI state
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Conversation action state
  const [contextMenu, setContextMenu] = useState({ open: false, chatId: null, top: 0, left: 0 });
  const [renaming, setRenaming] = useState({ chatId: null, value: "" });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, chatId: null });

  // Guest-to-auth state
  const [pendingGuestMessages, setPendingGuestMessages] = useState(null);
  const [saveConvOpen, setSaveConvOpen] = useState(false);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const guestSessionId = useRef(null);
  const menuBtnRefs = useRef({});

  // ─── Mount ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    guestSessionId.current = getOrCreateGuestSessionId();
    setMounted(true);
  }, []);

  // ─── Load data on auth state change ───────────────────────────────────────
  useEffect(() => {
    if (!mounted || loading) return;

    if (user) {
      // Authenticated: load Firebase history
      loadAuthHistory();

      // Check if guest had a conversation to offer saving
      const guestMsgs = loadGuestConversation();
      if (guestMsgs.length > 0) {
        setPendingGuestMessages(guestMsgs);
        setSaveConvOpen(true);
      }
    } else {
      // Guest: load from sessionStorage
      const saved = loadGuestConversation();
      setMessages(saved);
      setChats([]);
      setActiveChatId(null);
    }
  }, [user, loading, mounted]);

  // ─── Load Firebase history ────────────────────────────────────────────────
  const loadAuthHistory = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, "users", user.uid, "chats"),
        orderBy("updatedAt", "desc")
      );
      const snap = await getDocs(q);
      const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setChats(loaded);
      // Don't auto-open a conversation — show welcome screen
      setMessages([]);
      setActiveChatId(null);
    } catch (err) {
      console.error("Failed to load history", err);
    }
  };

  // ─── Scroll to bottom ─────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // ─── Auto-resize textarea ─────────────────────────────────────────────────
  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  // ─── Close context menu on outside click ──────────────────────────────────
  // (handled by backdrop overlay rendered when menu is open — see JSX)

  // ─── Send message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (overrideText) => {
    const trimmed = (overrideText || input).trim();
    if (!trimmed || sending) return;

    const userMsg = { id: `${Date.now()}_u`, role: "user", text: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setError("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // Persist guest session immediately
    if (!user) saveGuestConversation(nextMessages);

    try {
      const res = await chatApi.sendMessage(
        trimmed,
        user?.uid || null,
        userData?.displayName || null,
        messages,
        user ? null : guestSessionId.current
      );

      const botMsg = {
        id: `${Date.now()}_b`,
        role: "bot",
        text: res.reply || res,
        sources: res.sources || [],
      };
      const finalMessages = [...nextMessages, botMsg];
      setMessages(finalMessages);

      if (user) {
        // Save to Firebase for authenticated users
        await persistToFirebase(finalMessages, trimmed);
      } else {
        // Save to sessionStorage for guests
        saveGuestConversation(finalMessages);
      }
    } catch (err) {
      setError(err.message || t.errorGeneric);
    } finally {
      setSending(false);
    }
  }, [input, messages, sending, user, userData, t]);

  // ─── Persist to Firebase ──────────────────────────────────────────────────
  const persistToFirebase = async (finalMessages, firstMessage) => {
    if (!user) return;
    let currentId = activeChatId;
    let isNew = false;

    if (!currentId) {
      currentId = `chat_${Date.now()}`;
      setActiveChatId(currentId);
      isNew = true;
    }

    const title = isNew
      ? firstMessage.substring(0, 40) + (firstMessage.length > 40 ? "…" : "")
      : undefined;

    const docRef = doc(db, "users", user.uid, "chats", currentId);
    const saveData = { messages: finalMessages, updatedAt: new Date() };
    if (title) saveData.title = title;
    if (isNew) saveData.createdAt = new Date();

    await setDoc(docRef, saveData, { merge: true });

    setChats(prev => {
      const existing = prev.find(c => c.id === currentId);
      if (existing) {
        return prev.map(c =>
          c.id === currentId
            ? { ...c, messages: finalMessages, updatedAt: new Date() }
            : c
        ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      }
      return [{ id: currentId, title: title || "New Chat", messages: finalMessages, updatedAt: new Date(), createdAt: new Date() }, ...prev];
    });
  };

  // ─── Keyboard handler ─────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ─── New chat ─────────────────────────────────────────────────────────────
  const startNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setError("");
    if (!user) clearGuestConversation();
    setSidebarOpen(false);
  };

  // ─── Load specific chat ───────────────────────────────────────────────────
  const loadChat = (chatId) => {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    setActiveChatId(chatId);
    setMessages(chat.messages || []);
    setError("");
    setSidebarOpen(false);
    setContextMenu({ open: false, chatId: null, top: 0, left: 0 });
  };

  // ─── Rename conversation ──────────────────────────────────────────────────
  const startRename = (chatId, currentTitle) => {
    setRenaming({ chatId, value: currentTitle });
    setContextMenu(m => ({ ...m, open: false }));
  };

  // ─── Open options context menu ────────────────────────────────────────────
  const openContextMenu = (e, chatId) => {
    e.stopPropagation();
    e.preventDefault();

    // Toggle: clicking the same button closes the menu
    if (contextMenu.open && contextMenu.chatId === chatId) {
      setContextMenu({ open: false, chatId: null, top: 0, left: 0 });
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = 84;
    const menuWidth = 150;

    const fitsBelow = rect.bottom + menuHeight <= window.innerHeight - 10;
    const top = fitsBelow ? rect.bottom + 4 : Math.max(10, rect.top - menuHeight - 4);
    let left = rect.right - menuWidth;
    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8;

    setContextMenu({ open: true, chatId, top, left });
  };

  const commitRename = async () => {
    if (!renaming.chatId || !renaming.value.trim() || !user) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "chats", renaming.chatId), {
        title: renaming.value.trim(),
      });
      setChats(prev => prev.map(c =>
        c.id === renaming.chatId ? { ...c, title: renaming.value.trim() } : c
      ));
    } catch (err) {
      console.error("Rename failed", err);
    }
    setRenaming({ chatId: null, value: "" });
  };

  // ─── Delete conversation ──────────────────────────────────────────────────
  const confirmDelete = (chatId) => {
    setDeleteConfirm({ open: true, chatId });
    setContextMenu(m => ({ ...m, open: false }));
  };

  const executeDelete = async () => {
    const { chatId } = deleteConfirm;
    setDeleteConfirm({ open: false, chatId: null });
    if (!chatId || !user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "chats", chatId));
      setChats(prev => prev.filter(c => c.id !== chatId));
      if (activeChatId === chatId) startNewChat();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  // ─── Save guest conversation to account ──────────────────────────────────
  const saveGuestToAccount = async () => {
    setSaveConvOpen(false);
    if (!user || !pendingGuestMessages || pendingGuestMessages.length === 0) return;
    try {
      const firstUserMsg = pendingGuestMessages.find(m => m.role === "user");
      const title = firstUserMsg
        ? firstUserMsg.text.substring(0, 40) + (firstUserMsg.text.length > 40 ? "…" : "")
        : "Saved conversation";
      const newChatId = `chat_${Date.now()}`;
      await setDoc(doc(db, "users", user.uid, "chats", newChatId), {
        title,
        messages: pendingGuestMessages,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      setChats(prev => [{ id: newChatId, title, messages: pendingGuestMessages, createdAt: new Date(), updatedAt: new Date() }, ...prev]);
      setActiveChatId(newChatId);
      setMessages(pendingGuestMessages);
    } catch (err) {
      console.error("Failed to save guest conversation", err);
    }
    clearGuestConversation();
    setPendingGuestMessages(null);
  };

  const skipGuestSave = () => {
    setSaveConvOpen(false);
    clearGuestConversation();
    setPendingGuestMessages(null);
    startNewChat();
  };

  // ─── Log out ──────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await logout();
    setMessages([]);
    setChats([]);
    setActiveChatId(null);
  };

  // ─── Filtered chats for search ────────────────────────────────────────────
  const filteredChats = searchQuery
    ? chats.filter(c => (c.title || "").toLowerCase().includes(searchQuery.toLowerCase()))
    : chats;


  // ─── User initial ─────────────────────────────────────────────────────────
  const userInitial = (userData?.displayName || user?.email || "?")[0]?.toUpperCase() || "?";

  // ─── Loading screen ───────────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className={styles.loadingScreen}>
        <LFULogo size={48} />
        <p className={styles.loadingText}>{t.loadingText}</p>
      </div>
    );
  }

  return (
    <>
      {/* Dialogs */}
      <SaveConvDialog isOpen={saveConvOpen} onSave={saveGuestToAccount} onSkip={skipGuestSave} />
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        title={t.deleteConfirm}
        body={t.deleteConfirmBody}
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirm({ open: false, chatId: null })}
        confirmLabel={t.delete}
        confirmDanger
      />
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Chat Options Context Menu — backdrop closes on outside click */}
      {contextMenu.open && (
        <>
          {/* Transparent backdrop — click it to close the menu */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 999 }}
            onClick={() => setContextMenu({ open: false, chatId: null, top: 0, left: 0 })}
          />
          {/* The actual dropdown */}
          <div
            className={styles.contextMenu}
            style={{
              position: "fixed",
              top: `${contextMenu.top}px`,
              left: `${contextMenu.left}px`,
              zIndex: 1000,
            }}
          >
            <button
              type="button"
              className={styles.contextMenuItem}
              onClick={() => {
                const targetChat = chats.find(c => c.id === contextMenu.chatId);
                startRename(contextMenu.chatId, targetChat?.title || "");
              }}
            >
              <EditIcon />
              <span>{t.rename}</span>
            </button>
            <button
              type="button"
              className={`${styles.contextMenuItem} ${styles.contextMenuItemDanger}`}
              onClick={() => confirmDelete(contextMenu.chatId)}
            >
              <TrashIcon />
              <span>{t.delete}</span>
            </button>
          </div>
        </>
      )}

      <div className={styles.layout}>
        {/* Sidebar overlay (mobile) */}
        {sidebarOpen && (
          <div className={styles.sidebarOverlay} onClick={() => setSidebarOpen(false)} />
        )}

        {/* ─── Sidebar ───────────────────────────────────────────────────── */}
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
          {/* Brand */}
          <div className={styles.sidebarTop}>
            <div className={styles.sidebarBrand}>
              <LFULogo size={28} />
              <span className={styles.brandName}>LFU AI</span>
            </div>
            <button className={styles.newChatBtn} onClick={startNewChat}>
              <PlusIcon />
              <span>{t.newChat}</span>
            </button>
          </div>

          {/* Search (authenticated only) */}
          {user && (
            <div className={styles.searchWrap}>
              <SearchIcon />
              <input
                type="text"
                className={styles.searchInput}
                placeholder={t.searchChats}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {/* Conversation list */}
          <div className={styles.chatList}>
            {user ? (
              filteredChats.length > 0 ? (
                <>
                  <p className={styles.sectionLabel}>{t.recentChats}</p>
                  {filteredChats.map(chat => (
                    <div key={chat.id} className={styles.chatItemWrap}>
                      {renaming.chatId === chat.id ? (
                        <form onSubmit={e => { e.preventDefault(); commitRename(); }} className={styles.renameForm}>
                          <input
                            className={styles.renameInput}
                            value={renaming.value}
                            onChange={e => setRenaming(r => ({ ...r, value: e.target.value }))}
                            autoFocus
                            onBlur={commitRename}
                          />
                        </form>
                      ) : (
                        <div
                          className={`${styles.chatItem} ${chat.id === activeChatId ? styles.chatItemActive : ""}`}
                          onClick={() => loadChat(chat.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") loadChat(chat.id); }}
                        >
                          <ChatIcon />
                          <span className={styles.chatTitle}>{chat.title || t.newChat}</span>
                          <button
                            type="button"
                            ref={el => { menuBtnRefs.current[chat.id] = el; }}
                            className={`${styles.chatMenuBtn} ${contextMenu.open && contextMenu.chatId === chat.id ? styles.chatMenuBtnActive : ""}`}
                            onClick={e => openContextMenu(e, chat.id)}
                            title={t.rename + " / " + t.delete}
                            aria-label="Chat options"
                          >
                            <MoreIcon />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <p className={styles.emptyChats}>{searchQuery ? "No results" : t.noChatsYet}</p>
              )
            ) : (
              // Guest sidebar content
              <div className={styles.guestNotice}>
                <p className={styles.guestNoticeText}>{t.guestNotice}</p>
                <button className={`btn btn-primary ${styles.guestAuthBtn}`} onClick={() => router.push("/login")}>
                  {t.login}
                </button>
                <button className={`btn btn-ghost ${styles.guestAuthBtn}`} onClick={() => router.push("/register")}>
                  {t.register}
                </button>
              </div>
            )}
          </div>

          {/* Sidebar footer */}
          <div className={styles.sidebarFooter}>
            <button className={styles.sidebarFooterBtn} onClick={() => setSettingsOpen(true)}>
              <SettingsIcon />
              <span>{t.settings}</span>
            </button>
            <button className={styles.sidebarFooterBtn} onClick={toggleTheme}>
              {theme === "light" ? <MoonIcon /> : <SunIcon />}
              <span>{theme === "light" ? t.darkMode : t.lightMode}</span>
            </button>

            {user ? (
              <div className={styles.userCard}>
                <div className={styles.userAvatar}>{userInitial}</div>
                <div className={styles.userInfo} onClick={() => router.push("/profile")}>
                  <p className={styles.userName}>{userData?.displayName || user?.email?.split("@")[0]}</p>
                  <p className={styles.userEmail}>{user?.email}</p>
                </div>
                <button className={styles.logoutBtn} onClick={handleLogout} title={t.logout}>
                  <LogOutIcon />
                </button>
              </div>
            ) : (
              <div className={styles.guestCard}>
                <div className={styles.guestAvatarIcon}><UserIcon /></div>
                <span className={styles.guestLabel}>Guest</span>
                <button className={`btn btn-primary`} style={{ fontSize: "12px", padding: "6px 12px" }} onClick={() => router.push("/login")}>
                  {t.login}
                </button>
              </div>
            )}
          </div>
        </aside>


        {/* ─── Main Chat Area ──────────────────────────────────────────────── */}
        <div className={styles.chatArea}>
          {/* Header */}
          <header className={styles.chatHeader}>
            <button
              className={styles.menuBtn}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              <MenuIcon />
            </button>
            <div className={styles.headerCenter}>
              <LFULogo size={22} />
              <span className={styles.headerTitle}>LFU AI</span>
              <span className={styles.onlineDot} />
            </div>
            <div className={styles.headerActions}>
              <button
                className={styles.iconBtn}
                onClick={toggleTheme}
                aria-label="Toggle theme"
                title={theme === "light" ? t.darkMode : t.lightMode}
              >
                {theme === "light" ? <MoonIcon /> : <SunIcon />}
              </button>
              {messages.length > 0 && (
                <button
                  className={styles.iconBtn}
                  onClick={startNewChat}
                  aria-label="New chat"
                  title={t.newChat}
                >
                  <PlusIcon />
                </button>
              )}
            </div>
          </header>

          {/* Messages */}
          <main className={styles.messages} id="chat-messages">
            {messages.length === 0 ? (
              <div className={styles.welcomeScreen}>
                <div className={styles.welcomeLogo}>
                  <LFULogo size={52} />
                </div>
                <h1 className={styles.welcomeTitle}>{t.welcomeTitle}</h1>
                <p className={styles.welcomeSubtitle}>{t.welcomeSubtitle}</p>
              </div>
            ) : (
              <div className={styles.conversationBody}>
                {messages.map(msg => (
                  <MessageItem
                    key={msg.id}
                    msg={msg}
                    userInitial={userInitial}
                  />
                ))}
                {sending && <TypingIndicator />}
                {error && (
                  <div className={styles.errorBar}>
                    <XIcon />
                    <span>{error}</span>
                    <button className={styles.retryBtn} onClick={() => sendMessage()}>
                      {t.retry}
                    </button>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </main>

          {/* Composer */}
          <footer className={styles.composerArea}>
            <div className={styles.composerWrap}>
              <div className={`${styles.composerBox} ${sending ? styles.composerBoxSending : ""}`}>
                <textarea
                  ref={textareaRef}
                  className={styles.composerInput}
                  placeholder={t.placeholder}
                  value={input}
                  onChange={e => { setInput(e.target.value); autoResize(); }}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  disabled={sending}
                  aria-label="Message input"
                />
                <button
                  className={`${styles.sendBtn} ${(!input.trim() && !sending) ? styles.sendBtnDisabled : ""}`}
                  onClick={sending ? undefined : () => sendMessage()}
                  disabled={!input.trim() && !sending}
                  aria-label={t.send}
                >
                  {sending ? <StopIcon /> : <SendIcon />}
                </button>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
