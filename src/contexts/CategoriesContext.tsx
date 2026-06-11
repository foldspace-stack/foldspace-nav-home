import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { Category, LinkItem, DEFAULT_CATEGORIES } from '../../types';
import { STORAGE_KEYS, API_ENDPOINTS } from '../constants';
import { useAuthContext } from './AuthContext';

// --- Types ---
interface CategoriesState {
  categories: Category[];
  unlockedCategoryIds: Set<string>;
  expandedCategories: Set<string>;
}

type CategoriesAction =
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'UNLOCK_CATEGORY'; payload: string }
  | { type: 'TOGGLE_EXPAND'; payload: string }
  | { type: 'SET_EXPANDED'; payload: Set<string> };

interface CategoriesContextValue extends CategoriesState {
  initCategories: (categories: Category[]) => void;
  addCategory: (cat: Category) => void;
  updateCategory: (cat: Category) => void;
  deleteCategory: (id: string) => void;
  unlockCategory: (id: string) => void;
  toggleExpand: (id: string) => void;
  setCategoriesAndSync: (categories: Category[], links: LinkItem[]) => Promise<boolean>;
  categoryTree: CategoryWithChildren[];
  buildCategoryTree: (cats: Category[]) => CategoryWithChildren[];
}

export interface CategoryWithChildren extends Category {
  children: Category[];
}

function stripCategorySecrets(categories: Category[]): Category[] {
  return categories.map(cat => ({
    ...cat,
    hasPassword: cat.hasPassword ?? Boolean(cat.password),
    password: undefined,
    accessPasswordHash: undefined,
  }));
}

// --- Reducer ---
function categoriesReducer(state: CategoriesState, action: CategoriesAction): CategoriesState {
  switch (action.type) {
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] };
    case 'UPDATE_CATEGORY':
      return { ...state, categories: state.categories.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_CATEGORY':
      return { ...state, categories: state.categories.filter(c => c.id !== action.payload) };
    case 'UNLOCK_CATEGORY':
      return { ...state, unlockedCategoryIds: new Set([...state.unlockedCategoryIds, action.payload]) };
    case 'TOGGLE_EXPAND': {
      const next = new Set(state.expandedCategories);
      if (next.has(action.payload)) next.delete(action.payload);
      else next.add(action.payload);
      return { ...state, expandedCategories: next };
    }
    case 'SET_EXPANDED':
      return { ...state, expandedCategories: action.payload };
    default:
      return state;
  }
}

// --- Context ---
const CategoriesContext = createContext<CategoriesContextValue | null>(null);

// --- Helper ---
function buildCategoryTree(cats: Category[]): CategoryWithChildren[] {
  const topLevels = cats
    .filter(c => !c.parentId)
    .sort((a, b) => (a.weight ?? 0) - (b.weight ?? 0));
  const subcategories = cats.filter(c => c.parentId);
  return topLevels.map(cat => ({
    ...cat,
    children: subcategories
      .filter(sub => sub.parentId === cat.id)
      .sort((a, b) => (a.weight ?? 0) - (b.weight ?? 0)),
  }));
}

// --- Provider ---
export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(categoriesReducer, {
    categories: [],
    unlockedCategoryIds: new Set(),
    expandedCategories: new Set(),
  });

  const { authToken } = useAuthContext();

  const initCategories = useCallback((categories: Category[]) => {
    dispatch({ type: 'SET_CATEGORIES', payload: categories });
  }, []);

  const addCategory = useCallback((cat: Category) => {
    dispatch({ type: 'ADD_CATEGORY', payload: cat });
  }, []);

  const updateCategory = useCallback((cat: Category) => {
    dispatch({ type: 'UPDATE_CATEGORY', payload: cat });
  }, []);

  const deleteCategory = useCallback((id: string) => {
    dispatch({ type: 'DELETE_CATEGORY', payload: id });
  }, []);

  const unlockCategory = useCallback((id: string) => {
    dispatch({ type: 'UNLOCK_CATEGORY', payload: id });
  }, []);

  const toggleExpand = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_EXPAND', payload: id });
  }, []);

  const persist = useCallback(async (categories: Category[], links: LinkItem[]) => {
    const sanitizedCategories = stripCategorySecrets(categories);
    if (!authToken) {
      localStorage.setItem(STORAGE_KEYS.LOCAL_STORAGE_KEY, JSON.stringify({ links, categories: sanitizedCategories }));
      return true;
    }

    const [sitesRes, categoriesRes] = await Promise.all([
      fetch(API_ENDPOINTS.SITES, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links }),
      }),
      fetch(API_ENDPOINTS.CATEGORIES, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: categories.map(cat => ({
            ...cat,
            accessPasswordHash: cat.password ?? undefined,
          })),
        }),
      }),
    ]);

    if (!sitesRes.ok || !categoriesRes.ok) {
      const [sitesError, categoriesError] = await Promise.all([
        sitesRes.ok ? Promise.resolve(null) : sitesRes.json().catch(() => null),
        categoriesRes.ok ? Promise.resolve(null) : categoriesRes.json().catch(() => null),
      ]);
      throw new Error([
        !sitesRes.ok ? `sites:${sitesRes.status} ${typeof sitesError?.error === 'string' ? sitesError.error : ''} ${typeof sitesError?.details === 'string' ? sitesError.details : ''}`.trim() : null,
        !categoriesRes.ok ? `categories:${categoriesRes.status} ${typeof categoriesError?.error === 'string' ? categoriesError.error : ''} ${typeof categoriesError?.details === 'string' ? categoriesError.details : ''}`.trim() : null,
      ].filter(Boolean).join(' | '));
    }

    const categoriesPayload = await categoriesRes.json().catch(() => null);
    const nextCategories = Array.isArray(categoriesPayload?.categories)
      ? stripCategorySecrets(categoriesPayload.categories)
      : sanitizedCategories;

    localStorage.setItem(STORAGE_KEYS.LOCAL_STORAGE_KEY, JSON.stringify({ links, categories: nextCategories }));
    return true;
  }, [authToken]);

  const setCategoriesAndSync = useCallback(async (categories: Category[], links: LinkItem[]) => {
    try {
      const success = await persist(categories, links);
      if (!success) return false;
      const normalized = stripCategorySecrets(categories);
      dispatch({ type: 'SET_CATEGORIES', payload: normalized });
      return true;
    } catch (e) {
      console.error('Sync categories failed:', e);
      return false;
    }
  }, [persist]);

  const categoryTree = useMemo(() => buildCategoryTree(state.categories), [state.categories]);

  return (
    <CategoriesContext.Provider value={{
      ...state,
      initCategories,
      addCategory, updateCategory, deleteCategory,
      unlockCategory, toggleExpand, setCategoriesAndSync,
      categoryTree, buildCategoryTree,
    }}>
      {children}
    </CategoriesContext.Provider>
  );
}

// --- Hook ---
export function useCategoriesContext() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error('useCategoriesContext must be used within CategoriesProvider');
  return ctx;
}
