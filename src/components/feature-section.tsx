import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const features = [
  {
    emoji: "🤖",
    title: "AI Pitch Generator",
    description: "Generate tailored pitches in seconds with our AI. Just paste a job link and let the magic happen.",
  },
  {
    emoji: "📊",
    title: "Pipeline Management",
    description: "Visualize your entire job hunt with a beautiful Kanban board. Drag and drop to update status.",
  },
  {
    emoji: "📅",
    title: "Smart Follow-ups",
    description: "Never miss a follow-up again. We remind you when to check in with clients automatically.",
  },
  {
    emoji: "🌍",
    title: "Multi-Language",
    description: "Speak your clients' language. English, Vietnamese, and Filipino supported out of the box.",
  },
  {
    emoji: "📈",
    title: "Analytics Dashboard",
    description: "Track your success rate, response times, and earnings all in one beautiful dashboard.",
  },
  {
    emoji: "🎮",
    title: "Gamified Experience",
    description: "Meet Mochi, your virtual pet! Stay motivated with daily mood checks and a lucky wheel.",
  },
];

export default function FeatureSection() {
  return (
    <section id="features" className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-slate-100">
            Everything You Need 🎯
          </h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
            Tools designed to help you win more clients
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <span className="text-4xl mb-2 block">{f.emoji}</span>
                <CardTitle className="text-lg">{f.title}</CardTitle>
                <CardDescription>{f.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
