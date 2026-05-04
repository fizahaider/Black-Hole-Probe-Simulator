import { useEffect } from 'react';
import Lenis from 'lenis';
import Cursor from '../components/Global/Cursor';
import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';
import HowItWorks from '../components/landing/HowItWorks';
import AISection from '../components/landing/AISection';
import CTA from '../components/landing/CTA';
import Footer from '../components/Global/Footer';

const LandingPage = () => {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden w-full custom-cursor">
      <Cursor />
      <Hero />
      <Features />
      <HowItWorks />
      <AISection />
      <CTA />
      <Footer />
    </div>
  );
};

export default LandingPage;

