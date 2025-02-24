'use client';

import CostCalculator from './components/CostCalculator';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 py-12">
      <CostCalculator />
    </main>
  );
}