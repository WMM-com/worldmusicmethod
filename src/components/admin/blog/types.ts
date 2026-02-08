export interface BlogPostRow {
  id: string;
  slug: string;
  title: string;
  content: string | null;
  excerpt: string | null;
  featured_image: string | null;
  author_name: string | null;
  published_at: string | null;
  categories: string[] | null;
  tags: string[] | null;
  reading_time: number | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}
