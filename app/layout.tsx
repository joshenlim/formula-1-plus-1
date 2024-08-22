import { GeistSans } from "geist/font/sans";
import { Reddit_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import Providers from "./providers";
import { Toaster } from "@/components/ui/sonner";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

const reddit_mono = Reddit_Mono({
  subsets: ["latin"],
  variable: "--font-reddit-mono",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Formula 1+1 🏎️ 🧮",
  description: "It's like typeracer, but with Math",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn(GeistSans.className, reddit_mono.variable, "dark")}
    >
      <body className="bg-background text-foreground">
        <Providers>
          <TooltipProvider>
            <main className="min-h-screen flex flex-col items-center">
              {children}
            </main>
            <Toaster position="bottom-center" />
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
