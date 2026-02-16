
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";

export default function TermsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-dvh flex-col">
            <PublicHeader />
            <main className="flex-1">
                <div className="container py-8 px-4 md:px-6">
                    {children}
                </div>
            </main>
            <PublicFooter />
        </div>
    );
}
