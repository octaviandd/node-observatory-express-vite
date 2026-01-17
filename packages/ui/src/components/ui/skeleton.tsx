import { cn } from "@/utils.js";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      { 
    watchers...props}
    />
  );
}

export { Skeleton };
