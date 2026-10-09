import { SOCIAL_ICON_GLYPH_PX } from "@/lib/constants/social-icons";
import type { SocialChannel } from "@prisma/client";

const CHANNEL_ORDER: SocialChannel[] = [
  "INSTAGRAM",
  "FACEBOOK",
  "YOUTUBE",
  "LINKEDIN",
];

type SocialChannelIconsProps = {
  channels: SocialChannel[];
  size?: number;
  /** Limite de logos visíveis; o excedente vira um contador `+N`. */
  max?: number;
};

export function SocialChannelIcons({
  channels,
  size = SOCIAL_ICON_GLYPH_PX,
  max,
}: SocialChannelIconsProps) {
  const ordered = CHANNEL_ORDER.filter((channel) => channels.includes(channel));
  const visible = max !== undefined ? ordered.slice(0, max) : ordered;
  const hidden = ordered.length - visible.length;
  const names = ordered.map(channelLabel).join(", ");

  return (
    <span
      className="fc-post-channels"
      role="img"
      aria-label={names ? `Redes: ${names}` : "Nenhuma rede"}
    >
      {visible.map((channel) => (
        <ChannelIcon key={channel} channel={channel} size={size} />
      ))}
      {hidden > 0 ? (
        <span className="fc-post-channels__more" aria-hidden>
          +{hidden}
        </span>
      ) : null}
    </span>
  );
}

function ChannelIcon({
  channel,
  size,
}: {
  channel: SocialChannel;
  size: number;
}) {
  const label = channelLabel(channel);

  switch (channel) {
    case "INSTAGRAM":
      return (
        <span
          className="fc-channel-icon fc-channel-icon--instagram"
          title={label}
          aria-hidden
        >
          <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.974.974 1.246 2.241 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.974.974-2.241 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.974-.974-1.246-2.241-1.308-3.608C2.175 15.747 2.163 15.367 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608.974-.974 2.241-1.246 3.608-1.308C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.332.017 7.052.096 5.771.175 4.659.458 3.678 1.44 2.697 2.421 2.414 3.533 2.335 4.814.256 6.094.239 6.503.239 12c0 5.497.017 5.906.096 7.186.079 1.281.362 2.393 1.343 3.374.981.981 2.093 1.264 3.374 1.343 1.28.079 1.689.096 7.186.096s5.906-.017 7.186-.096c1.281-.079 2.393-.362 3.374-1.343.981-.981 1.264-2.093 1.343-3.374.079-1.28.096-1.689.096-7.186s-.017-5.906-.096-7.186c-.079-1.281-.362-2.393-1.343-3.374-.981-.981-2.093-1.264-3.374-1.343C17.906.017 17.497 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
          </svg>
        </span>
      );
    case "FACEBOOK":
      return (
        <span
          className="fc-channel-icon fc-channel-icon--facebook"
          title={label}
          aria-hidden
        >
          <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </span>
      );
    case "YOUTUBE":
      return (
        <span
          className="fc-channel-icon fc-channel-icon--youtube"
          title={label}
          aria-hidden
        >
          <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        </span>
      );
    case "LINKEDIN":
      return (
        <span
          className="fc-channel-icon fc-channel-icon--linkedin"
          title={label}
          aria-hidden
        >
          <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 4.126 0 2.065 2.065 0 0 1-2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        </span>
      );
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}

function channelLabel(channel: SocialChannel): string {
  const labels: Record<SocialChannel, string> = {
    INSTAGRAM: "Instagram",
    FACEBOOK: "Facebook",
    YOUTUBE: "YouTube",
    LINKEDIN: "LinkedIn",
  };
  return labels[channel];
}
