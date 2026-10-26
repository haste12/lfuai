"use client";
import { createContext, useContext, useEffect, useState } from "react";

const TRANSLATIONS = {
  en: {
    dir: "ltr",
    lang: "en",
    // Navbar
    aiChat: "AI Chat",
    admin: "Admin",
    login: "Login",
    getStarted: "Get Started",
    logout: "Logout",
    // Profile
    yourProfile: "Your Profile",
    displayName: "Display Name",
    enterYourName: "Enter your name",
    saveChanges: "Save Changes",
    saving: "Saving...",
    profileUpdated: "Profile updated successfully!",
    profileFailed: "Failed to update profile.",
    changeTheme: "Change Theme",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    language: "Language",
    // Chat
    placeholder: "Ask about LFU courses, faculty, departments...",
    newConversation: "New Conversation",
    recentChats: "Recent Chats",
    newChat: "New Chat",
    online: "Online",
    enterToSend: "Enter to send · Shift+Enter for new line",
    loadingText: "Loading LFU AI...",
    usage: "Usage",
    // Intro
    welcomeTitle: "Welcome to LFU AI",
    welcomeBody: "I am the first AI assistant dedicated to Lebanese French University. I can help you learn about professors, department heads, course offerings, schedules, and all world knowledge — all in one place.",
    welcomeSub: "Powered by advanced AI · Available 24/7",
    start: "Start Chatting",
    back: "Back",
    chooseLanguage: "Choose Your Language",
    chooseLanguageSub: "Select the language you'd like to use with LFU AI",
    // Features
    lfuFull: "Lebanese French University",
    worldKnowledge: "World Knowledge",
    available: "24/7",
  },
  ar: {
    dir: "rtl",
    lang: "ar",
    aiChat: "المحادثة الذكية",
    admin: "المشرف",
    login: "تسجيل الدخول",
    getStarted: "ابدأ الآن",
    logout: "تسجيل الخروج",
    yourProfile: "ملفك الشخصي",
    displayName: "الاسم المعروض",
    enterYourName: "أدخل اسمك",
    saveChanges: "حفظ التغييرات",
    saving: "جاري الحفظ...",
    profileUpdated: "تم تحديث الملف الشخصي بنجاح!",
    profileFailed: "فشل تحديث الملف الشخصي.",
    changeTheme: "تغيير المظهر",
    darkMode: "الوضع الداكن",
    lightMode: "الوضع الفاتح",
    language: "اللغة",
    placeholder: "اسأل عن مواد LFU، الأساتذة، الأقسام...",
    newConversation: "محادثة جديدة",
    recentChats: "المحادثات الأخيرة",
    newChat: "محادثة جديدة",
    online: "متصل",
    enterToSend: "Enter للإرسال · Shift+Enter لسطر جديد",
    loadingText: "جاري تحميل LFU AI...",
    usage: "الاستخدام",
    welcomeTitle: "مرحباً بك في LFU AI",
    welcomeBody: "أنا المساعد الذكي الأول المخصص لجامعة اللبنانية الفرنسية. يمكنني مساعدتك في التعرف على أساتذتك ورؤساء الأقسام والمواد الدراسية والجداول وجميع المعلومات العلمية.",
    welcomeSub: "مدعوم بالذكاء الاصطناعي المتقدم · متاح على مدار الساعة",
    start: "ابدأ المحادثة",
    back: "رجوع",
    chooseLanguage: "اختر لغتك",
    chooseLanguageSub: "اختر اللغة التي تريد استخدامها مع LFU AI",
    lfuFull: "جامعة اللبنانية الفرنسية",
    worldKnowledge: "معرفة عالمية",
    available: "٢٤/٧",
  },
  ku: {
    dir: "rtl",
    lang: "ku",
    aiChat: "AI گفتوگۆ",
    admin: "بەڕێوەبەر",
    login: "چوونەژوورەوە",
    getStarted: "دەست پێ بکە",
    logout: "دەرچوون",
    yourProfile: "پرۆفایلەکەت",
    displayName: "ناوی پیشاندان",
    enterYourName: "ناوەکەت بنووسە",
    saveChanges: "پاشەکەوت بکە",
    saving: "پاشەکەوت دەکرێت...",
    profileUpdated: "پرۆفایل بەسەرکەوتوویی نوێ کرایەوە!",
    profileFailed: "نوێکردنەوەی پرۆفایل سەرنەکەوت.",
    changeTheme: "گۆڕینی ڕووکار",
    darkMode: "دۆخی تاریک",
    lightMode: "دۆخی ڕووناک",
    language: "زمان",
    placeholder: "دەربارەی مامۆستا، بەش یان وانە بپرسە...",
    newConversation: "گفتوگۆی نوێ",
    recentChats: "گفتوگۆە دواییەکان",
    newChat: "گفتوگۆی نوێ",
    online: "ئۆنلاین",
    enterToSend: "Enter بۆ ناردن · Shift+Enter بۆ ڕیزی نوێ",
    loadingText: "LFU AI باردەکرێت...",
    usage: "بەکارهێنان",
    welcomeTitle: "بەخێربێن بۆ LFU AI",
    welcomeBody: "بەخێربێن بۆ زیرەکی دەستکردی ( LFU AI ) یەکەمین زیرەکی دەستکرد تایبەت بە زانکۆی لوبنانی فەرەنسی. لێرەدەتوانی ناوی مامۆستاکانت و سەرۆک بەشەکانت و ئەو وانانەی دەیڵێنەوە و سەرجەم زانیاریە جیهانییەکان بزانی.",
    welcomeSub: "بە زیرەکی دەستکردی پێشکەوتوو · ٢٤/٧ بەردەستە",
    start: "دەست پێ بکە",
    back: "گەڕانەوە",
    chooseLanguage: "زمانەکەت هەڵبژێرە",
    chooseLanguageSub: "زمانێک هەڵبژێرە کە دەتەوێت لەگەڵ LFU AI بەکاری بهێنیت",
    lfuFull: "زانکۆی لوبنانی فەرەنسی",
    worldKnowledge: "زانیاری جیهانی",
    available: "٢٤/٧",
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
    setLangState(saved);
    // Only set lang attribute for font rendering, never change dir
    document.documentElement.setAttribute("lang", saved);
    setMounted(true);
  }, []);

  const setLang = (newLang) => {
    if (!TRANSLATIONS[newLang]) return;
    setLangState(newLang);
    localStorage.setItem("lfu-lang", newLang);
    // Only update lang attr for font rendering, layout stays LTR always
    document.documentElement.setAttribute("lang", newLang);
  };

  if (!mounted) return null;

  return (
    <LanguageContext.Provider value={{ lang, t: TRANSLATIONS[lang], setLang, translations: TRANSLATIONS }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
export { TRANSLATIONS };
