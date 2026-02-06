import { useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, Quote } from 'lucide-react';

import olivierAvatar from '@/assets/students/olivier.jpg';
import miriamaAvatar from '@/assets/students/miriama.jpg';
import billAvatar from '@/assets/students/bill.jpg';
import allanAvatar from '@/assets/students/allan.webp';
import geoffAvatar from '@/assets/students/geoff.webp';
import yvetteAvatar from '@/assets/students/yvette.webp';

interface StudentStory {
  name: string;
  country: string;
  avatar: string;
  quote: string;
}

const CHAR_LIMIT = 280;

const stories: StudentStory[] = [
  {
    name: 'Olivier Van Rooij',
    country: 'Netherlands',
    avatar: olivierAvatar,
    quote: `So a lot has changed since I first took that Malian guitar course with Vieux. Looking back, that was the moment everything shifted for me. From that day on, now almost three years ago, I've completely immersed myself in the music of Ali Farka Touré and, through him, the wider world of traditional Malian music. I've become captivated by styles like Takamba, Donso hunter music, and the storytelling traditions of Soninke griots such as Ganda Fadiga. It all still feels like a gift that keeps unfolding the more I give myself to it. The more love you give it the more it seems to love you back. My playing has grown a lot along this path, and I've been lucky to cross paths with people who helped me at exactly the right moments.\n\nAbout a year and a half ago, something surreal happened… I met Ali Farka Touré's wife. It was at a small concert by Bounaly (a student of Afel Bocoum). I knew Ali had a Dutch wife, so when she walked in before the show, I recognized her immediately. After building up the courage to approach her, we ended up talking for a while, and she took a liking to me. We exchanged numbers and stayed in touch.\n\nNot long after, she invited me to a gathering across the country, where Samba Touré and his group (Djimé Sissoko on ngoni and Souleyman Kané on calabash) were staying during a tour break. I was nervous but knew I had to go. That evening completely changed me. Seeing Samba play the guitar by himself was incredibly insightful in understanding how the music feels. And hearing them play in such an intimate setting without the showmanship of a concert, just sitting a few feet away was just incredible. Eventually they asked if I wanted to join, and even after countless hours studying Ali's recordings, I felt like a beginner thrown into the deep end. But that night became one of the most important moments in my development. Later, when things calmed down, Samba showed me a few licks I'd been struggling with, and it opened my eyes to details I had been missing... nuances and specific techniques you can't learn from recordings alone. The next morning, I was outside practicing when Samba came out, sat across from me. He said something along the lines of "No, you're playing it wrong", proceeded to gently take the guitar from my hands and demonstrate how to play it correctly, showing me the subtleties that make Ali's style the way it is.\n\nThanks again for everything you've helped set in motion. It's been amazing to see the progress WMM has made over the past few years. Honestly, watching it grow and expand has been inspiring in its own right.`,
  },
  {
    name: 'Miriama Broady',
    country: 'Germany',
    avatar: miriamaAvatar,
    quote: `I loved the intense period of learning new stuff. Rehearsals and gigs are in full swing now. I have added many things to our set, and written new songs and interludes directly based on World Music Method classes. One of the modified Sebene grooves from Niwel has become a song. I redid another song with a Makossa groove from Jeannot accompanying kora. Fleshed out a new version of Tura from Justin, as well as a new song featuring a desert-inspired groove that came out of the desert air.\n\nOther new original songs contain riffs and ideas inspired by Derek's classes on Total Desert immersion and another one coming using the doublegum octave technique from Vieux. This is all stuff for my band and performance. I also feel I have become a better teacher using inspiration from the method and some of the materials from the technique library. I haven't yet fully utilized the rhythm encyclopedia and backing track directory, but I will. The program has been the best thing to augment my skills as a musician and teacher. I am really grateful for it! Oh one last thing…I can now groove pretty well on a zouk beat on the drums.😉`,
  },
  {
    name: 'Bill Leff',
    country: 'USA',
    avatar: billAvatar,
    quote: `At my advanced age it's more about having fun and challenging yourself. Love the soukous stuff you put together on your site Edd. Never even thought about that music much until I stumbled on one of your adverts. Opened up a new musical world for me and helped me through the Covid years. I'm indebted to you for that!`,
  },
  {
    name: 'Allan Mwetu',
    country: 'Kenya',
    avatar: allanAvatar,
    quote: `Sir Edd, you truly are a life saver and an icon and I know that the footprint you've created by your contributions in World Music will last forever. Personally I am still practicing and still learning, I use my blue print and am soon to advance to Niwel's course, thank you so much mate and I'm among your biggest fans as well.\n\nMy course has been smooth and am honestly loving every single sound I'm hearing and learning out of the course. It truly is golden, I've been slow but by the time the year is over I truly will be almost 100% done. I am thankful that I'm a part of World Music Method and for how much you've put out there for the world to explore, to be honest nobody can thank you enough nor all those musician tutors who freely have passed on the priceless gift of music literacy.\n\nRecently I was fortunate enough to acquire a 24 fret electric guitar hence I'm back to my Central African Guitar classes, once am done I'll immediately jump right to my dream Congolese Guitar Evolution. Soon I'll be doing gigs in no time especially this upcoming Christmas season. Thank you and my humble blessing upon you.`,
  },
  {
    name: 'Geoff Carter',
    country: 'Wales',
    avatar: geoffAvatar,
    quote: `In my life, WMM has been an ever increasingly valuable friend. It's made me more of a master too in my own field of sacred dance. I had always muddled through self-taught until the teachers and encouragement here helped me with actual ease and delight in the task of becoming brilliant! Almost without noticing, through them sharing their knowledge and ability so readily.\n\nI found fresh energy with rhythm, melody line, chord progression and even with vocals with Camilo's facility in this. Respect for all the teachers and I am very grateful to you in particular, Edd for the warmth and empathy of your initial welcoming and continuing generosity of spirit.\n\nJust out of hospital again. Fortunately instinct brought me straight back to WMM as a support and to some of the high spots of my first year: Especially the hidden gem in Camilo's Right hand lesson that out of the blue segues into a brilliant concise intro to improv (with such a wealth of lessons maybe it's time for zip codes!).`,
  },
  {
    name: 'Yvette Rosa',
    country: 'USA',
    avatar: yvetteAvatar,
    quote: `Thank you for the check in. Great to be associated with you and your fantastic school! I really appreciate getting to explore all this music with amazing masters. I feel like I am attending a world music university, something I didn't think was possible. Right now I'm enjoying exploring different courses, with an emphasis on African bass. Everything you present is very thoughtful and comprehensive. I'm really glad to be here, thank you Edd for putting this all together and sharing it!`,
  },
];

