import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="square"
      aria-hidden="true"
      focusable="false"
      className="size-5 shrink-0"
      {...props}
    >
      {children}
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}

/** Speech bubble with a handset, enough to read as WhatsApp at 20px. */
export function WhatsappIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 20l1.3-4.2A8 8 0 1 1 8.4 18.8L4 20z" strokeLinejoin="round" />
      <path d="M9.2 8.6c0 3.2 2.9 6 6 6l1-1.4-2-1-.9.7a4 4 0 0 1-1.8-1.8l.7-.9-1-2-1.4 1.4z" />
    </Icon>
  );
}
