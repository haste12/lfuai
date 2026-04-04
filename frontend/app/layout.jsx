import '../styles/globals.css';
import { AuthProvider } from '../context/AuthContext';

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
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="grid-bg" aria-hidden="true" />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
