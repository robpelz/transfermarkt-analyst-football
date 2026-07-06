// src/hooks/useScouting.js
import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';


export const useScouting = () => {
  const [scoutingList, setScoutingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

const loadScoutingList = useCallback(async () => {
  setLoading(true);
  setError(null);
  
  try {
    // Verwende den neuen Batch-Endpoint
    const response = await api.get('/scouting/with-details');
    setScoutingList(response.data);
  } catch (err) {
    setError(err.message);
    console.error('Fehler beim Laden:', err);
  } finally {
    setLoading(false);
  }
}, []);

  const addScouting = useCallback(async (player, formData) => {
    try {
      const response = await api.post(`/scouting/${player.id}`, formData);
      await loadScoutingList(); // Reload after add
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [loadScoutingList]);

  const updateScouting = useCallback(async (id, formData) => {
    try {
      const response = await api.put(`/scouting/${id}`, formData);
      await loadScoutingList(); // Reload after update
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [loadScoutingList]);

  const deleteScouting = useCallback(async (id) => {
    try {
      await api.delete(`/scouting/${id}`);
      await loadScoutingList(); // Reload after delete
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [loadScoutingList]);

  useEffect(() => {
    loadScoutingList();
  }, [loadScoutingList]);

  return { scoutingList, loading, error, addScouting, updateScouting, deleteScouting, reload: loadScoutingList };
};