import { useState } from "react"
import { LanguagesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "cn"

export type LanguageOption = {
  code: string
  name: string
  localName: string
}

type LanguageMenuProps = {
  currentCode: string
  languages: LanguageOption[]
  onSelect: (code: string) => void
  align?: "start" | "center" | "end"
  className?: string
}

export function LanguageMenu({
  currentCode,
  languages,
  onSelect,
  align = "end",
  className,
}: LanguageMenuProps) {
  const [open, setOpen] = useState(false)
  const current = languages.find((language) => language.code === currentCode)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("max-w-40 shrink-0", className)}
          aria-label="Choose language"
        >
          <LanguagesIcon />
          <span className="truncate">{current?.localName ?? currentCode}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-80 p-0">
        <Command>
          <CommandInput placeholder="Search languages" />
          <CommandList>
            <CommandEmpty>No language found.</CommandEmpty>
            <CommandGroup>
              {languages.map((language) => {
                const selected = language.code === currentCode
                return (
                  <CommandItem
                    key={language.code}
                    value={`${language.localName} ${language.name} ${language.code}`}
                    data-checked={selected ? "true" : undefined}
                    onSelect={() => {
                      setOpen(false)
                      onSelect(language.code)
                    }}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{language.localName}</span>
                      {language.name !== language.localName ? (
                        <span className="truncate text-xs text-muted-foreground">
                          {language.name}
                        </span>
                      ) : null}
                    </span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
