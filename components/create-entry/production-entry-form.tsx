"use client";

import { ProductionEventForm } from "@/components/ProductionEventForm";

type ProductionEntryFormProps = {
  initialScheduledAt: Date | null;
  defaultProjectId?: string | null;
  onSaved: () => void;
  onCancel: () => void;
};

/** Wrapper de criação usado pelo CreateEntryDialog. */
export function ProductionEntryForm(props: ProductionEntryFormProps) {
  return (
    <ProductionEventForm
      mode="create"
      embedded
      initialScheduledAt={props.initialScheduledAt}
      defaultProjectId={props.defaultProjectId}
      onSaved={props.onSaved}
      onCancel={props.onCancel}
    />
  );
}
