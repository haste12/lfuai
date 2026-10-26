import '../styles/globals.css';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { LanguageProvider } from '../context/LanguageContext';

export const metadata = {
  title: 'LFU AI Assistant',
  description: 'The official AI assistant of Lebanese French University.',
  keywords: ['LFU', 'AI', 'university', 'chatbot', 'Lebanese French University'],
  openGraph: {
    title: 'LFU AI Assistant',
    description: 'Your intelligent university companion at LFU.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider>
              <div className="grid-bg" aria-hidden="true" />
              {children}
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
