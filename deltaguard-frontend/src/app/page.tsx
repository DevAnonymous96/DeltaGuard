import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/landing/Hero';
import { ProblemSection } from '@/components/landing/ProblemSection';
import { SolutionSection } from '@/components/landing/SolutionSection';
import { FeaturesGrid } from '@/components/landing/FeaturesGrid';
import { StatsSection } from '@/components/landing/StatsSection';
import { CTASection } from '@/components/landing/CTASection';

export default function LandingPage() {
  return (
    <>
      {/* Navigation Header */}
      <Header />
      
      <main className="min-h-screen">
        {/* Hero Section - The Hook */}
        <Hero />
      
        {/* Problem Section - Show the pain */}
        <ProblemSection />
        
        {/* Solution Section - How we solve it */}
        <SolutionSection />
        
        {/* Features Grid - What you get */}
        <FeaturesGrid />
        
        {/* Stats Section - Proof it works */}
        <StatsSection />
        
        {/* CTA Section - Get them to act */}
        <CTASection />
      </main>

      {/* Footer */}
      <Footer />
    </>
  );
}