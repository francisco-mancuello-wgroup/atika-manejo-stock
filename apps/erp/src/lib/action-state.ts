/** Result of a Server Action as consumed by `useActionState`. */
export type FormState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string>;
      /** Submitted values, so the form can keep what the user typed after an error. */
      values?: Record<string, string>;
    };

export const IDLE: FormState = { status: "idle" };

/** FormData entries as plain strings (files are ignored). */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}
