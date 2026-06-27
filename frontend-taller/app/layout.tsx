import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Taller Automotriz - Tu Mecánico de Confianza',
  description: 'Sistema de gestión de taller automotriz con citas, órdenes de trabajo y facturación',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  );
}
