import { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BlogPostContentProps {
  content: string;
}

/**
 * Wrap bare iframes in a responsive 16:9 wrapper so they scale properly.
 * Skips iframes that are already inside a wrapper div.
 */
function wrapIframes(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  doc.querySelectorAll('iframe').forEach((iframe) => {
    const parent = iframe.parentElement;
    if (parent?.classList.contains('iframe-wrapper') || parent?.classList.contains('video-wrapper')) {
      return; // already wrapped
    }
    const wrapper = doc.createElement('div');
    wrapper.className = 'iframe-wrapper';
    parent?.insertBefore(wrapper, iframe);
    wrapper.appendChild(iframe);
  });

  return doc.body.innerHTML;
}

export function BlogPostContent({ content }: BlogPostContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const articleRef = useRef<HTMLElement>(null);

  // Sanitize allowing iframes for embeds (YouTube, Spotify, SoundCloud)
  const sanitized = DOMPurify.sanitize(content, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'src', 'title', 'loading'],
  });

  const processed = wrapIframes(sanitized);

  return (
    <div className="relative">
      {/* Content wrapper with truncation */}
      <div
        className={`transition-all duration-500 ease-in-out ${
          isExpanded
            ? 'max-h-none overflow-visible'
            : 'max-h-[500px] sm:max-h-[650px] overflow-hidden'
        }`}
      >
        <article
          ref={articleRef}
          className="prose prose-invert prose-lg max-w-none
            prose-headings:font-display prose-headings:text-foreground prose-headings:tracking-tight
            prose-h1:text-3xl sm:prose-h1:text-4xl prose-h1:mt-8 prose-h1:mb-5
            prose-h2:text-2xl sm:prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-xl sm:prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3
            prose-h4:text-lg prose-h4:mt-6 prose-h4:mb-2
            prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-5
            prose-li:text-muted-foreground prose-li:leading-relaxed prose-li:marker:text-secondary
            prose-strong:text-foreground prose-strong:font-semibold
            prose-blockquote:border-l-4 prose-blockquote:border-secondary prose-blockquote:bg-card/50
            prose-blockquote:rounded-r-lg prose-blockquote:py-4 prose-blockquote:px-6
            prose-blockquote:text-foreground prose-blockquote:not-italic
            prose-blockquote:font-medium prose-blockquote:text-lg
            prose-a:text-secondary prose-a:no-underline hover:prose-a:underline
            prose-ul:space-y-2 prose-ol:space-y-2
            prose-hr:border-border prose-hr:my-8
            prose-pre:bg-card prose-pre:border prose-pre:border-border prose-pre:rounded-xl
            prose-code:text-secondary prose-code:font-mono
            prose-table:border-collapse prose-th:bg-card prose-th:border prose-th:border-border prose-th:px-4 prose-th:py-2
            prose-td:border prose-td:border-border prose-td:px-4 prose-td:py-2
            prose-figure:my-8
            prose-figcaption:text-center prose-figcaption:text-muted-foreground prose-figcaption:text-sm prose-figcaption:mt-2"
          dangerouslySetInnerHTML={{ __html: processed }}
        />
      </div>

      {/* Gradient overlay + Read Full Blog button (only when collapsed) */}
      <div
        className={`transition-opacity duration-500 ease-in-out ${
          isExpanded ? 'opacity-0 pointer-events-none h-0' : 'opacity-100'
        }`}
      >
        {!isExpanded && (
          <div className="absolute bottom-0 left-0 right-0">
            {/* Gradient fade */}
            <div className="h-40 bg-gradient-to-t from-background via-background/80 to-transparent" />
            {/* Button container */}
            <div className="bg-background pb-2 flex justify-center">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setIsExpanded(true)}
                className="gap-2"
              >
                Read Full Blog
                <ChevronDown className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Show Less button (only when expanded) */}
      {isExpanded && (
        <div className="flex justify-center mt-8">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setIsExpanded(false)}
            className="gap-2"
          >
            Show Less
            <ChevronUp className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
