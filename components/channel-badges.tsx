import type { SocialChannel } from "@prisma/client";

const CHANNEL_META: Record<
  SocialChannel,
  { label: string; className: string }
> = {
  INSTAGRAM: { label: "Instagram", className: "channel-badge--instagram" },
  FACEBOOK: { label: "Facebook", className: "channel-badge--facebook" },
  YOUTUBE: { label: "YouTube", className: "channel-badge--youtube" },
  LINKEDIN: { label: "LinkedIn", className: "channel-badge--linkedin" },
};

type ChannelBadgesProps = {
  channels: SocialChannel[];
};

export function ChannelBadges({ channels }: ChannelBadgesProps) {
  return (
    <div className="channel-badges">
      {channels.map((channel) => {
        const meta = CHANNEL_META[channel];
        return (
          <span
            key={channel}
            className={`channel-badge ${meta.className}`}
          >
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}
