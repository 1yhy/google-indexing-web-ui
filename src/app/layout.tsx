import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Google Indexing Web UI",
  description: "A web interface for Google Indexing API",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
