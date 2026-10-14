"use client";

import { CustomerServiceForm } from "@/components/CustomerServiceForm";

type CustomerServiceEntryFormProps = {
  initialScheduledAt: Date | null;
  defaultProjectId?: string | null;
  onSaved: () => void;
  onCancel: () => void;
};

export function CustomerServiceEntryForm(props: CustomerServiceEntryFormProps) {
  return (
    <CustomerServiceForm
      mode="create"
      embedded
      initialScheduledAt={props.initialScheduledAt}
      defaultProjectId={props.defaultProjectId}
      onSaved={props.onSaved}
      onCancel={props.onCancel}
    />
  );
}
