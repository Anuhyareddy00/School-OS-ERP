import "./globals.css";
import Link from "next/link";

export const metadata = { title: "School OS" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <div className="topbar">
            <div className="brand">School OS</div>
            <div className="row">
              <Link href="/">Home</Link>
              <Link href="/login">Login</Link>
              <Link href="/portal">Portal</Link>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>{children}</div>
        </div>
      </body>
    </html>
  );
}
