"use client";

import type { SocialChannel } from "@prisma/client";

const CHANNELS: {
  id: SocialChannel;
  label: string;
  className: string;
}[] = [
  { id: "INSTAGRAM", label: "Instagram", className: "channel-pill--instagram" },
  { id: "FACEBOOK", label: "Facebook", className: "channel-pill--facebook" },
  { id: "YOUTUBE", label: "YouTube", className: "channel-pill--youtube" },
  { id: "LINKEDIN", label: "LinkedIn", className: "channel-pill--linkedin" },
];

type ChannelPickerProps = {
  value: SocialChannel[];
  onChange: (channels: SocialChannel[]) => void;
  disabled?: boolean;
};

export function ChannelPicker({ value, onChange, disabled }: ChannelPickerProps) {
  const toggle = (channel: SocialChannel) => {
    if (disabled) return;
    if (value.includes(channel)) {
      onChange(value.filter((item) => item !== channel));
      return;
    }
    onChange([...value, channel]);
  };

  return (
    <div className="channel-picker" role="group" aria-label="Redes de destino">
      {CHANNELS.map((channel) => {
        const selected = value.includes(channel.id);
        return (
          <button
            key={channel.id}
            type="button"
            className={`channel-pill ${channel.className}${selected ? " channel-pill--selected" : ""}`}
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => toggle(channel.id)}
          >
            {channel.label}
          </button>
        );
      })}
    </div>
  );
}
