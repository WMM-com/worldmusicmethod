import { motion } from 'framer-motion';
import songlinesLogo from '@/assets/partners/songlines-logo.png';
import afropopLogo from '@/assets/partners/afropop-logo.png';
import soundsliceLogo from '@/assets/partners/soundslice-logo.png';

const partners = [
  {
    name: 'Songlines',
    logo: songlinesLogo,
    description: 'The leading world music magazine',
    url: 'https://www.songlines.co.uk/',
  },
  {
    name: 'Afropop Worldwide',
    logo: afropopLogo,
    description: 'Award-winning African radio programs',
    url: 'https://www.afropop.org/',
  },
  {
    name: 'Soundslice',
    logo: soundsliceLogo,
    description: 'Advanced learning technology',
    url: 'https://www.soundslice.com/',
  },
];

export function PartnersSection() {
  return (
    <section className="py-12 md:py-16 border-t border-border/50 relative overflow-hidden">
      {/* Subtle decorative background */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle at 20% 50%, hsl(var(--primary)) 0%, transparent 50%), radial-gradient(circle at 80% 50%, hsl(var(--secondary)) 0%, transparent 50%)',
      }} />

      <div className="max-w-5xl mx-auto px-4 relative">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center text-sm uppercase tracking-[0.2em] text-muted-foreground mb-10"
        >
          Partnered With
        </motion.p>

        <div className="flex items-center justify-center gap-12 md:gap-20 flex-wrap">
          {partners.map((partner, idx) => (
            <motion.a
              key={partner.name}
              href={partner.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="flex flex-col items-center gap-3 group"
            >
              <div className="h-14 md:h-16 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className="h-full w-auto object-contain max-w-[160px]"
                />
              </div>
              <span className="text-sm text-muted-foreground text-center max-w-[160px] group-hover:text-foreground transition-colors">
                {partner.description}
              </span>
            </motion.a>
          ))}
        </div>

        {/* Decorative divider line */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-10 h-px bg-gradient-to-r from-transparent via-border to-transparent"
        />
      </div>
    </section>
  );
}
