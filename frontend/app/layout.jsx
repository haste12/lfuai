import '../styles/globals.css';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { LanguageProvider } from '../context/LanguageContext';

export const metadata = {
  title: 'LFU AI — Lebanese French University Assistant',
  description: 'The official AI assistant of Lebanese French University. Get answers about courses, faculty, departments, and more.',
  keywords: ['LFU', 'AI', 'chatbot', 'Lebanese French University', 'university assistant'],
  openGraph: {
    title: 'LFU AI — Lebanese French University Assistant',
    description: 'Your intelligent university companion at LFU.',
    type: 'website',
  },
};

// Inline script to prevent theme flicker before React hydrates
const themeScript = `
  (function() {
    try {
      var stored = localStorage.getItem('lfu-theme');
      var theme = stored === 'dark' || stored === 'light'
        ? stored
        : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);
    } catch(e) {}
  })();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        {/* Prevent theme flash — runs before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider>
              {children}
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
