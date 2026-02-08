import { useState } from 'react';
import DOMPurify from 'dompurify';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BlogPostContentProps {
  content: string;
}

export function BlogPostContent({ content }: BlogPostContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const sanitized = DOMPurify.sanitize(content);

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
          className="prose prose-invert prose-lg max-w-none
            prose-headings:font-display prose-headings:text-foreground prose-headings:tracking-tight
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-5
            prose-li:text-muted-foreground prose-li:leading-relaxed
            prose-strong:text-foreground prose-strong:font-semibold
            prose-blockquote:border-l-4 prose-blockquote:border-secondary prose-blockquote:bg-card/50
            prose-blockquote:rounded-r-lg prose-blockquote:py-4 prose-blockquote:px-6
            prose-blockquote:text-foreground prose-blockquote:italic prose-blockquote:not-italic
            prose-blockquote:font-medium prose-blockquote:text-lg
            prose-a:text-secondary prose-a:no-underline hover:prose-a:underline
            prose-ul:space-y-2 prose-ol:space-y-2
            prose-img:rounded-lg"
          dangerouslySetInnerHTML={{ __html: sanitized }}
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
