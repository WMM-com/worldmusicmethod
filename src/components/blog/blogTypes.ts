export interface BlogAuthor {
  name: string;
  avatar: string;
}

export interface BlogPost {
  title: string;
  slug: string;
  heroImage: string;
  excerpt: string;
  content: string;
  author: BlogAuthor;
  date: string;
  readTime: string;
  categories: string[];
}

export interface BlogPopularPost {
  title: string;
  slug: string;
  thumbnail: string;
  date: string;
}

export interface BlogRelatedPost {
  title: string;
  slug: string;
  image: string;
  excerpt: string;
  readTime: string;
}
