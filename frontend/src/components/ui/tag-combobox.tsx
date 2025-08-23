"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { userTagsApi, UserTag } from "@/lib/api"

interface TagComboboxProps {
  value: string[]
  onChange: (value: string[]) => void
  tagType: string
  placeholder?: string
  className?: string
  disabled?: boolean
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function TagCombobox({
  value,
  onChange,
  tagType,
  placeholder = "Выберите теги...",
  className,
  disabled = false,
}: TagComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  const [userTags, setUserTags] = React.useState<UserTag[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  // Debounce search value для уменьшения количества API запросов
  const debouncedSearchValue = useDebounce(searchValue, 300)

  // Загружаем теги пользователя только при монтировании
  React.useEffect(() => {
    const loadUserTags = async () => {
      try {
        setIsLoading(true)
        const response = await userTagsApi.list(tagType)
        setUserTags(response.tags)
      } catch (error) {
        console.error('Failed to load user tags:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadUserTags()
  }, [tagType])

  // Фильтруем локально вместо API запросов при каждом вводе
  const filteredTags = React.useMemo(() => {
    if (!debouncedSearchValue.trim()) {
      return userTags
    }
    const query = debouncedSearchValue.toLowerCase()
    return userTags.filter(tag => 
      tag.tag_value.toLowerCase().includes(query)
    )
  }, [userTags, debouncedSearchValue])

  const handleSelect = async (selectedValue: string) => {
    try {
      if (!value.includes(selectedValue)) {
        // Добавляем тег в выбранные
        onChange([...value, selectedValue])
        
        // Создаем или увеличиваем счетчик в базе данных
        await userTagsApi.create(selectedValue, tagType)
        
        // Обновляем локальные теги пользователя
        const response = await userTagsApi.list(tagType)
        setUserTags(response.tags)
      }
    } catch (error) {
      console.error('Failed to create tag:', error)
    }
    
    setSearchValue("")
    setOpen(false)
  }

  const handleRemove = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove))
  }

  const handleDeleteFromLibrary = async (tagValue: string) => {
    try {
      const tagToDelete = userTags.find(tag => tag.tag_value === tagValue)
      if (tagToDelete) {
        await userTagsApi.delete(tagToDelete.id)
        // Обновляем локальные теги
        setUserTags(userTags.filter(tag => tag.id !== tagToDelete.id))
        // Убираем из выбранных если он там есть
        onChange(value.filter(tag => tag !== tagValue))
      }
    } catch (error) {
      console.error('Failed to delete tag:', error)
    }
  }

  const handleCreateNew = async () => {
    const trimmedValue = searchValue.trim()
    if (trimmedValue && !value.includes(trimmedValue)) {
      await handleSelect(trimmedValue)
    }
  }

  // Фильтруем предложения, исключая уже выбранные
  const availableTags = filteredTags.filter(tag => 
    !value.includes(tag.tag_value)
  )

  // Проверяем нужно ли показать опцию создания нового тега
  const trimmedSearch = searchValue.trim()
  const showCreateOption = trimmedSearch.length > 0 && 
    !userTags.some(tag => tag.tag_value.toLowerCase() === trimmedSearch.toLowerCase()) && 
    !value.includes(trimmedSearch)

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Поле выбора (в одну линию с соседними полями) */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("h-9 w-full justify-between", disabled && "opacity-60")}
            disabled={disabled}
          >
            {placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={4} collisionPadding={8} className="w-[var(--radix-popover-trigger-width)] max-w-[min(560px,calc(100vw-2rem))] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Поиск тегов..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {isLoading ? (
                <div className="py-6 text-center text-sm">Загрузка...</div>
              ) : (
                <>
                  {availableTags.length === 0 && !showCreateOption && (
                    <CommandEmpty>
                      {searchValue.trim() ? "Теги не найдены." : "Нет сохраненных тегов."}
                    </CommandEmpty>
                  )}
                  
                  {availableTags.length > 0 && (
                    <CommandGroup heading="Сохраненные теги">
                      {availableTags.map((tag) => (
                        <CommandItem
                          key={tag.id}
                          value={tag.tag_value}
                          onSelect={() => handleSelect(tag.tag_value)}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center">
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                value.includes(tag.tag_value) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {tag.tag_value}
                            {typeof tag.usage_count === 'number' && (
                              <span className="ml-2 text-muted-foreground" title={`Использовалось ${tag.usage_count} раз`}>
                                •
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteFromLibrary(tag.tag_value)
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {showCreateOption && (
                    <CommandGroup heading="Создать новый">
                      <CommandItem onSelect={handleCreateNew}>
                        <Plus className="mr-2 h-4 w-4" />
                        Создать "{trimmedSearch}"
                      </CommandItem>
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Выбранные теги (под полем) */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
              {!disabled && (
                <button
                  type="button"
                  className="ml-1 h-3 w-3 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onClick={() => handleRemove(tag)}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Удалить</span>
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
} 