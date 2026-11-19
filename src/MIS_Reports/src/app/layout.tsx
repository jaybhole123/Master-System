import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import DateInputPlaceholder from '@/components/DateInputPlaceholder';
import NumberInputSelectOnFocus from '@/components/NumberInputSelectOnFocus';
import { ThemeProvider } from '@/components/theme-provider';
import Redux_Provider_Wrapper, { TanstackQueryWrapper } from '@/store/provideWrapper';

export const metadata: Metadata = {
  title: 'Inventory Management System',
  description: 'Inventory Management System (IMS)',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" style={{ colorScheme: 'light' }} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                document.documentElement.classList.remove('dark');
                document.documentElement.classList.add('light');
                if (window.self !== window.top || window.location.search.includes('embed=true')) {
                  document.documentElement.classList.add('is-embedded');
                  var style = document.createElement('style');
                  style.innerHTML = 'aside, header { display: none !important; } main { padding: 1.5rem !important; width: 100% !important; max-width: 100% !important; } body, html { background-color: #f8fafc !important; color: #0f172a !important; }';
                  document.head.appendChild(style);
                }
              } catch(e) {}
            `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false} disableTransitionOnChange>
          <TanstackQueryWrapper>
            <NumberInputSelectOnFocus />
            <DateInputPlaceholder />
            <Toaster position="top-center" richColors />
            <Redux_Provider_Wrapper>{children}</Redux_Provider_Wrapper>
          </TanstackQueryWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
