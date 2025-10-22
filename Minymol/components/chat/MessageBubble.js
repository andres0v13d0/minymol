/**
 * MessageBubble - Burbuja de mensaje individual con colas CSS
 * Minymol Minoristas
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatBubbleTime, formatDateSeparator, isSameDay } from '../../utils/chatHelpers';

const MessageBubble = ({ message, previousMessage, currentUserId }) => {
    // Determinar si el mensaje es mío
    const isMine = message.senderId === currentUserId || message.isSentByMe;

    // Obtener timestamp correcto (puede venir como createdAt, timestamp o updatedAt)
    const messageTime = message.createdAt || message.timestamp || message.updatedAt || new Date().toISOString();
    const previousTime = previousMessage?.createdAt || previousMessage?.timestamp || previousMessage?.updatedAt;

    // Determinar si mostrar separador de fecha
    // Como la lista está invertida, previousMessage es el mensaje más NUEVO (arriba en pantalla)
    // Mostrar separador solo si:
    // - No hay mensaje anterior (es el primer mensaje mostrado, el más reciente)
    // - O el mensaje anterior es de un día diferente
    const showDateSeparator = useMemo(() => {
        // Si no hay mensaje anterior, es el primer mensaje (más reciente) - NO mostrar separador
        if (!previousMessage || !previousTime) return false;
        
        // Mostrar separador si el día cambió respecto al mensaje anterior (más nuevo)
        return !isSameDay(
            new Date(previousTime),
            new Date(messageTime)
        );
    }, [previousMessage, previousTime, messageTime]);

    // Determinar icono de estado (solo para mensajes míos)
    const getStatusIcon = () => {
        if (!isMine) return null;

        // Si tiene tempId, está enviando
        if (message.tempId) return '⏳';

        // Por estado
        if (message.isRead) return '✓✓';
        if (message.isDelivered) return '✓✓';
        
        // Fallback a campo status si existe
        switch (message.status) {
            case 'sending':
                return '⏳'; // Enviando
            case 'sent':
                return '✓'; // Enviado (un check)
            case 'delivered':
                return '✓✓'; // Entregado (doble check)
            case 'read':
                return '✓✓'; // Leído (doble check azul)
            case 'failed':
                return '❌'; // Error
            default:
                return '✓';
        }
    };

    const statusIcon = getStatusIcon();
    const isRead = message.isRead || message.status === 'read';

    return (
        <>
            {/* Separador de fecha */}
            {showDateSeparator && (
                <View style={styles.dateSeparatorContainer}>
                    <View style={styles.dateSeparatorLine} />
                    <Text style={styles.dateSeparatorText}>
                        {formatDateSeparator(new Date(messageTime))}
                    </Text>
                    <View style={styles.dateSeparatorLine} />
                </View>
            )}

            {/* Burbuja de mensaje */}
            <View style={[
                styles.messageRow,
                isMine ? styles.messageRowMine : styles.messageRowOther
            ]}>
                <View style={[
                    styles.bubble,
                    isMine ? styles.bubbleMine : styles.bubbleOther
                ]}>
                    {/* Cola de la burbuja (triángulo CSS) */}
                    <View style={[
                        styles.bubbleTail,
                        isMine ? styles.bubbleTailMine : styles.bubbleTailOther
                    ]} />

                    {/* Contenido del mensaje */}
                    <Text style={[
                        styles.messageText,
                        isMine ? styles.messageTextMine : styles.messageTextOther
                    ]}>
                        {message.message}
                    </Text>

                    {/* Hora y estado */}
                    <View style={styles.metaContainer}>
                        <Text style={[
                            styles.timeText,
                            isMine ? styles.timeTextMine : styles.timeTextOther
                        ]}>
                            {formatBubbleTime(new Date(messageTime))}
                        </Text>

                        {/* Icono de estado (solo para mensajes míos) */}
                        {isMine && statusIcon && (
                            <Text style={[
                                styles.statusIcon,
                                isRead && styles.statusIconRead
                            ]}>
                                {statusIcon}
                            </Text>
                        )}
                    </View>
                </View>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    // ============================================================
    // SEPARADOR DE FECHA
    // ============================================================
    dateSeparatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
        paddingHorizontal: 20,
    },
    dateSeparatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#e0e0e0',
    },
    dateSeparatorText: {
        marginHorizontal: 10,
        fontSize: 12,
        color: '#999',
        fontWeight: '600',
        textTransform: 'uppercase',
    },

    // ============================================================
    // CONTENEDOR DE MENSAJE
    // ============================================================
    messageRow: {
        flexDirection: 'row',
        marginBottom: 12,
        paddingHorizontal: 12,
    },
    messageRowMine: {
        justifyContent: 'flex-end',
    },
    messageRowOther: {
        justifyContent: 'flex-start',
    },

    // ============================================================
    // BURBUJA
    // ============================================================
    bubble: {
        maxWidth: '75%',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
        position: 'relative',
        // Sombra suave
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 1,
    },
    bubbleMine: {
        backgroundColor: '#FFD4A3', // Naranja claro (mensajes míos)
        borderBottomRightRadius: 4, // Esquina inferior derecha cuadrada para la cola
    },
    bubbleOther: {
        backgroundColor: '#ffffff', // Blanco (mensajes de otros)
        borderBottomLeftRadius: 4, // Esquina inferior izquierda cuadrada para la cola
    },

    // ============================================================
    // COLA DE BURBUJA (Triángulo CSS)
    // ============================================================
    bubbleTail: {
        position: 'absolute',
        bottom: 0,
        width: 0,
        height: 0,
        borderStyle: 'solid',
    },
    bubbleTailMine: {
        right: -6, // Posicionar a la derecha
        borderWidth: 8,
        borderColor: 'transparent',
        borderLeftColor: '#FFD4A3', // Mismo color que la burbuja
        borderBottomWidth: 0,
        borderTopWidth: 10,
    },
    bubbleTailOther: {
        left: -6, // Posicionar a la izquierda
        borderWidth: 8,
        borderColor: 'transparent',
        borderRightColor: '#ffffff', // Mismo color que la burbuja
        borderBottomWidth: 0,
        borderTopWidth: 10,
    },

    // ============================================================
    // TEXTO DEL MENSAJE
    // ============================================================
    messageText: {
        fontSize: 15,
        lineHeight: 20,
        marginBottom: 4,
    },
    messageTextMine: {
        color: '#2b2b2b', // Texto oscuro sobre fondo naranja
    },
    messageTextOther: {
        color: '#2b2b2b', // Texto oscuro sobre fondo blanco
    },

    // ============================================================
    // META (HORA + ESTADO)
    // ============================================================
    metaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 2,
        gap: 4,
    },
    timeText: {
        fontSize: 11,
        fontWeight: '500',
    },
    timeTextMine: {
        color: '#7d5a3a', // Marrón oscuro sobre naranja
    },
    timeTextOther: {
        color: '#999', // Gris sobre blanco
    },
    statusIcon: {
        fontSize: 12,
        color: '#7d5a3a', // Marrón oscuro por defecto
    },
    statusIconRead: {
        color: '#4a90e2', // Azul cuando está leído
    },
});

export default React.memo(MessageBubble);
