import { KeyboardEvent, ReactNode, useEffect, useId, useRef, useState } from "react";

export interface MenuItem {
  label: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
}

interface MenuProps {
  label: ReactNode;
  items: MenuItem[];
  align?: "start" | "end";
  disabled?: boolean;
  className?: string;
}

export function Menu({ label, items, align = "start", disabled, className }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [initialFocus, setInitialFocus] = useState<"first" | "last">("first");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const baseId = useId();
  const triggerId = `${baseId}-trigger`;
  const listId = `${baseId}-list`;

  const enabledItems = () =>
    Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [],
    );

  const close = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const buttons = enabledItems();
    const target = initialFocus === "last" ? buttons[buttons.length - 1] : buttons[0];
    (target ?? listRef.current)?.focus();

    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, initialFocus]);

  const openWith = (focus: "first" | "last") => {
    setInitialFocus(focus);
    setOpen(true);
  };

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      openWith("first");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      openWith("last");
    }
  };

  const onListKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const buttons = enabledItems();
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const move = (next: number) => {
      e.preventDefault();
      buttons[(next + buttons.length) % buttons.length]?.focus();
    };
    switch (e.key) {
      case "ArrowDown":
        move(index + 1);
        break;
      case "ArrowUp":
        move(index < 0 ? buttons.length - 1 : index - 1);
        break;
      case "Home":
        move(0);
        break;
      case "End":
        move(buttons.length - 1);
        break;
      case "Escape":
        e.preventDefault();
        close(true);
        break;
      case "Tab":
        close(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className={`menu ${className ?? ""}`.trim()}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        className="menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        disabled={disabled}
        onClick={() => (open ? close(false) : openWith("first"))}
        onKeyDown={onTriggerKeyDown}
      >
        {label}
        <span className="menu__caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="menu"
          aria-labelledby={triggerId}
          tabIndex={-1}
          className={`menu__list ${align === "end" ? "menu__list--end" : ""}`.trim()}
          onKeyDown={onListKeyDown}
        >
          {items.map((item, i) => (
            <li key={i} role="none">
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                className={`menu__item ${item.danger ? "menu__item--danger" : ""}`.trim()}
                disabled={item.disabled}
                onClick={() => {
                  close(true);
                  item.onSelect();
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
