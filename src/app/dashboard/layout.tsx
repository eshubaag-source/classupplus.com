// Server Component — can safely export metadata
import React from 'react';
import DashboardClient from './DashboardClient';

export const metadata = {
  title: 'Classupplus- School Management',
  description: 'Premium School Data Management System',
  icons: {
    icon: '/eschool-logo.png',
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardClient>{children}</DashboardClient>;
}
