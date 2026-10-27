import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"] });

/** Variables CSS des polices, à poser sur <html> (layout racine et global-error). */
export const fontVariables = `${geistSans.variable} ${geistMono.variable} ${display.variable}`;
