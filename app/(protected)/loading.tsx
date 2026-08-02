import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import logo from "@/app/assets/images/logo.png";

export default function Loading() {
    return (
        <div className="flex h-full min-h-[70vh] w-full flex-col items-center justify-center gap-6 px-4">
            {/* Pulsing brand mark */}
            <div className="relative flex h-14 w-14 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/20" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Image className="h-12 w-12 rounded-md" src={logo} alt="Logo" />
                </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
            </div>
        </div>
    );
}