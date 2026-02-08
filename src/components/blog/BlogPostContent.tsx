import DOMPurify from 'dompurify';

interface BlogPostContentProps {
  content: string;
}

export function BlogPostContent({ content }: BlogPostContentProps) {
  const sanitized = DOMPurify.sanitize(content);

  return (
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
  );
}
