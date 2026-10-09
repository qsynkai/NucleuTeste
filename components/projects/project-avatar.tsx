"use client";

import { projectInitials } from "@/lib/projects/project-meta";
import { useState } from "react";

type ProjectAvatarProps = {
  name: string;
  avatarUrl: string | null;
  accentColor?: string | null;
  size?: number;
  /** Quando o nome já aparece ao lado, o avatar é decorativo. */
  decorative?: boolean;
};

export function ProjectAvatar({
  name,
  avatarUrl,
  accentColor = null,
  size = 28,
  decorative = true,
}: ProjectAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(avatarUrl) && failedUrl !== avatarUrl;

  return (
    <span
      className="project-avatar"
      style={
        {
          "--avatar-size": `${size}px`,
          "--avatar-accent": accentColor ?? "transparent",
        } as React.CSSProperties
      }
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": `Logo de ${name}` })}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl ?? undefined}
          alt=""
          loading="lazy"
          onError={() => setFailedUrl(avatarUrl)}
        />
      ) : (
        <span className="project-avatar__initials">{projectInitials(name)}</span>
      )}
    </span>
  );
}
