import AsyncStorage from '@react-native-async-storage/async-storage';

const SEARCH_HISTORY_KEY = '@minymol_search_history';
const MAX_HISTORY_ITEMS = 20; // Máximo número de búsquedas a guardar

export const searchHistoryStorage = {
    /**
     * Obtiene el historial de búsquedas
     * @returns {Promise<string[]>} Array de búsquedas ordenadas de más reciente a más antigua
     */
    async getSearchHistory() {
        try {
            const historyJson = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
            if (historyJson) {
                const history = JSON.parse(historyJson);
                return Array.isArray(history) ? history : [];
            }
            return [];
        } catch (error) {
            console.error('Error al obtener historial de búsquedas:', error);
            return [];
        }
    },

    /**
     * Añade una nueva búsqueda al historial
     * @param {string} searchText - Texto de búsqueda a añadir
     * @returns {Promise<void>}
     */
    async addSearch(searchText) {
        try {
            if (!searchText || typeof searchText !== 'string') {
                return;
            }

            const trimmedText = searchText.trim();
            if (!trimmedText) {
                return;
            }

            const currentHistory = await this.getSearchHistory();

            // Remover el término si ya existe (para evitar duplicados)
            const filteredHistory = currentHistory.filter(
                item => item.toLowerCase() !== trimmedText.toLowerCase()
            );

            // Añadir el nuevo término al principio
            const newHistory = [trimmedText, ...filteredHistory];

            // Limitar el número de elementos
            const limitedHistory = newHistory.slice(0, MAX_HISTORY_ITEMS);

            // Guardar en AsyncStorage
            await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(limitedHistory));
        } catch (error) {
            console.error('Error al guardar búsqueda en historial:', error);
            throw error;
        }
    },

    /**
     * Limpia todo el historial de búsquedas
     * @returns {Promise<void>}
     */
    async clearHistory() {
        try {
            await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
        } catch (error) {
            console.error('Error al limpiar historial de búsquedas:', error);
            throw error;
        }
    },

    /**
     * Elimina una búsqueda específica del historial
     * @param {string} searchText - Texto de búsqueda a eliminar
     * @returns {Promise<void>}
     */
    async removeSearch(searchText) {
        try {
            if (!searchText || typeof searchText !== 'string') {
                return;
            }

            const currentHistory = await this.getSearchHistory();
            const filteredHistory = currentHistory.filter(
                item => item.toLowerCase() !== searchText.trim().toLowerCase()
            );

            await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filteredHistory));
        } catch (error) {
            console.error('Error al eliminar búsqueda del historial:', error);
            throw error;
        }
    },

    /**
     * Obtiene las búsquedas más populares (las que más se repiten)
     * Nota: Para implementar esto necesitaríamos cambiar la estructura de datos
     * para incluir contadores de frecuencia
     * @returns {Promise<string[]>}
     */
    async getPopularSearches() {
        // Por ahora retorna las más recientes
        const history = await this.getSearchHistory();
        return history.slice(0, 10);
    }
};