"use client";

import { PARTICIPANT_ACCESS_OPTIONS } from "@/lib/events/participant-meta";
import type { EventParticipantAccess } from "@prisma/client";
import { useEffect, useState } from "react";

export type ParticipantDraft = {
  userId: string;
  accessLevel: EventParticipantAccess;
};

type InviteUserOption = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type EventParticipantsFieldProps = {
  value: ParticipantDraft[];
  onChange: (value: ParticipantDraft[]) => void;
  disabled?: boolean;
};

export function EventParticipantsField({
  value,
  onChange,
  disabled = false,
}: EventParticipantsFieldProps) {
  const [users, setUsers] = useState<InviteUserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickUserId, setPickUserId] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/users/invite-options", { cache: "no-store" });
        const body = (await res.json()) as {
          users?: InviteUserOption[];
          error?: string;
        };
        if (!cancelled && res.ok && body.users) {
          setUsers(body.users);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const usedIds = new Set(value.map((row) => row.userId));
  const available = users.filter((user) => !usedIds.has(user.id));

  const addParticipant = () => {
    if (!pickUserId || usedIds.has(pickUserId)) return;
    onChange([...value, { userId: pickUserId, accessLevel: "VIEW" }]);
    setPickUserId("");
  };

  const updateLevel = (userId: string, accessLevel: EventParticipantAccess) => {
    onChange(
      value.map((row) =>
        row.userId === userId ? { ...row, accessLevel } : row,
      ),
    );
  };

  const removeParticipant = (userId: string) => {
    onChange(value.filter((row) => row.userId !== userId));
  };

  const labelForUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user ? `${user.name} (${user.email})` : userId;
  };

  return (
    <fieldset className="form-section event-participants" disabled={disabled}>
      <legend className="form-section__legend">Participantes</legend>
      <p className="field__hint">
        Usuários do sistema e o que cada um pode fazer neste compromisso.
      </p>

      {value.length > 0 ? (
        <ul className="event-participants__list">
          {value.map((row) => (
            <li key={row.userId} className="event-participants__row">
              <span className="event-participants__name">
                {labelForUser(row.userId)}
              </span>
              <select
                className="field__input event-participants__level"
                value={row.accessLevel}
                onChange={(e) =>
                  updateLevel(row.userId, e.target.value as EventParticipantAccess)
                }
                aria-label={`Nível de acesso de ${labelForUser(row.userId)}`}
              >
                {PARTICIPANT_ACCESS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => removeParticipant(row.userId)}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="field__hint">Nenhum participante adicional.</p>
      )}

      <div className="event-participants__add">
        <select
          className="field__input"
          value={pickUserId}
          onChange={(e) => setPickUserId(e.target.value)}
          disabled={loading || available.length === 0}
          aria-label="Adicionar participante"
        >
          <option value="">
            {loading
              ? "Carregando usuários…"
              : available.length === 0
                ? "Sem usuários disponíveis"
                : "Selecione um usuário"}
          </option>
          {available.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} — {user.email}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={addParticipant}
          disabled={!pickUserId}
        >
          Adicionar
        </button>
      </div>
    </fieldset>
  );
}
