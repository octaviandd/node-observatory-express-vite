/** @format */

import { Button } from "@/components/ui/base/button";

interface LoadMoreButtonProps {
  message: string | null;
  onLoadMore: () => void;
}

export function LoadMoreButton({ message, onLoadMore }: LoadMoreButtonProps) {
  return (
    <div className="my-6">
      <div className="flex items-center justify-center">
        {message ? (
          <div className="text-sm text-muted-foreground bg-muted px-4 py-2 rounded-md">
            {message}
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={onLoadMore}
            className="text-black dark:text-white"
          >
            Load older entries
          </Button>
        )}
      </div>
    </div>
  );
}

