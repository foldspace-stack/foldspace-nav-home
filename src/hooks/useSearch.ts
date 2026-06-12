import { useState, useCallback, useMemo } from 'react';
import { useLinksContext } from '../contexts/LinksContext';
import { useCategoriesContext } from '../contexts/CategoriesContext';

export function useSearch() {
  const { links = [] } = useLinksContext();
  const { categories = [] } = useCategoriesContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  // Filtered links for internal search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();

    const categoryWeightMap = new Map(categories.map(c => [c.id, c.weight || 0]));

    return links
      .filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.url.toLowerCase().includes(q) ||
        (l.description?.toLowerCase().includes(q) ?? false)
      )
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

        if (a.pinned && b.pinned) {
          return (a.pinnedOrder || 0) - (b.pinnedOrder || 0);
        }

        const wa = categoryWeightMap.get(a.categoryId) || 0;
        const wb = categoryWeightMap.get(b.categoryId) || 0;
        if (wa !== wb) return wa - wb;

        return (a.order || 0) - (b.order || 0);
      });
  }, [links, categories, searchQuery]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return {
    searchQuery, setSearchQuery,
    searchResults,
    handleSearch,
    isMobileSearchOpen, setIsMobileSearchOpen,
  };
}
