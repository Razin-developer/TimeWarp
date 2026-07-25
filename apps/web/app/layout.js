import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "TIME WARP - LITERALLY THE BEST WAYBACK EXTENSION EVER",
  description: "travel back in time in your sidebar (no lag allowed!!!)",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script 
          src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js" 
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
