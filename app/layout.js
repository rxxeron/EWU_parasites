import './globals.css';

export const metadata = {
  title: 'QueueStorm CRM - Ticket Classification',
  description: 'High-performance ticket sorting dashboard and API service.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
