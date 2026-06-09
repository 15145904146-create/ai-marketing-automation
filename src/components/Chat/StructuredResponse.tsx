interface StructuredResponseProps {
  content: string;
}

export default function StructuredResponse({ content }: StructuredResponseProps) {
  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
      {content}
    </div>
  );
}
