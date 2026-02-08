import { Rocket, Handshake, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import wmmLogo from '@/assets/wmm-logo.png';

const ctaCards = [
  {
    icon: Rocket,
    title: 'Request a Demo',
    description: 'See how our platform can transform your creative workflow with a personalised walkthrough.',
    buttonText: 'Book Demo',
  },
  {
    icon: Handshake,
    title: 'Partner With Us',
    description: 'Join our growing network of artists, educators, and music organisations worldwide.',
    buttonText: 'Get in Touch',
  },
  {
    icon: Zap,
    title: 'Get Early Access',
    description: 'Be among the first to experience new features and shape the future of the platform.',
    buttonText: 'Sign Up',
  },
];

export function BlogCTASection() {
  return (
    <section className="bg-gradient-to-b from-card/50 to-background border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        {/* Header with logo */}
        <div className="flex flex-col items-center text-center mb-10 lg:mb-14">
          <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-6 shadow-lg shadow-secondary/20">
            <img src={wmmLogo} alt="Logo" className="h-10 w-10 object-contain" />
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display text-foreground max-w-2xl">
            Be Part of the Future Tech Revolution
          </h2>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ctaCards.map((card) => (
            <Card
              key={card.title}
              className="border-border bg-card hover:border-secondary/40 transition-all duration-300 text-center"
            >
              <CardContent className="p-6 sm:p-8 flex flex-col items-center">
                <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                  <card.icon className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                  {card.description}
                </p>
                <Button variant="secondary" className="w-full sm:w-auto">
                  {card.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
