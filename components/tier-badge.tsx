import { Badge } from "@/components/ui/badge";
import { TIER_BADGE_CLASSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { FirmTier } from "@/types";

export function TierBadge({
  tier,
  className,
}: {
  tier: FirmTier;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", TIER_BADGE_CLASSES[tier], className)}
    >
      {tier}
    </Badge>
  );
}
