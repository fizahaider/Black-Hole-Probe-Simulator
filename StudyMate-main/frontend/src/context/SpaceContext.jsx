import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { spaceService } from '../services/spaceService';

const SpaceContext = createContext();

export const useSpace = () => useContext(SpaceContext);

export const SpaceProvider = ({ children }) => {
    const [spaces, setSpaces] = useState([]);
    const [currentSpace, setCurrentSpace] = useState(null);
    const [loading, setLoading] = useState(true);
    const hasInitialized = useRef(false);

    const fetchSpaces = async () => {
        setLoading(true);
        try {
            const data = await spaceService.getSpaces();
            setSpaces(data);
            if (data.length > 0 && !currentSpace) {
                
                const savedSpaceId = localStorage.getItem('currentSpaceId');
                if (savedSpaceId) {
                    const found = data.find(s => s.id === savedSpaceId);
                    if (found) {
                        setCurrentSpace(found);
                    } else {
                        
                        localStorage.removeItem('currentSpaceId');
                    }
                }
                
            }
        } catch (error) {
            console.error("Failed to fetch spaces", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!hasInitialized.current) {
            hasInitialized.current = true;
            fetchSpaces();
        }
    }, []);

    const selectSpace = (space) => {
        setCurrentSpace(space);
        if (space) localStorage.setItem('currentSpaceId', space.id);
        else localStorage.removeItem('currentSpaceId');
    };

    const addSpace = async (name, description) => {
        const newSpace = await spaceService.createSpace({ name, description });
        setSpaces([newSpace, ...spaces]);
        selectSpace(newSpace);
        return newSpace;
    };

    const removeSpace = async (id) => {
        await spaceService.deleteSpace(id);
        const updatedSpaces = spaces.filter(s => s.id !== id);
        setSpaces(updatedSpaces);
        if (currentSpace?.id === id) {
            selectSpace(updatedSpaces.length > 0 ? updatedSpaces[0] : null);
        }
    };

    const updateSpace = async (id, data) => {
        const updated = await spaceService.updateSpace(id, data);
        const updatedSpaces = spaces.map(s => s.id === id ? { ...s, ...updated } : s);
        setSpaces(updatedSpaces);
        if (currentSpace?.id === id) {
            setCurrentSpace({ ...currentSpace, ...updated });
        }
        return updated;
    };

    const contextValue = React.useMemo(() => ({
        spaces,
        currentSpace,
        selectSpace,
        addSpace,
        removeSpace,
        updateSpace,
        loading,
        refreshSpaces: fetchSpaces
    }), [spaces, currentSpace, loading]);

    return (
        <SpaceContext.Provider value={contextValue}>
            {children}
        </SpaceContext.Provider>
    );
};
