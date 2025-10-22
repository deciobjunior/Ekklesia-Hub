import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Ekklesia Hub',
  description: 'A management platform for multi-congregation churches.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} notranslate`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script type="module">
          {`// Import the functions you need from the SDKs you need
          import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
          import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-analytics.js";
          // TODO: Add SDKs for Firebase products that you want to use
          // https://firebase.google.com/docs/web/setup#available-libraries

          // Your web app's Firebase configuration
          // For Firebase JS SDK v7.20.0 and later, measurementId is optional
          const firebaseConfig = {
            apiKey: "AIzaSyBJ_VTVI7iEap2Iv9_7xRk3m3TS-ahLARY",
            authDomain: "ekklesia-hub.firebaseapp.com",
            projectId: "ekklesia-hub",
            storageBucket: "ekklesia-hub.firebasestorage.app",
            messagingSenderId: "219555752538",
            appId: "1:219555752538:web:7d431d94d3c7005202c663",
            measurementId: "G-0GRD6RTFLC"
          };

          // Initialize Firebase
          const app = initializeApp(firebaseConfig);
          const analytics = getAnalytics(app);`}
        </script>
      </head>
      <body className="font-body antialiased">
         <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
