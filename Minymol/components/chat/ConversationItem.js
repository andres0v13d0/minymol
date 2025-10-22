/**
 * ConversationItem - Item de lista de conversación
 * Minymol Minoristas
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatMessageTime, truncateMessage, getAvatarColor, getInitial, formatUnreadCount } from '../../utils/chatHelpers';

const ConversationItem = ({ conversation, onPress }) => {
    const {
        otherUserName,
        otherUserLogoUrl,
        lastMessageText,
        lastMessageTime,
        unreadCount,
        isProveedor
    } = conversation;

    const avatarColor = getAvatarColor(otherUserName || 'Usuario');
    const initial = getInitial(otherUserName || 'U');
    const hasLogo = otherUserLogoUrl && otherUserLogoUrl.trim() !== '';

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Avatar */}
            <View style={[styles.avatar, !hasLogo && { backgroundColor: avatarColor }]}>
                {hasLogo ? (
                    // Logo del proveedor
                    <Image 
                        source={{ uri: otherUserLogoUrl }} 
                        style={styles.logoImage}
                        resizeMode="cover"
                    />
                ) : isProveedor ? (
                    // Icono de tienda para proveedores sin logo
                    <Ionicons name="storefront" size={26} color="#fff" />
                ) : (
                    // Inicial para otros usuarios
                    <Text style={styles.avatarText}>{initial}</Text>
                )}
            </View>

            {/* Contenido */}
            <View style={styles.content}>
                {/* Nombre y hora */}
                <View style={styles.header}>
                    <Text style={styles.name} numberOfLines={1}>
                        {otherUserName || 'Usuario'}
                    </Text>
                    <Text style={styles.time}>
                        {formatMessageTime(new Date(lastMessageTime))}
                    </Text>
                </View>

                {/* Último mensaje y badge */}
                <View style={styles.footer}>
                    <Text
                        style={[
                            styles.lastMessage,
                            unreadCount > 0 && styles.lastMessageUnread
                        ]}
                        numberOfLines={1}
                    >
                        {truncateMessage(lastMessageText || 'Sin mensajes', 50)}
                    </Text>

                    {/* Badge de no leídos */}
                    {unreadCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                                {formatUnreadCount(unreadCount)}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },

    // ============================================================
    // AVATAR
    // ============================================================
    avatar: {
        width: 54,
        height: 54,
        borderRadius: 27,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    logoImage: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
        textTransform: 'uppercase',
    },

    // ============================================================
    // CONTENIDO
    // ============================================================
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    name: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#2b2b2b',
        marginRight: 8,
    },
    time: {
        fontSize: 12,
        color: '#999',
        fontWeight: '500',
    },

    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    lastMessage: {
        flex: 1,
        fontSize: 14,
        color: '#666',
        marginRight: 8,
    },
    lastMessageUnread: {
        color: '#2b2b2b',
        fontWeight: '600',
    },

    // ============================================================
    // BADGE DE NO LEÍDOS
    // ============================================================
    badge: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#fa7e17', // Naranja Minymol
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
    },
});

export default React.memo(ConversationItem);
