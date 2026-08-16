import type { Metadata } from "next";
import "./globals.css";
import ConsentGuard from "../components/ConsentGuard";
import RouteTransition from "../components/RouteTransition";
export const metadata:Metadata={title:"SintaChat",description:"Anonymous student conversations"};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en" suppressHydrationWarning>
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;1,600&display=swap" rel="stylesheet"/>
    </head>
    <body>
      <ConsentGuard>{children}</ConsentGuard>
      <RouteTransition/>
    </body>
  </html>
}
