import "./globals.css";
import RoleNav from "./components/role-nav";

export const metadata = { title: "School OS" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <div className="topbar">
            <div>
              <div className="brand">School OS</div>
              <div className="chip">OS Agent</div>
            </div>
            <RoleNav />
          </div>
          <div style={{ paddingTop: 16 }}>{children}</div>
        </div>
      </body>
    </html>
  );
}
