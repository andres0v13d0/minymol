import AsyncStorage from '@react-native-async-storage/async-storage';

const SEARCH_HISTORY_KEY = 'searchHistory';
const MAX_HISTORY_ITEMS = 10;

export const searchHistoryStorage = {
    // Obtener historial de búsqueda
    async getHistory() {
        try {
            const history = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('Error al obtener historial de búsqueda:', error);
            return [];
        }
    },

    // Agregar término al historial
    async addSearchTerm(term) {
        try {
            if (!term || term.trim() === '') return;

            const currentHistory = await this.getHistory();
            const trimmedTerm = term.trim().toLowerCase();

            // Remover el término si ya existe (para evitar duplicados)
            const filteredHistory = currentHistory.filter(
                item => item.toLowerCase() !== trimmedTerm
            );

            // Agregar el nuevo término al inicio
            const newHistory = [term.trim(), ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);

            await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
        } catch (error) {
            console.error('Error al agregar término al historial:', error);
        }
    },

    // Eliminar un término específico del historial
    async removeSearchTerm(term) {
        try {
            const currentHistory = await this.getHistory();
            const filteredHistory = currentHistory.filter(
                item => item.toLowerCase() !== term.toLowerCase()
            );

            await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filteredHistory));
        } catch (error) {
            console.error('Error al eliminar término del historial:', error);
        }
    },

    // Limpiar todo el historial
    async clearHistory() {
        try {
            await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
        } catch (error) {
            console.error('Error al limpiar historial de búsqueda:', error);
        }
    },

    // Obtener sugerencias basadas en el texto actual
    async getSuggestions(text) {
        try {
            if (!text || text.trim() === '') {
                return await this.getHistory();
            }

            const history = await this.getHistory();
            const lowerText = text.toLowerCase();

            return history.filter(item =>
                item.toLowerCase().includes(lowerText)
            );
        } catch (error) {
            console.error('Error al obtener sugerencias:', error);
            return [];
        }
    }
};

export default searchHistoryStorage;