import subcategoriesData from '../assets/data/subcategories.json';

/**
 * SubCategoriesManager - Maneja subcategorías con carga estática y sincronización en background
 */
class SubCategoriesManager {
    constructor() {
        this.staticData = subcategoriesData;
        this.syncInProgress = false;
        this.lastSyncTime = null;

        // TTL para sincronización (5 minutos)
        this.SYNC_TTL = 5 * 60 * 1000;
    }

    /**
     * Obtener subcategorías de una categoría - INSTANTÁNEO desde JSON
     */
    getSubCategories(categorySlug) {
        const category = this.staticData.categories[categorySlug];
        return category ? category.subcategories || [] : [];
    }

    /**
     * Obtener todas las categorías con sus subcategorías
     */
    getAllCategories() {
        return this.staticData.categories;
    }

    /**
     * Verificar si necesitamos sincronizar con la base de datos
     */
    shouldSync() {
        if (!this.lastSyncTime) return true;

        const now = Date.now();
        return (now - this.lastSyncTime) > this.SYNC_TTL;
    }

    /**
     * Sincronizar subcategorías con la base de datos en background
     */
    async syncWithDatabase() {
        // Evitar múltiples sincronizaciones simultáneas
        if (this.syncInProgress) {
            console.log('🔄 Sincronización ya en progreso...');
            return;
        }

        // Solo sincronizar si es necesario
        if (!this.shouldSync()) {
            console.log('✅ Subcategorías sincronizadas recientemente');
            return;
        }

        this.syncInProgress = true;
        console.log('🌐 Sincronizando subcategorías en background...');

        try {
            // Usar la misma URL que funciona en el contexto principal
            const response = await fetch('https://api.minymol.com/categories/with-products-and-images');

            if (!response.ok) {
                // Si hay error 400 o similar, no es crítico - continuar con datos estáticos
                console.log(`⚠️ API no disponible (${response.status}), usando datos estáticos`);
                return false;
            }

            const apiData = await response.json();

            // Convertir datos de API al formato esperado
            const formattedData = this.formatApiData(apiData);

            // Comparar con datos estáticos
            if (this.hasChanges(formattedData)) {
                console.log('🔄 Cambios detectados, actualizando subcategorías...');
                this.staticData.categories = formattedData;
                this.staticData.lastUpdated = new Date().toISOString();

                // Aquí podrías guardar en AsyncStorage si quieres persistencia
                // await this.saveToStorage();

                console.log('✅ Subcategorías actualizadas exitosamente');
                return true; // Indica que hubo cambios
            } else {
                console.log('✅ Subcategorías están actualizadas');
                return false; // No hubo cambios
            }

        } catch (error) {
            // Error de red o parsing - no es crítico, continuar con datos estáticos
            console.log('⚠️ Error de conexión al sincronizar subcategorías, usando datos estáticos');
            // No mostrar error completo para evitar ruido en los logs
            // En producción, los datos estáticos son suficientes
            return false;
        } finally {
            this.syncInProgress = false;
            this.lastSyncTime = Date.now();
        }
    }

    /**
     * Formatear datos de la API al formato interno
     */
    formatApiData(apiData) {
        const formatted = {};

        // Extraer el array de categorías, manejando la estructura { value: [...] }
        const categories = apiData.value || apiData || [];
        
        if (Array.isArray(categories)) {
            categories.forEach(category => {
                if (category.slug) {
                    formatted[category.slug] = {
                        id: category.id,
                        slug: category.slug,
                        name: category.name,
                        subcategories: category.subcategories || category.subCategories || []
                    };
                }
            });
        }

        return formatted;
    }

    /**
     * Verificar si hay cambios entre los datos actuales y los nuevos
     */
    hasChanges(newData) {
        try {
            const currentJson = JSON.stringify(this.staticData.categories);
            const newJson = JSON.stringify(newData);
            return currentJson !== newJson;
        } catch (error) {
            console.error('Error comparando datos:', error);
            return false;
        }
    }

    /**
     * Obtener información de versión y última actualización
     */
    getInfo() {
        return {
            version: this.staticData.version,
            lastUpdated: this.staticData.lastUpdated,
            lastSyncTime: this.lastSyncTime,
            syncInProgress: this.syncInProgress
        };
    }

    /**
     * Forzar sincronización (para debugging)
     */
    async forceSync() {
        this.lastSyncTime = null;
        return await this.syncWithDatabase();
    }
}

// Exportar instancia singleton
const subCategoriesManager = new SubCategoriesManager();
export default subCategoriesManager;