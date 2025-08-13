import './globals.css'; // ✅ Load Tailwind styles here

export const metadata = { title: 'BHC Global' };

import WidgetMount from './widget';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900">
        {children}
        <WidgetMount /> {/* Mount chat widget globally */}
      </body>
    </html>
  );
}
