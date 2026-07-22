import { GenericPageSkeleton } from "@/components/ui/PageSkeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <GenericPageSkeleton rows={4} />
    </div>
  );
}
