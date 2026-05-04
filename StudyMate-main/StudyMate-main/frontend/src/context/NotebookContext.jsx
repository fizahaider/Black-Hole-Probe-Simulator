import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import notebookService from '../services/notebookService';
import { useAuth } from './AuthContext';

const NotebookContext = createContext(null);

export const NotebookProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [spaces, setSpaces] = useState([]);
    const [activeSpace, setActiveSpace] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchSpaces = useCallback(async () => {
        if (!isAuthenticated) return;
        setIsLoading(true);
        try {
            const data = await notebookService.getSpaces();
            setSpaces(data);
            if (data.length > 0 && !activeSpace) {
                const savedSpaceId = localStorage.getItem('activeSpaceId');
                const lastSpace = data.find(s => s.id === savedSpaceId) || data[0];
                setActiveSpace(lastSpace);
            }
        } catch (err) {
            console.error('Fetch spaces error:', err);
            setError('Failed to load knowledge spaces.');
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, activeSpace]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchSpaces();
        } else {
            setSpaces([]);
            setActiveSpace(null);
        }
    }, [isAuthenticated, fetchSpaces]);

    useEffect(() => {
        if (activeSpace) {
            localStorage.setItem('activeSpaceId', activeSpace.id);
        }
    }, [activeSpace]);

    const createSpace = async (spaceData) => {
        try {
            const newSpace = await notebookService.createSpace(spaceData);
            setSpaces(prev => [...prev, newSpace]);
            setActiveSpace(newSpace);
            return newSpace;
        } catch (err) {
            throw new Error(err.response?.data?.message || 'Failed to create space');
        }
    };

    const updateSpace = async (id, spaceData) => {
        try {
            const updated = await notebookService.updateSpace(id, spaceData);
            setSpaces(prev => prev.map(s => s.id === id ? updated : s));
            if (activeSpace?.id === id) setActiveSpace(updated);
            return updated;
        } catch (err) {
            throw new Error(err.response?.data?.message || 'Failed to update space');
        }
    };

    const deleteSpace = async (id) => {
        try {
            await notebookService.deleteSpace(id);
            setSpaces(prev => prev.filter(s => s.id !== id));
            if (activeSpace?.id === id) {
                const remaining = spaces.filter(s => s.id !== id);
                setActiveSpace(remaining.length > 0 ? remaining[0] : null);
            }
        } catch (err) {
            throw new Error(err.response?.data?.message || 'Failed to delete space');
        }
    };

    const switchSpace = (id) => {
        const space = spaces.find(s => s.id === id);
        if (space) setActiveSpace(space);
    };

    const value = {
        spaces,
        activeSpace,
        isLoading,
        error,
        createSpace,
        updateSpace,
        deleteSpace,
        switchSpace,
        refreshSpaces: fetchSpaces
    };

    return <NotebookContext.Provider value={value}>{children}</NotebookContext.Provider>;
};

export const useNotebook = () => {
    const context = useContext(NotebookContext);
    if (!context) throw new Error('useNotebook must be used within NotebookProvider');
    return context;
};
