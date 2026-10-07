export default function RootLayout(): string {
  return "root layout";
}

export function loader(): { title: string } {
  return { title: "root" };
}
