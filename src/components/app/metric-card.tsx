import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
}

export function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-1 pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      {hint ? <CardContent className="pt-0 text-sm text-muted-foreground">{hint}</CardContent> : null}
    </Card>
  );
}
