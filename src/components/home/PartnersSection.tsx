import { motion } from 'framer-motion';
import soundsliceLogo from '@/assets/partners/soundslice.png';

const partners = [
  {
    name: 'Songlines',
    logo: soundsliceLogo,
    description: 'The leading world music magazine',
    invert: false,
  },
  {
    name: 'Afropop Worldwide',
    logo: soundsliceLogo,
    description: 'Documenting African music',
    invert: false,
  },
  {
    name: 'Soundslice',
    logo: soundsliceLogo,
    description: 'Advanced learning technology',
    invert: false,
  },
];

export function PartnersSection() {
  return (
    <section className="py-12 md:py-16 border-t border-border/50">
      <div className="max-w-5xl mx-auto px-4">
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
            <motion.div
              key={partner.name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="flex flex-col items-center gap-3"
            >
              <img
                src={partner.logo}
                alt={partner.name}
                className={`h-10 md:h-12 w-auto object-contain ${partner.invert ? 'invert' : ''}`}
              />
              <span className="text-sm text-muted-foreground text-center max-w-[160px]">
                {partner.description}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
