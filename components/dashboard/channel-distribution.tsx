import type { DashboardChannelCounts } from "@/lib/types/dashboard-metrics";
import type { SocialChannel } from "@prisma/client";

const CHANNELS: {
  id: SocialChannel;
  label: string;
  badgeClass: string;
}[] = [
  { id: "INSTAGRAM", label: "Instagram", badgeClass: "channel-badge--instagram" },
  { id: "FACEBOOK", label: "Facebook", badgeClass: "channel-badge--facebook" },
  { id: "YOUTUBE", label: "YouTube", badgeClass: "channel-badge--youtube" },
  { id: "LINKEDIN", label: "LinkedIn", badgeClass: "channel-badge--linkedin" },
];

type ChannelDistributionProps = {
  counts: DashboardChannelCounts;
};

export function ChannelDistribution({ counts }: ChannelDistributionProps) {
  const max = Math.max(...CHANNELS.map((channel) => counts[channel.id]), 1);
  const total = CHANNELS.reduce((sum, channel) => sum + counts[channel.id], 0);

  return (
    <section className="panel" aria-labelledby="dist-title">
      <header className="panel__head">
        <h2 id="dist-title" className="panel__title">
          Distribuição por rede
        </h2>
        <span className="eyebrow">{total} vínculos</span>
      </header>

      <div className="panel__body">
        <ul className="dist">
          {CHANNELS.map((channel) => {
            const value = counts[channel.id];
            const width = Math.round((value / max) * 100);
            return (
              <li key={channel.id} className="dist__row">
                <div className="dist__top">
                  <span className={`channel-badge ${channel.badgeClass}`}>{channel.label}</span>
                  <span className="dist__count">{String(value).padStart(2, "0")}</span>
                </div>
                <div className="dist__track" aria-hidden>
                  <div className="dist__fill" style={{ width: `${width}%` }} />
                </div>
              </li>
            );
          })}
        </ul>

        <p className="dist__note">
          Meta {counts.INSTAGRAM + counts.FACEBOOK} · Vídeo {counts.YOUTUBE} · B2B{" "}
          {counts.LINKEDIN}
        </p>
      </div>
    </section>
  );
}
