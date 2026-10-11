import "./globals.css";
import { Sora } from "next/font/google";
import P from "./providers";
const f = Sora({ subsets: ["latin"], variable: "--f" });
export const metadata = { title: "VOIDKIN", description: "Trade spot, pay friends by ID, and send red packets on VOIDKIN.", icons: { icon: "/logo.jpg" } };
export default function L({ children }) { return <html lang="en"><body className={f.variable + " font-sans"}><P>{children}</P></body></html>; }
