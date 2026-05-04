import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/apiService.js';

const WardrobeContext = createContext(null);

export function WardrobeProvider({ children }) {
  const [wardrobe, setWardrobe]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [dressAttributes, setDressAttributes] = useState(null);
  const [currentSession, setCurrentSession]   = useState(null);

  // ── Load wardrobe from SQLite on mount ──
  const fetchWardrobe = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const items = await api.getWardrobe();
      setWardrobe(items);
    } catch (e) {
      console.error('Backend not reachable:', e.message);
      setError('Backend not connected. Data shown is local only.');
      // Keep wardrobe empty — do not show mock data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWardrobe(); }, [fetchWardrobe]);

  // ── CRUD ──
  const addItem = useCallback(async (item) => {
    try {
      const saved = await api.addItem(item);
      setWardrobe(prev => [saved, ...prev]);
      return saved;
    } catch (e) {
      console.error('addItem failed:', e.message);
      throw e;
    }
  }, []);

  const updateItem = useCallback(async (id, updates) => {
    try {
      const updated = await api.updateItem(id, updates);
      setWardrobe(prev => prev.map(i => i.id === id ? updated : i));
      return updated;
    } catch (e) {
      console.error('updateItem failed:', e.message);
      throw e;
    }
  }, []);

  const deleteItem = useCallback(async (id) => {
    try {
      await api.deleteItem(id);
      setWardrobe(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      console.error('deleteItem failed:', e.message);
      throw e;
    }
  }, []);

  const toggleFavourite = useCallback(async (id) => {
    try {
      const updated = await api.toggleFavourite(id);
      setWardrobe(prev => prev.map(i => i.id === id ? updated : i));
    } catch (e) {
      console.error('toggleFavourite failed:', e.message);
      // Optimistic update fallback
      setWardrobe(prev => prev.map(i => i.id === id ? { ...i, isFavourite: !i.isFavourite } : i));
    }
  }, []);

  const toggleAvailability = useCallback(async (id, isAvailable) => {
    try {
      const updated = await api.toggleAvailability(id, isAvailable);
      setWardrobe(prev => prev.map(i => i.id === id ? updated : i));
    } catch (e) {
      console.error('toggleAvailability failed:', e.message);
      setWardrobe(prev => prev.map(i => i.id === id ? { ...i, isAvailable } : i));
    }
  }, []);

  const incrementUsage = useCallback(async (id) => {
    try {
      const updated = await api.incrementUsage(id);
      setWardrobe(prev => prev.map(i => i.id === id ? updated : i));
    } catch (e) {
      console.error('incrementUsage failed:', e.message);
      setWardrobe(prev => prev.map(i => i.id === id ? { ...i, usage_count: (i.usage_count ?? 0) + 1 } : i));
    }
  }, []);

  return (
    <WardrobeContext.Provider value={{
      wardrobe, loading, error, fetchWardrobe,
      addItem, updateItem, deleteItem,
      toggleFavourite, toggleAvailability, incrementUsage,
      recommendations, setRecommendations,
      dressAttributes, setDressAttributes,
      currentSession, setCurrentSession,
    }}>
      {children}
    </WardrobeContext.Provider>
  );
}

export function useWardrobe() {
  return useContext(WardrobeContext);
}