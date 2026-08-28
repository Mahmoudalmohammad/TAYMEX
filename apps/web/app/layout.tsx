import type { ReactNode } from 'react';
import '@engineering-platform/design-tokens/tokens.css';
import '@engineering-platform/ui/styles.css';
import '@engineering-platform/app-shell/styles.css';
import './taymex.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
