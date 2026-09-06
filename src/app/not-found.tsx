import NotFoundState from "@/components/ui/NotFoundState";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <NotFoundState
        type="page"
        title="Page Not Found"
        description="The page you're trying to reach doesn't exist, may have been moved, or is temporarily unavailable."
      />
    </div>
  );
}
