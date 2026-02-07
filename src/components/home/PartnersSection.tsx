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
    <section className="py-14 md:py-20 border-t border-border/50">
      <div className="max-w-6xl mx-auto px-4">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center text-sm uppercase tracking-[0.2em] text-muted-foreground mb-12"
        >
          Partnered With
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
          {partners.map((partner, idx) => (
            <motion.a
              key={partner.name}
              href={partner.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.12 }}
              className="flex flex-col items-center group rounded-xl border border-border/50 hover:border-primary/30 bg-card/50 p-8 transition-all duration-300"
            >
              <div className="flex-1 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className={`${partner.name === 'Soundslice' ? 'h-24 md:h-[7.5rem]' : 'h-16 md:h-20'} w-auto object-contain max-w-[200px]`}
                />
              </div>
              <span className="text-sm text-muted-foreground text-center group-hover:text-foreground transition-colors mt-4">
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
          className="mt-14 h-px bg-gradient-to-r from-transparent via-border to-transparent"
        />
      </div>
    </section>
  );
}