function truncate(text: string, limit: number) {
  if (text.length <= limit) return { truncated: text, isTruncated: false };
  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return { truncated: cut.slice(0, lastSpace) + '…', isTruncated: true };
}

export function StudentStoriesSection() {
  const [selectedStory, setSelectedStory] = useState<StudentStory | null>(null);

  return (
    <>
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-4xl mb-4">
              In Their Own Words
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
              Real stories from musicians around the world whose lives have been transformed through music.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story, idx) => {
              const { truncated, isTruncated } = truncate(story.quote, CHAR_LIMIT);
              return (
                <motion.div
                  key={story.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.08 }}
                  className="group relative bg-card border border-border rounded-xl p-6 flex flex-col hover:border-primary/30 transition-colors"
                >
                  <Quote className="w-8 h-8 text-primary/20 mb-3 shrink-0" />
                  
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1 whitespace-pre-line">
                    "{truncated}"
                  </p>

                  {isTruncated && (
                    <button
                      onClick={() => setSelectedStory(story)}
                      className="text-primary text-sm font-medium mt-3 self-start hover:underline"
                    >
                      Read full story →
                    </button>
                  )}

                  <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border">
                    <img
                      src={story.avatar}
                      alt={story.name}
                      className="w-10 h-10 rounded-full object-cover bg-muted"
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{story.name}</p>
                      <p className="text-xs text-muted-foreground">{story.country}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Full Story Popup */}
      <Dialog open={!!selectedStory} onOpenChange={(open) => !open && setSelectedStory(null)}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] p-0 gap-0 bg-background border-border overflow-hidden [&>button:last-child]:hidden">
          <button
            onClick={() => setSelectedStory(null)}
            className="absolute top-3 right-3 z-50 w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>

          {selectedStory && (
            <div className="p-6 md:p-8 overflow-y-auto max-h-[85vh]">
              <div className="flex items-center gap-4 mb-6">
                <img
                  src={selectedStory.avatar}
                  alt={selectedStory.name}
                  className="w-14 h-14 rounded-full object-cover bg-muted"
                />
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{selectedStory.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedStory.country}</p>
                </div>
              </div>

              <Quote className="w-10 h-10 text-primary/15 mb-4" />
              <div className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm md:text-base">
                "{selectedStory.quote}"
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
