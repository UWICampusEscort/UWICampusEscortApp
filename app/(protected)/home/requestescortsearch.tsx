"use client"

import { useEffect, useState } from "react"
import {
    Autocomplete,
    AutocompleteContent,
    AutocompleteEmpty,
    AutocompleteInput,
    AutocompleteItem,
    AutocompleteList,
} from "@/components/reui/autocomplete"
import { cn, getInitials } from "@/lib/utils"
import { Profile } from "../profile/page"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function RequestEscortSearch({ className, escortUsers, value, setValue }: { className?: string, escortUsers: Profile[], value: string, setValue: (value: string) => void }) {
    const [localValue, setLocalValue] = useState(value)

    useEffect(() => {
        if (!localValue || escortUsers.find(i => i.email.toLowerCase() === localValue.toLowerCase())) {
            setValue(localValue)
        }
    }, [localValue, setValue, escortUsers])

    const filteredItems = escortUsers.filter((item) =>
        (item.full_name ?? "").toLowerCase().includes(localValue.toLowerCase()) || item.email.toLowerCase().includes(localValue.toLowerCase())
    )

    return (
        <div className={cn(className)}>
            <Autocomplete
                value={localValue}
                onValueChange={(value) => { setLocalValue(value); }}
                items={filteredItems}
                itemToStringValue={(item: Profile) => item.email}
                autoHighlight
            >
                <AutocompleteInput placeholder="e.g. Danielle Cobourne" showTrigger showClear />
                <AutocompleteContent>
                    <AutocompleteEmpty>No escort users found.</AutocompleteEmpty>
                    <AutocompleteList>
                        {(item: Profile) => (
                            <AutocompleteItem key={item.id} value={item}>
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-7 w-7 border-2 border-primary-foreground">
                                        <AvatarImage src={item.avatar_url ?? ""} alt={item.full_name || item.email} />
                                        <AvatarFallback className="text-xs">{getInitials(item.full_name || item.email)}</AvatarFallback>
                                    </Avatar>
                                    <span>{item.full_name || item.email}</span>
                                </div>
                            </AutocompleteItem>
                        )}
                    </AutocompleteList>
                </AutocompleteContent>
            </Autocomplete>
        </div>
    )
}