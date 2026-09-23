import { Inter, Space_Mono } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';

export const classicInter = Inter({
  subsets: ['latin'],
  variable: '--font-classic-inter',
  display: 'swap',
});

export const classicSpaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-classic-mono',
  display: 'swap',
});

/** Geist + Inter + Space Mono CSS variable classes for the classic term sheet. */
export const classicTermFontVariables = [
  classicInter.variable,
  GeistSans.variable,
  classicSpaceMono.variable,
].join(' ');
