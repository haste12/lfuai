"use client";
import { createContext, useContext, useEffect, useState } from "react";

const TRANSLATIONS = {
  en: {
    dir: "ltr",
    lang: "en",
    langLabel: "English",
    // Auth
    login: "Log In",
    register: "Sign Up",
    logout: "Sign Out",
    continueAsGuest: "Continue as Guest",
    getStarted: "Get Started",
    // Sidebar
    newChat: "New Chat",
    recentChats: "Recent Chats",
    searchChats: "Search conversations...",
    guestNotice: "Your chats are temporary. Create an account to save them.",
    noChatsYet: "No conversations yet",
    // Chat
    welcomeTitle: "How can I help you today?",
    welcomeSubtitle: "Ask LFU AI anything about your studies, your university, or beyond.",
    placeholder: "Message LFU AI...",
    send: "Send",
    stopGenerating: "Stop",
    online: "Online",
    enterToSend: "Press Enter to send · Shift+Enter for new line",
    disclaimer: "LFU AI can make mistakes. Verify important information.",
    loadingText: "Loading LFU AI...",
    // Suggestions
    suggestion1: "Help me understand a difficult topic",
    suggestion2: "Tell me about LFU university",
    suggestion3: "Help me prepare for an exam",
    suggestion4: "Explain a programming concept",
    // Conversation actions
    rename: "Rename",
    delete: "Delete",
    deleteConfirm: "Delete this conversation?",
    deleteConfirmBody: "This action cannot be undone.",
    cancel: "Cancel",
    confirm: "Confirm",
    save: "Save",
    saving: "Saving...",
    // Guest conversion
    saveConvTitle: "Save your conversation?",
    saveConvBody: "Would you like to save this conversation to your account?",
    saveConv: "Save Conversation",
    skipSave: "Continue Without Saving",
    // Profile
    yourProfile: "Profile",
    displayName: "Display Name",
    enterYourName: "Enter your name",
    saveChanges: "Save Changes",
    profileUpdated: "Profile updated!",
    profileFailed: "Failed to update profile.",
    // Settings
    settings: "Settings",
    appearance: "Appearance",
    language: "Language",
    darkMode: "Dark mode",
    lightMode: "Light mode",
    systemTheme: "System default",
    // Usage
    usage: "Usage",
    unlimited: "Unlimited messages",
    // Status
    typing: "LFU AI is thinking...",
    errorGeneric: "Something went wrong. Please try again.",
    retry: "Retry",
    // Intro modal
    welcomeTitle2: "Welcome to LFU AI",
    welcomeBody: "I am LFU's dedicated AI assistant. Ask me about professors, departments, courses, schedules, or any academic topic.",
    start: "Start Chatting",
    back: "Back",
    chooseLanguage: "Choose Your Language",
    // Misc
    aiChat: "LFU AI",
    admin: "Admin",
    copy: "Copy",
    copied: "Copied!",
    lfuFull: "Lebanese French University",
  },
  ar: {
    dir: "rtl",
    lang: "ar",
    langLabel: "العربية",
    login: "تسجيل الدخول",
    register: "إنشاء حساب",
    logout: "تسجيل الخروج",
    continueAsGuest: "المتابعة كضيف",
    getStarted: "ابدأ الآن",
    newChat: "محادثة جديدة",
    recentChats: "المحادثات الأخيرة",
    searchChats: "البحث في المحادثات...",
    guestNotice: "محادثاتك مؤقتة. أنشئ حساباً لحفظها.",
    noChatsYet: "لا توجد محادثات بعد",
    welcomeTitle: "كيف يمكنني مساعدتك اليوم؟",
    welcomeSubtitle: "اسأل LFU AI عن دراستك أو جامعتك أو أي شيء آخر.",
    placeholder: "اكتب رسالة إلى LFU AI...",
    send: "إرسال",
    stopGenerating: "إيقاف",
    online: "متصل",
    enterToSend: "اضغط Enter للإرسال · Shift+Enter لسطر جديد",
    disclaimer: "قد يرتكب LFU AI أخطاء. تحقق من المعلومات المهمة.",
    loadingText: "جارٍ تحميل LFU AI...",
    suggestion1: "ساعدني في فهم موضوع صعب",
    suggestion2: "أخبرني عن جامعة LFU",
    suggestion3: "ساعدني في التحضير لامتحان",
    suggestion4: "اشرح مفهوماً برمجياً",
    rename: "إعادة التسمية",
    delete: "حذف",
    deleteConfirm: "حذف هذه المحادثة؟",
    deleteConfirmBody: "لا يمكن التراجع عن هذا الإجراء.",
    cancel: "إلغاء",
    confirm: "تأكيد",
    save: "حفظ",
    saving: "جارٍ الحفظ...",
    saveConvTitle: "حفظ محادثتك؟",
    saveConvBody: "هل تريد حفظ هذه المحادثة في حسابك؟",
    saveConv: "حفظ المحادثة",
    skipSave: "المتابعة بدون حفظ",
    yourProfile: "الملف الشخصي",
    displayName: "الاسم المعروض",
    enterYourName: "أدخل اسمك",
    saveChanges: "حفظ التغييرات",
    profileUpdated: "تم تحديث الملف الشخصي!",
    profileFailed: "فشل تحديث الملف الشخصي.",
    settings: "الإعدادات",
    appearance: "المظهر",
    language: "اللغة",
    darkMode: "الوضع الداكن",
    lightMode: "الوضع الفاتح",
    systemTheme: "إعداد النظام",
    usage: "الاستخدام",
    unlimited: "رسائل غير محدودة",
    typing: "LFU AI يفكر...",
    errorGeneric: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
    retry: "إعادة المحاولة",
    welcomeTitle2: "مرحباً بك في LFU AI",
    welcomeBody: "أنا المساعد الذكي المخصص للجامعة اللبنانية الفرنسية. اسألني عن الأساتذة والأقسام والمواد والجداول.",
    start: "ابدأ المحادثة",
    back: "رجوع",
    chooseLanguage: "اختر لغتك",
    aiChat: "LFU AI",
    admin: "المشرف",
    copy: "نسخ",
    copied: "تم النسخ!",
    lfuFull: "الجامعة اللبنانية الفرنسية",
  },
  ku: {
    dir: "rtl",
    lang: "ku",
    langLabel: "کوردی",
    login: "چوونەژوورەوە",
    register: "دروستکردنی ئەکاونت",
    logout: "دەرچوون",
    continueAsGuest: "بەردەوام بە وەک میوان",
    getStarted: "دەست پێ بکە",
    newChat: "گفتوگۆی نوێ",
    recentChats: "گفتوگۆە دواییەکان",
    searchChats: "گەڕان لە گفتوگۆکان...",
    guestNotice: "گفتوگۆکانت کاتییە. ئەکاونتێک دروست بکە بۆ پاشەکەوتیان.",
    noChatsYet: "هێشتا گفتوگۆ نییە",
    welcomeTitle: "ئەمڕۆ چۆن دەتوانم یارمەتیت بدەم؟",
    welcomeSubtitle: "هەر شتێک لەبارەی خوێندنت یان زانکۆکەت بپرسە.",
    placeholder: "پەیامێک بۆ LFU AI بنووسە...",
    send: "ناردن",
    stopGenerating: "وەستان",
    online: "ئۆنلاین",
    enterToSend: "Enter دابگرە بۆ ناردن · Shift+Enter بۆ ڕیزی نوێ",
    disclaimer: "LFU AI دەکرێت هەڵە بکات. زانیاری گرنگ پشکنی بکە.",
    loadingText: "LFU AI باردەکرێت...",
    suggestion1: "یارمەتیم بدە تاکو بابەتێکی گرانم تێبگات",
    suggestion2: "دەربارەی زانکۆی LFU بمگە",
    suggestion3: "یارمەتیم بدە بۆ ئامادەبوون بۆ تاقیکردنەوە",
    suggestion4: "تێگەیشتنێکی ئامارسازی ڕوونبکەرەوە",
    rename: "ناونانی دووبارە",
    delete: "سڕینەوە",
    deleteConfirm: "ئەم گفتوگۆیە بسڕێتەوە؟",
    deleteConfirmBody: "ئەم کارە ناتوانرێت پووچەڵ بکرێتەوە.",
    cancel: "پاشگەزبوونەوە",
    confirm: "پشتڕاستکردنەوە",
    save: "پاشەکەوتکردن",
    saving: "پاشەکەوت دەکرێت...",
    saveConvTitle: "گفتوگۆکەت پاشەکەوت بکە؟",
    saveConvBody: "دەتەوێت ئەم گفتوگۆیە لە ئەکاونتەکەتدا پاشەکەوت بکەیت؟",
    saveConv: "گفتوگۆ پاشەکەوت بکە",
    skipSave: "بەردەوامبوون بەبێ پاشەکەوتکردن",
    yourProfile: "پرۆفایلەکەت",
    displayName: "ناوی پیشاندان",
    enterYourName: "ناوەکەت بنووسە",
    saveChanges: "گۆڕانکارییەکان پاشەکەوت بکە",
    profileUpdated: "پرۆفایل نوێ کرایەوە!",
    profileFailed: "نوێکردنەوەی پرۆفایل سەرنەکەوت.",
    settings: "ڕێکخستنەکان",
    appearance: "ڕووکار",
    language: "زمان",
    darkMode: "دۆخی تاریک",
    lightMode: "دۆخی ڕووناک",
    systemTheme: "ئامادەکاری سیستەم",
    usage: "بەکارهێنان",
    unlimited: "پەیامی نامحدود",
    typing: "LFU AI بیر دەکاتەوە...",
    errorGeneric: "هەڵەیەک ڕوویدا. تکایە دووبارە هەوڵبدەرەوە.",
    retry: "دووبارە هەوڵدان",
    welcomeTitle2: "بەخێربێن بۆ LFU AI",
    welcomeBody: "من یاریدەدەری زیرەکی دەستکردی تایبەتی زانکۆی لوبنانی فەرەنسیم. دەربارەی مامۆستا، بەش، وانە و جەدوەل بپرسە.",
    start: "دەست پێ بکە",
    back: "گەڕانەوە",
    chooseLanguage: "زمانەکەت هەڵبژێرە",
    aiChat: "LFU AI",
    admin: "بەڕێوەبەر",
    copy: "کۆپیکردن",
    copied: "کۆپی کرا!",
    lfuFull: "زانکۆی لوبنانی فەرەنسی",
  },
};

