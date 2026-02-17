import { useRef, useEffect, useCallback } from "react";

interface NoteEditorProps {
  text: string;
  onChange: (text: string) => void;
}

export default function NoteEditor({ text, onChange }: NoteEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onChange(value), 400);
    },
    [onChange]
  );

  const handleBlur = useCallback(() => {
    clearTimeout(debounceRef.current);
    if (textareaRef.current) {
      onChange(textareaRef.current.value);
    }
  }, [onChange]);

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  return (
    <textarea
      ref={textareaRef}
      defaultValue={text}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="Type your note..."
      style={{
        width: "100%",
        height: "100%",
        border: "none",
        outline: "none",
        resize: "none",
        background: "transparent",
        fontFamily: "inherit",
        fontSize: "14px",
        lineHeight: "1.5",
        padding: "8px",
        boxSizing: "border-box",
      }}
    />
  );
}
