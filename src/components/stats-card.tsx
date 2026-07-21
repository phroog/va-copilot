import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

export function StatsCard({ title, value, icon }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
            <p className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">{value}</p>
          </div>
          <div className="text-slate-400 dark:text-slate-500">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
