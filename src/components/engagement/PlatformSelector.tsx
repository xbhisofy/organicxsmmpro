import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PLATFORM_CONFIG } from "@/lib/engagement-types";
import { Instagram, Music, Youtube, Twitter, Facebook } from "lucide-react";

interface PlatformSelectorProps {
  selected: string;
  onSelect: (platform: string) => void;
  availablePlatforms?: string[]; // Only show platforms with active bundles
}

const iconMap = {
  Instagram,
  Music,
  Youtube,
  Twitter,
  Facebook,
};

export function PlatformSelector({ selected, onSelect, availablePlatforms }: PlatformSelectorProps) {
  // Filter platforms based on availablePlatforms prop
  const platformsToShow = availablePlatforms
    ? Object.entries(PLATFORM_CONFIG).filter(([key]) => availablePlatforms.includes(key))
    : Object.entries(PLATFORM_CONFIG);

  if (platformsToShow.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No platforms configured. Contact admin to set up engagement bundles.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {platformsToShow.map(([key, config]) => {
        const Icon = iconMap[config.icon as keyof typeof iconMap];
        const isSelected = selected === key;

        return (
          <Button variant="outline"
            key={key}
            onClick={() => onSelect(key)}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-xs uppercase tracking-normal",
              isSelected
                ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground"
                : "bg-card text-muted-foreground border border-border hover:bg-secondary hover:text-foreground"
            )}
          >
            <Icon className={cn("h-4 w-4", isSelected ? "text-primary-foreground" : "text-muted-foreground")} />
            <span>{config.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
