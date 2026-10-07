export default function BlogPostPage(): string {
  return "blog post";
}

export function loader(): { postId: string } {
  return { postId: "1" };
}
