export default function PublicBadgeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-screen text-white" style={{ background: "linear-gradient(180deg, #0a0a1a 0%, #131628 100%)" }}>
      {children}
    </div>
  );
}