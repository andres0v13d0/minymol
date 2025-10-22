/**
 * Funciones auxiliares para el módulo de chat
 * Minymol Minoristas
 */

// ============================================
// FORMATEO DE FECHAS
// ============================================

/**
 * Formatear fecha de mensaje en lista de conversaciones
 * Hoy: "14:30"
 * Ayer: "Ayer"
 * Esta semana: "Lunes"
 * Más antiguo: "12/10/2025"
 */
export function formatMessageTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return date.toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    if (diffDays === 1) {
        return 'Ayer';
    }

    if (diffDays < 7) {
        return date.toLocaleDateString('es-CO', { weekday: 'long' });
    }

    return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Formatear hora para burbuja de mensaje
 * "14:30"
 */
export function formatBubbleTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Formatear fecha completa para separador
 * "Hoy", "Ayer", "Lunes, 20 de octubre de 2025"
 */
export function formatDateSeparator(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';

    return date.toLocaleDateString('es-CO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

/**
 * Verificar si dos fechas son del mismo día
 */
export function isSameDay(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);

    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
}

// ============================================
// VALIDACIONES
// ============================================

/**
 * Validar que el texto no esté vacío
 */
export function isValidMessage(text) {
    return text.trim().length > 0 && text.trim().length <= 1000;
}

/**
 * Truncar texto largo
 */
export function truncateMessage(text, maxLength = 50) {
    // Validar que text sea un string
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// ============================================
// AVATAR Y COLORES
// ============================================

/**
 * Obtener inicial de nombre
 */
export function getInitial(name) {
    if (!name || name.length === 0) return '?';
    return name.charAt(0).toUpperCase();
}

/**
 * Generar color de avatar basado en nombre
 */
export function getAvatarColor(name) {
    const colors = [
        '#fa7e17', '#e66d0a', '#10b981', '#3b82f6',
        '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4',
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % colors.length;
    return colors[index];
}

// ============================================
// FORMATEO DE NÚMEROS
// ============================================

/**
 * Formatear contador de no leídos
 * 1-99: "1", "23"
 * 100+: "99+"
 */
export function formatUnreadCount(count) {
    if (count === 0) return '';
    if (count > 99) return '99+';
    return count.toString();
}

// ============================================
// TELÉFONOS
// ============================================

/**
 * Formatear número de teléfono
 * +573001234567 → (+57) 300 123 4567
 */
export function formatPhoneNumber(phone) {
    if (!phone) return '';

    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.startsWith('57') && cleaned.length === 12) {
        return `(+57) ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
    }

    if (cleaned.length === 10) {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    }

    return phone;
}
