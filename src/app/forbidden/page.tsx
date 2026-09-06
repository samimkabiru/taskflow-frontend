import Link from "next/link";
import { ArrowLeft, ShieldOff } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8 text-center">
      <div className="mb-8">
        <div className="w-20 h-20 rounded-full bg-error-container flex items-center justify-center mx-auto mb-4">
          <ShieldOff size={40} className="text-error" />
        </div>
        <h1 className="font-[family-name:var(--font-heading)] text-[48px] font-bold text-error mb-2">
          403
        </h1>
        <h2 className="font-[family-name:var(--font-heading)] text-[24px] font-semibold text-on-surface mb-3">
          Access Forbidden
        </h2>
        <p className="font-[family-name:var(--font-body)] text-[16px] text-on-surface-variant max-w-md">
          You don&apos;t have permission to view this page. Contact the board owner if you believe this is an error.
        </p>
      </div>
      <Link
        href="/boards"
        className="inline-flex items-center gap-2 bg-primary-container text-on-primary-container font-[family-name:var(--font-body)] text-[14px] font-medium px-6 py-3 rounded-lg hover:brightness-110 transition-all"
      >
        <ArrowLeft size={16} />
        Back to Boards
      </Link>
    </div>
  );
}
