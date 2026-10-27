'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Root page just redirects to /chat (works for both guests and authenticated users)
export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/chat');
  }, [router]);
  return null;
}
