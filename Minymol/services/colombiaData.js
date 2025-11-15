import axios from 'axios';

/**
 * Servicio centralizado para manejar departamentos y ciudades de Colombia
 * Carga los datos desde una API externa y los cachea en memoria
 */

// Cache en memoria
let cachedDepartments = null;
let loadingPromise = null;

const COLOMBIA_API_URL = 'https://raw.githubusercontent.com/marcovega/colombia-json/master/colombia.json';

/**
 * Carga los departamentos y ciudades desde la API externa
 * Implementa caché para evitar múltiples llamadas
 * @returns {Promise<Array>} Array de departamentos con sus ciudades
 */
export const loadDepartments = async () => {
    // Si ya están cargados, retornar del caché
    if (cachedDepartments) {
        return cachedDepartments;
    }

    // Si ya hay una petición en curso, esperar a que termine
    if (loadingPromise) {
        return loadingPromise;
    }

    // Hacer la petición y cachearla
    loadingPromise = axios
        .get(COLOMBIA_API_URL)
        .then(response => {
            cachedDepartments = response.data;
            loadingPromise = null;
            return cachedDepartments;
        })
        .catch(error => {
            loadingPromise = null;
            console.error('Error cargando departamentos de Colombia:', error);
            throw error;
        });

    return loadingPromise;
};

/**
 * Obtiene las ciudades de un departamento específico
 * @param {string} departmentName - Nombre del departamento
 * @returns {Promise<Array<string>>} Array de nombres de ciudades
 */
export const getCitiesByDepartment = async (departmentName) => {
    const departments = await loadDepartments();
    const department = departments.find(d => d.departamento === departmentName);
    return department ? department.ciudades : [];
};

/**
 * Obtiene todos los departamentos
 * @returns {Promise<Array>} Array de departamentos completos
 */
export const getDepartments = async () => {
    return await loadDepartments();
};

/**
 * Obtiene solo los nombres de los departamentos
 * @returns {Promise<Array<string>>} Array de nombres de departamentos
 */
export const getDepartmentNames = async () => {
    const departments = await loadDepartments();
    return departments.map(d => d.departamento);
};

/**
 * Limpia el caché (útil para testing o refrescar datos)
 */
export const clearCache = () => {
    cachedDepartments = null;
    loadingPromise = null;
};

/**
 * Verifica si un departamento existe
 * @param {string} departmentName - Nombre del departamento
 * @returns {Promise<boolean>}
 */
export const departmentExists = async (departmentName) => {
    const departments = await loadDepartments();
    return departments.some(d => d.departamento === departmentName);
};

/**
 * Verifica si una ciudad existe en un departamento específico
 * @param {string} departmentName - Nombre del departamento
 * @param {string} cityName - Nombre de la ciudad
 * @returns {Promise<boolean>}
 */
export const cityExistsInDepartment = async (departmentName, cityName) => {
    const cities = await getCitiesByDepartment(departmentName);
    return cities.includes(cityName);
};

export default {
    loadDepartments,
    getCitiesByDepartment,
    getDepartments,
    getDepartmentNames,
    clearCache,
    departmentExists,
    cityExistsInDepartment
};
