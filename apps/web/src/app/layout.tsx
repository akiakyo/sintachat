import type { Metadata } from "next";
import "./globals.css";
import ConsentGuard from "../components/ConsentGuard";
import RouteTransition from "../components/RouteTransition";
export const metadata:Metadata={title:"SintaChat",description:"Anonymous student conversations",icons:{icon:"/assets/logo.png",apple:"/assets/logo.png"}};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en" suppressHydrationWarning>
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:ital,wght@0,600;1,600&display=swap" rel="stylesheet"/>
    </head>
    <body>
      <ConsentGuard>{children}</ConsentGuard>
      <RouteTransition/>
    </body>
  </html>
}
