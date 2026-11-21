'use client';
import { AuthProvider } from '@/lib/auth';
import { DataProvider } from '@/lib/data';
import { PwaProvider } from './Pwa';

export default function Providers({ children }) {
  return (
    <PwaProvider>
      <AuthProvider>
        <DataProvider>{children}</DataProvider>
      </AuthProvider>
    </PwaProvider>
  );
}
