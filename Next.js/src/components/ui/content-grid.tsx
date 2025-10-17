import { Search } from "lucide-react";
import React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface ContentGridProps {
  // Search props
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  // Filter props
  filters?: {
    value: string;
    onValueChange: (value: string) => void;
    options: FilterOption[];
    placeholder?: string;
    icon?: React.ReactNode;
    width?: string;
  }[];

  // Grid props
  children: React.ReactNode;
  gridCols?: string;

  // Results info
  totalCount?: number;
  filteredCount?: number;
  itemName?: string;

  // Empty state
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;

  className?: string;
}

export function ContentGrid({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  children,
  gridCols = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  totalCount,
  filteredCount,
  itemName = "items",
  emptyIcon = (
    <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
  ),
  emptyTitle = "No results found",
  emptyDescription = "Try adjusting your search terms or filters.",
  className = "",
}: ContentGridProps) {
  const hasResults = React.Children.count(children) > 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search and Filter Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {searchValue !== undefined && onSearchChange && (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {filters.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {filters.map((filter, index) => (
              <Select
                key={index}
                value={filter.value}
                onValueChange={filter.onValueChange}
              >
                <SelectTrigger className={filter.width || "w-48"}>
                  {filter.icon}
                  <SelectValue placeholder={filter.placeholder || "Filter"} />
                </SelectTrigger>
                <SelectContent>
                  {filter.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.icon && (
                        <span className="mr-2">{option.icon}</span>
                      )}
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
          </div>
        )}
      </div>

      {/* Results Summary */}
      {totalCount !== undefined && filteredCount !== undefined && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredCount} of {totalCount} {itemName}
        </div>
      )}

      {/* Content Grid */}
      {hasResults ? (
        <div className={`grid ${gridCols} gap-6`}>{children}</div>
      ) : (
        <div className="text-center py-12">
          {emptyIcon}
          <h3 className="text-lg font-medium text-foreground mb-2">
            {emptyTitle}
          </h3>
          <p className="text-muted-foreground">{emptyDescription}</p>
        </div>
      )}
    </div>
  );
}
