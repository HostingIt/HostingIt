import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (!title) {
    return (
      <Card className={cn("card-elevated border-border", className)}>
        <CardContent className="p-6">{children}</CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("card-elevated border-border", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="font-display text-lg text-ink">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4 pt-0">{children}</CardContent>
    </Card>
  );
}