const LanguageContext = createContext({
  lang: "en",
  t: TRANSLATIONS.en,
  setLang: () => {},
  translations: TRANSLATIONS,
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("lfu-lang") || "en";
    const validLang = TRANSLATIONS[saved] ? saved : "en";
    setLangState(validLang);
    document.documentElement.setAttribute("lang", validLang);
    // Use data-lang-dir instead of dir so the layout chrome stays LTR
    document.documentElement.setAttribute("data-lang-dir", TRANSLATIONS[validLang].dir);
    setMounted(true);
  }, []);

  const setLang = (newLang) => {
    if (!TRANSLATIONS[newLang]) return;
    setLangState(newLang);
    localStorage.setItem("lfu-lang", newLang);
    // Set lang for font rendering & accessibility
    document.documentElement.setAttribute("lang", newLang);
    // IMPORTANT: Do NOT set dir="rtl" on <html> — that flips the entire page layout
    // including the sidebar. Instead we use data-lang-dir and target only
    // text content areas (messages, composer) via CSS selectors.
    document.documentElement.setAttribute("data-lang-dir", TRANSLATIONS[newLang].dir);
  };

  // Always render children — never return null.
  // Before mount (server + first paint) we use the default 'en' context value;
  // after useEffect fires the correct saved language is applied.
  // This prevents the hydration mismatch (removeChild crash).
  return (
    <LanguageContext.Provider value={{ lang, t: TRANSLATIONS[lang], setLang, translations: TRANSLATIONS }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
export { TRANSLATIONS };
