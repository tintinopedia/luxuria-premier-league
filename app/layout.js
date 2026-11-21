import './globals.css';
import Providers from '@/components/Providers';
import Header from '@/components/Header';
import Gate from '@/components/Gate';
import { BottomNav } from '@/components/Pwa';

export const metadata = {
  title: 'Luxuria Premier League',
  description: 'Live scores, fixtures, news, videos and photos from the Luxuria Premier League T20.',
  manifest: '/manifest.webmanifest',
  applicationName: 'LPL',
  appleWebApp: { capable: true, title: 'LPL', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#06080f',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          <Gate>
            <main className="min-h-[70vh] pb-20 lg:pb-0">{children}</main>
          </Gate>
          <footer className="mb-16 mt-16 border-t border-white/[0.06] py-8 text-center text-xs text-slate-500 lg:mb-0">
            © {new Date().getFullYear()} Luxuria Premier League · T20 Cricket
          </footer>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
