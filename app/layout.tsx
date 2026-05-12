import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Poker Wallet",
  description: "Virtual chips for in-person poker games",
};

export default function RootLayout(props: any) {
  return (
    <html lang="en">
      <body>{props.children}</body>
    </html>
  );
}
