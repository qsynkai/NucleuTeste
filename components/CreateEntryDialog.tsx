"use client";

import { CustomerServiceEntryForm } from "@/components/create-entry/customer-service-entry-form";
import { ProductionEntryForm } from "@/components/create-entry/production-entry-form";
import { ReminderEntryForm } from "@/components/create-entry/reminder-entry-form";
import { PostModal } from "@/components/PostModal";
import { CREATE_ENTRY_OPTIONS } from "@/lib/entries/create-entry-options";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import { useProjects } from "@/hooks/use-projects";
import type { EntryType } from "@prisma/client";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

type CreateEntryStep = "pick" | "form";

type CreateEntryDialogProps = {
  open: boolean;
  initialScheduledAt: Date | null;
  defaultProjectId?: string | null;
  onClose: () => void;
  onSaved: () => void;
};

const FORM_HEADINGS: Record<EntryType, { eyebrow: string; title: string }> = {
  SOCIAL_POST: {
    eyebrow: "Postagem social",
    title: "Planejamento editorial",
  },
  PRODUCTION_EVENT: {
    eyebrow: "Evento / produção",
    title: "Captação e orçamento",
  },
  CUSTOMER_SERVICE: {
    eyebrow: "Atendimento",
    title: "Reunião ou balcão",
  },
  SIMPLE_REMINDER: {
    eyebrow: "Lembrete interno",
    title: "Compromisso rápido",
  },
};

export function CreateEntryDialog({
  open,
  initialScheduledAt,
  defaultProjectId = null,
  onClose,
  onSaved,
}: CreateEntryDialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDialogElement>(null);
  useModalA11y(open, onClose, panelRef);
  const { projects } = useProjects({ enabled: open && !!defaultProjectId });
  const activeProjectName = useMemo(() => {
    if (!defaultProjectId) return null;
    return projects.find((p) => p.id === defaultProjectId)?.name ?? null;
  }, [defaultProjectId, projects]);

  const [step, setStep] = useState<CreateEntryStep>("pick");
  const [entryType, setEntryType] = useState<EntryType | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const reset = useCallback(() => {
    setStep("pick");
    setEntryType(null);
    setFocusedIndex(0);
  }, []);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (!open || step !== "pick") return;
    optionRefs.current[focusedIndex]?.focus();
  }, [focusedIndex, open, step]);

  const pickType = (type: EntryType) => {
    setEntryType(type);
    setStep("form");
  };

  const goBack = () => {
    setStep("pick");
    setEntryType(null);
  };

  const handleSaved = () => {
    onSaved();
    onClose();
  };

  const onPickerKeyDown = (event: React.KeyboardEvent) => {
    const count = CREATE_ENTRY_OPTIONS.length;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      setFocusedIndex((index) => (index + 1) % count);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      setFocusedIndex((index) => (index - 1 + count) % count);
    } else if (event.key === "Home") {
      event.preventDefault();
      setFocusedIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setFocusedIndex(count - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pickType(CREATE_ENTRY_OPTIONS[focusedIndex].entryType);
    }
  };

  if (!open) return null;

  const formHeading = entryType ? FORM_HEADINGS[entryType] : null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <dialog
        ref={panelRef}
        className={`modal-panel create-entry-dialog${step === "form" ? " modal-panel--wide" : ""}`}
        open
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
      >
        <header className="modal-panel__header create-entry-dialog__header">
          <div>
            {step === "pick" ? (
              <>
                <p className="eyebrow">Agenda 360º{activeProjectName ? ` · ${activeProjectName}` : ""}</p>
                <h2 id={titleId}>Novo Registro na Agenda</h2>
                <p className="create-entry-dialog__sub">
                  Escolha o tipo de registro. A data e o horário selecionados serão
                  mantidos.
                </p>
              </>
            ) : formHeading ? (
              <>
                <button
                  type="button"
                  className="create-entry-form__back"
                  onClick={goBack}
                >
                  ← Voltar
                </button>
                <p className="eyebrow">{formHeading.eyebrow}</p>
                <h2 id={titleId}>{formHeading.title}</h2>
              </>
            ) : null}
          </div>
          <button type="button" className="modal-panel__close" onClick={onClose}>
            Fechar
          </button>
        </header>

        <div
          className={`create-entry-dialog__stage create-entry-dialog__stage--${step}`}
        >
          {step === "pick" ? (
            <div
              className="create-entry-picker"
              role="listbox"
              aria-label="Tipo de registro"
              onKeyDown={onPickerKeyDown}
            >
              {CREATE_ENTRY_OPTIONS.map((option, index) => {
                const selected = index === focusedIndex;
                return (
                  <button
                    key={option.entryType}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    tabIndex={selected ? 0 : -1}
                    ref={(node) => {
                      optionRefs.current[index] = node;
                    }}
                    className={`create-entry-card${selected ? " create-entry-card--focus" : ""}`}
                    onFocus={() => setFocusedIndex(index)}
                    onClick={() => pickType(option.entryType)}
                  >
                    <span className="create-entry-card__icon">{option.icon}</span>
                    <span className="create-entry-card__copy">
                      <strong>{option.title}</strong>
                      <span>{option.description}</span>
                    </span>
                    <span className="create-entry-card__chevron" aria-hidden>
                      →
                    </span>
                  </button>
                );
              })}
            </div>
          ) : entryType === "SOCIAL_POST" ? (
            <PostModal
              embedded
              open
              mode="create"
              initialScheduledAt={initialScheduledAt}
              defaultProjectId={defaultProjectId}
              onClose={onClose}
              onSaved={handleSaved}
            />
          ) : entryType === "PRODUCTION_EVENT" ? (
            <ProductionEntryForm
              initialScheduledAt={initialScheduledAt}
              defaultProjectId={defaultProjectId}
              onSaved={handleSaved}
              onCancel={onClose}
            />
          ) : entryType === "CUSTOMER_SERVICE" ? (
            <CustomerServiceEntryForm
              initialScheduledAt={initialScheduledAt}
              defaultProjectId={defaultProjectId}
              onSaved={handleSaved}
              onCancel={onClose}
            />
          ) : entryType === "SIMPLE_REMINDER" ? (
            <ReminderEntryForm
              initialScheduledAt={initialScheduledAt}
              defaultProjectId={defaultProjectId}
              onSaved={handleSaved}
              onCancel={onClose}
            />
          ) : null}
        </div>
      </dialog>
    </div>
  );
}
