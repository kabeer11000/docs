"use client";
import { useStore } from "@nanostores/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  editorActions,
  editorFormatState,
  editorInstance,
} from "@/state/editor";

const typographyOptions = [
  { value: "normal", label: "Normal text" },
  { value: "heading1", label: "Heading 1" },
  { value: "heading2", label: "Heading 2" },
  { value: "subtitle", label: "Subtitle" },
];

export function TypographySelector({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const _formatState = useStore(editorFormatState);

  const getCurrentTypography = (): string => {
    const editor = editorInstance.get();
    if (!editor) return "normal";

    // Check if current node is a heading with subtitle class
    const { $from } = editor.state.selection;
    const node = $from.parent;

    if (node.type.name === "heading") {
      const attrs = node.attrs;
      if (attrs.level === 2 && attrs.class === "subtitle") {
        return "subtitle";
      }
      if (attrs.level === 1) return "heading1";
      if (attrs.level === 2) return "heading2";
    }

    return "normal";
  };

  const handleTypographyChange = (value: string) => {
    // Use set commands instead of toggle to avoid race conditions
    switch (value) {
      case "normal":
        editorActions.setParagraph();
        break;
      case "heading1":
        editorActions.setHeading1();
        break;
      case "heading2":
        editorActions.setHeading2();
        break;
      case "subtitle":
        editorActions.setSubtitle();
        break;
    }
  };

  const getCurrentLabel = (): string => {
    const current = typographyOptions.find(
      (opt) => opt.value === getCurrentTypography(),
    );
    return current ? current.label : "Normal text";
  };

  return (
    <Select
      value={getCurrentTypography()}
      onValueChange={handleTypographyChange}
      disabled={disabled}
    >
      <SelectTrigger
        className="w-full max-w-[180px] sm:w-40 h-7 sm:h-8 text-xs sm:text-sm border-input bg-background hover:bg-muted/50 transition-colors"
        disabled={disabled}
      >
        <SelectValue>
          <span className="truncate">{getCurrentLabel()}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="min-w-[180px] sm:min-w-[200px]">
        {typographyOptions.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="cursor-pointer hover:bg-accent transition-colors py-2 sm:py-3 min-h-[36px] sm:min-h-[40px] flex items-center"
          >
            <span
              className={
                option.value === "heading1"
                  ? "text-base sm:text-lg font-semibold leading-none"
                  : option.value === "heading2"
                    ? "text-sm sm:text-base font-semibold leading-none"
                    : option.value === "subtitle"
                      ? "text-sm sm:text-base font-medium text-muted-foreground leading-none"
                      : "text-xs sm:text-sm leading-none"
              }
            >
              {option.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
