import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { auth } from '../config/firebase';

// Context para compartir favoritos globalmente
const FavoritesContext = createContext();

// Provider para envolver la app
export const FavoritesProvider = ({ children }) => {
    const [favorites, setFavorites] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [lastFetch, setLastFetch] = useState(0);
    const [userId, setUserId] = useState(null);

    // Obtener userId de AsyncStorage
    const loadUserId = useCallback(async () => {
        try {
            const userData = await AsyncStorage.getItem('usuario');
            if (userData) {
                const usuario = JSON.parse(userData);
                setUserId(usuario?.id);
                return usuario?.id;
            }
        } catch (error) {
            console.error('Error obteniendo userId:', error);
        }
        return null;
    }, []);

    // Cargar favoritos una sola vez
    const loadFavorites = useCallback(async (forceRefresh = false) => {
        const currentUserId = userId || await loadUserId();
        
        if (!currentUserId) {
            setFavorites(new Set());
            return;
        }

        // Throttling: solo recargar cada 30 segundos
        const now = Date.now();
        if (!forceRefresh && now - lastFetch < 30000) {
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`https://api.minymol.com/favorites/${currentUserId}`);

            if (!res.ok) {
                if (res.status === 429) {
                    return; // Silenciar rate limiting
                }
                if (res.status === 400) {
                    console.error('Error 400 en favoritos - posible problema con userId:', currentUserId);
                    setFavorites(new Set()); // Limpiar favoritos si hay error 400
                    return;
                }
                throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();
            const favoriteIds = new Set(data.map(fav => fav.id));
            setFavorites(favoriteIds);
            setLastFetch(now);
        } catch (err) {
            if (!err.message?.includes('429')) {
                console.error('Error cargando favoritos:', err);
            }
        } finally {
            setLoading(false);
        }
    }, [userId, lastFetch, loadUserId]);

    // Cargar favoritos cuando cambie el usuario
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const id = await loadUserId();
                if (id) {
                    loadFavorites();
                }
            } else {
                setFavorites(new Set());
                setUserId(null);
            }
        });

        return () => unsubscribe();
    }, [loadUserId, loadFavorites]);

    // Toggle favorito (optimista)
    const toggleFavorite = async (productId) => {
        const currentUserId = userId || await loadUserId();
        
        if (!currentUserId) return;

        const wasFavorite = favorites.has(productId);

        // Actualización optimista
        const newFavorites = new Set(favorites);
        if (wasFavorite) {
            newFavorites.delete(productId);
        } else {
            newFavorites.add(productId);
        }
        setFavorites(newFavorites);

        try {
            if (wasFavorite) {
                const res = await fetch(`https://api.minymol.com/favorites/${currentUserId}/${productId}`, {
                    method: 'DELETE',
                });

                if (!res.ok && res.status !== 429) {
                    throw new Error(`HTTP ${res.status}`);
                }
            } else {
                const res = await fetch('https://api.minymol.com/favorites', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUserId, productId }),
                });

                if (!res.ok && res.status !== 429) {
                    throw new Error(`HTTP ${res.status}`);
                }
            }
        } catch (err) {
            // Revertir cambio optimista si falla
            setFavorites(favorites);

            if (!err.message?.includes('429')) {
                console.error('Error al cambiar favorito:', err);
            }
        }
    };

    const value = {
        favorites,
        loading,
        isFavorite: (productId) => favorites.has(productId),
        toggleFavorite,
        refreshFavorites: () => loadFavorites(true),
    };

    return (
        <FavoritesContext.Provider value={value}>
            {children}
        </FavoritesContext.Provider>
    );
};

// Hook para usar en componentes
export const useFavorites = () => {
    const context = useContext(FavoritesContext);
    if (!context) {
        throw new Error('useFavorites debe usarse dentro de FavoritesProvider');
    }
    return context;
};
