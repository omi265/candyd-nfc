import { getGuestMemories, getGuestSession } from "@/app/actions/guest";
import HomeContent from "@/app/components/home-content";
import GuestHeader from "../GuestHeader";
import { redirect } from "next/navigation";

export default async function GuestMemoriesPage() {
    const session = await getGuestSession();

    if (!session) {
        redirect("/guest/login"); // Or some error page
    }

    const memories = await getGuestMemories();

    return (
        <div className="h-screen w-full bg-[#FDF2EC] flex flex-col">
             <GuestHeader />
             <div className="flex-1 min-h-0">
                <HomeContent initialMemories={memories} isGuest={true} forcedViewMode="list" />
             </div>
        </div>
    );
}
