/**
 * ContactsListModal - Modal deslizable con contactos del teléfono
 * Compara contactos locales con usuarios de Minymol
 * Minymol Minoristas
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    Modal,
    StyleSheet,
    ActivityIndicator,
    Platform,
    Dimensions,
    Animated,
    Alert,
    Linking,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Contacts from 'expo-contacts';
import ChatService from '../../services/chat/ChatService';
import { getUbuntuFont } from '../../utils/fonts';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Claves para AsyncStorage
const CONTACTS_CACHE_KEY = '@minymol_minoristas_matched_contacts';
const CONTACTS_TIMESTAMP_KEY = '@minymol_minoristas_contacts_timestamp';
const CACHE_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 horas

const COLORS = {
    background: '#ffffff',
    overlay: 'rgba(0, 0, 0, 0.5)',
    border: '#e2e8f0',
    primaryText: '#1e293b',
    secondaryText: '#64748b',
    primary: '#fa7e17',
    success: '#10b981',
    muted: '#94a3b8',
};

const ContactsListModal = ({ visible, onClose, onSelectContact }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [matchedContacts, setMatchedContacts] = useState([]);
    const [slideAnim] = useState(new Animated.Value(SCREEN_HEIGHT)); // Inicia desde abajo

    // ============================================================
    // ANIMACIÓN AL ABRIR/CERRAR
    // ============================================================
    useEffect(() => {
        if (visible) {
            // Animar entrada desde abajo
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 11,
            }).start();

            loadContacts();
        } else {
            // Animar salida hacia abajo
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    // ============================================================
    // CARGAR CONTACTOS
    // ============================================================
    const loadContacts = async () => {
        try {
            // 1. Intentar cargar desde caché primero
            const cachedData = await loadFromCache();
            if (cachedData) {
                console.log('📦 Contactos cargados desde caché');
                setMatchedContacts(cachedData);
                setLoading(false);
                
                // Actualizar en background
                updateContactsInBackground();
                return;
            }

            // 2. Si no hay caché, cargar normalmente con loading
            setLoading(true);
            await fetchAndCacheContacts();

        } catch (error) {
            console.error('Error cargando contactos:', error);
            Alert.alert('Error', 'No se pudieron cargar los contactos.');
            setLoading(false);
        }
    };

    // ============================================================
    // CARGAR DESDE CACHÉ
    // ============================================================
    const loadFromCache = async () => {
        try {
            const [cachedContacts, cachedTimestamp] = await Promise.all([
                AsyncStorage.getItem(CONTACTS_CACHE_KEY),
                AsyncStorage.getItem(CONTACTS_TIMESTAMP_KEY),
            ]);

            if (!cachedContacts || !cachedTimestamp) {
                return null;
            }

            const timestamp = parseInt(cachedTimestamp, 10);
            const now = Date.now();

            // Verificar si el caché está expirado
            if (now - timestamp > CACHE_EXPIRATION_TIME) {
                console.log('⏰ Caché expirado, recargando...');
                return null;
            }

            return JSON.parse(cachedContacts);
        } catch (error) {
            console.error('Error leyendo caché:', error);
            return null;
        }
    };

    // ============================================================
    // GUARDAR EN CACHÉ
    // ============================================================
    const saveToCache = async (contacts) => {
        try {
            await Promise.all([
                AsyncStorage.setItem(CONTACTS_CACHE_KEY, JSON.stringify(contacts)),
                AsyncStorage.setItem(CONTACTS_TIMESTAMP_KEY, Date.now().toString()),
            ]);
            console.log('💾 Contactos guardados en caché');
        } catch (error) {
            console.error('Error guardando caché:', error);
        }
    };

    // ============================================================
    // OBTENER Y CACHEAR CONTACTOS
    // ============================================================
    const fetchAndCacheContacts = async () => {
        // 1. Solicitar permisos
        const { status } = await Contacts.requestPermissionsAsync();
        if (status !== 'granted') {
            setPermissionGranted(false);
            Alert.alert(
                'Permisos necesarios',
                'Necesitamos acceso a tus contactos para mostrarte quiénes usan Minymol.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Ir a Configuración', onPress: () => Linking.openSettings() },
                ]
            );
            setLoading(false);
            return;
        }

        setPermissionGranted(true);

        // 2. Obtener contactos del teléfono
        const { data: phoneContacts } = await Contacts.getContactsAsync({
            fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Image],
        });

        // 3. Obtener usuarios de Minymol
        const minymolUsers = await ChatService.getAvailableContacts();

        // 4. Normalizar números de teléfono y hacer matching
        const matched = phoneContacts
            .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
            .map(contact => {
                const normalizedPhones = contact.phoneNumbers.map(pn => 
                    normalizePhoneNumber(pn.number || '')
                );

                // Buscar si alguno de los números coincide con usuarios de Minymol
                const minymolUser = minymolUsers.find(user => {
                    const userPhone = normalizePhoneNumber(user.telefono || '');
                    return normalizedPhones.includes(userPhone);
                });

                return {
                    phoneContact: {
                        id: contact.id,
                        name: contact.name || 'Sin nombre',
                        phoneNumbers: normalizedPhones,
                        imageAvailable: contact.imageAvailable || false,
                    },
                    minymolUser,
                };
            })
            .sort((a, b) => {
                // Ordenar: 
                // 1. Usuarios que SÍ puedes chatear primero
                const canChatA = a.minymolUser?.canChat !== false;
                const canChatB = b.minymolUser?.canChat !== false;
                
                if (canChatA && !canChatB) return -1;
                if (!canChatA && canChatB) return 1;
                
                // 2. Dentro de cada grupo, usuarios de Minymol primero
                if (a.minymolUser && !b.minymolUser) return -1;
                if (!a.minymolUser && b.minymolUser) return 1;
                
                // 3. Por último, orden alfabético
                return a.phoneContact.name.localeCompare(b.phoneContact.name);
            });

        setMatchedContacts(matched);
        await saveToCache(matched);
        setLoading(false);
    };

    // ============================================================
    // ACTUALIZAR EN BACKGROUND
    // ============================================================
    const updateContactsInBackground = async () => {
        console.log('🔄 Actualizando contactos en background...');
        try {
            // Verificar permisos sin mostrar UI
            const { status } = await Contacts.getPermissionsAsync();
            if (status !== 'granted') {
                return;
            }

            // Obtener contactos y usuarios de Minymol
            const [contactsResult, minymolUsers] = await Promise.all([
                Contacts.getContactsAsync({
                    fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Image],
                }),
                ChatService.getAvailableContacts(),
            ]);

            const phoneContacts = contactsResult.data;

            // Hacer matching
            const matched = phoneContacts
                .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
                .map(contact => {
                    const normalizedPhones = contact.phoneNumbers.map(pn => 
                        normalizePhoneNumber(pn.number || '')
                    );

                    const minymolUser = minymolUsers.find(user => {
                        const userPhone = normalizePhoneNumber(user.telefono || '');
                        return normalizedPhones.includes(userPhone);
                    });

                    return {
                        phoneContact: {
                            id: contact.id,
                            name: contact.name || 'Sin nombre',
                            phoneNumbers: normalizedPhones,
                            imageAvailable: contact.imageAvailable || false,
                        },
                        minymolUser,
                    };
                })
                .sort((a, b) => {
                    // Ordenar: 
                    // 1. Usuarios que SÍ puedes chatear primero
                    const canChatA = a.minymolUser?.canChat !== false;
                    const canChatB = b.minymolUser?.canChat !== false;
                    
                    if (canChatA && !canChatB) return -1;
                    if (!canChatA && canChatB) return 1;
                    
                    // 2. Dentro de cada grupo, usuarios de Minymol primero
                    if (a.minymolUser && !b.minymolUser) return -1;
                    if (!a.minymolUser && b.minymolUser) return 1;
                    
                    // 3. Por último, orden alfabético
                    return a.phoneContact.name.localeCompare(b.phoneContact.name);
                });

            // Actualizar UI y caché
            setMatchedContacts(matched);
            await saveToCache(matched);
            console.log('✅ Contactos actualizados en background');
        } catch (error) {
            console.error('Error actualizando contactos en background:', error);
        }
    };

    // ============================================================
    // NORMALIZAR NÚMERO DE TELÉFONO
    // ============================================================
    const normalizePhoneNumber = (phone) => {
        // Eliminar todo excepto números
        let normalized = phone.replace(/\D/g, '');
        
        // Si empieza con código de país (ej: 57 para Colombia), dejarlo
        // Si no, agregar código de país predeterminado
        if (normalized.length === 10) {
            // Asume número local de 10 dígitos, agregar código de país
            normalized = '57' + normalized; // Colombia
        }
        
        return normalized;
    };

    // ============================================================
    // SELECCIONAR CONTACTO
    // ============================================================
    const handleContactPress = (matched) => {
        if (matched.minymolUser) {
            // Verificar si se puede chatear con este contacto
            if (matched.minymolUser.canChat === false) {
                const roleMessage = matched.minymolUser.rol === 'proveedor' 
                    ? 'No puedes chatear con otros proveedores'
                    : matched.minymolUser.rol === 'comerciante'
                    ? 'No puedes chatear con otros comerciantes'
                    : 'No puedes chatear con este usuario';
                
                Alert.alert(
                    'Chat no disponible', 
                    roleMessage,
                    [{ text: 'Entendido', style: 'cancel' }]
                );
                return;
            }
            
            // Usuario está en Minymol y SÍ se puede chatear - cerrar este modal
            onClose();
            
            // Logo por defecto para comerciantes
            const logoUrl = matched.minymolUser.rol === 'comerciante'
                ? 'https://cdn-icons-png.flaticon.com/512/3106/3106773.png'
                : matched.minymolUser.logo_url;
            
            // Luego de un pequeño delay, abrir el chat modal con animación
            setTimeout(() => {
                onSelectContact(
                    matched.minymolUser.userId,
                    matched.minymolUser.nombre,
                    logoUrl
                );
            }, 300); // Esperar a que termine la animación de cierre
        } else {
            // Usuario NO está en Minymol - invitar
            handleInviteContact(matched.phoneContact);
        }
    };

    // ============================================================
    // INVITAR CONTACTO
    // ============================================================
    const handleInviteContact = (contact) => {
        const message = `¡Hola ${contact.name}! Te invito a usar Minymol, la app para minoristas. Descárgala aquí: https://minymol.com/descargar`;
        
        const phoneNumber = contact.phoneNumbers[0];
        const whatsappUrl = Platform.select({
            ios: `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`,
            android: `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`,
        });

        Linking.canOpenURL(whatsappUrl)
            .then(supported => {
                if (supported) {
                    Linking.openURL(whatsappUrl);
                } else {
                    // Fallback a SMS
                    const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
                    Linking.openURL(smsUrl);
                }
            })
            .catch(() => {
                Alert.alert('Error', 'No se pudo abrir WhatsApp o SMS.');
            });
    };

    // ============================================================
    // FILTRAR CONTACTOS
    // ============================================================
    const filteredContacts = matchedContacts.filter(matched => 
        matched.phoneContact.name.toLowerCase().includes(searchQuery.toLowerCase())
    );


    // ============================================================
    // RENDERIZAR CONTACTO
    // ============================================================
    const renderContact = ({ item }) => {
        const isOnMinymol = !!item.minymolUser;
        const cannotChat = item.minymolUser?.canChat === false;

        return (
            <TouchableOpacity
                style={[styles.contactItem, cannotChat && { opacity: 0.5 }]}
                onPress={() => handleContactPress(item)}
                activeOpacity={0.7}
            >
                {/* Avatar */}
                <View style={[styles.avatar, { backgroundColor: isOnMinymol ? COLORS.primary : COLORS.muted }]}>
                    {item.minymolUser ? (
                        item.minymolUser.rol === 'comerciante' ? (
                            // Ícono para comerciantes
                            <Ionicons name="storefront" size={28} color="#ffffff" />
                        ) : item.minymolUser.logo_url ? (
                            // Logo para proveedores
                            <Image source={{ uri: item.minymolUser.logo_url }} style={styles.avatarImage} />
                        ) : (
                            // Inicial si no hay logo
                            <Text style={styles.avatarText}>
                                {item.phoneContact.name.charAt(0).toUpperCase()}
                            </Text>
                        )
                    ) : (
                        <Text style={styles.avatarText}>
                            {item.phoneContact.name.charAt(0).toUpperCase()}
                        </Text>
                    )}
                </View>

                {/* Info */}
                <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>
                        {item.minymolUser?.nombre || item.phoneContact.name}
                    </Text>
                    {cannotChat ? (
                        <Text style={[styles.contactPhone, { color: '#dc2626', fontStyle: 'italic' }]}>
                            {item.minymolUser?.rol === 'proveedor' 
                                ? 'No puedes chatear con proveedores' 
                                : 'No puedes chatear con comerciantes'}
                        </Text>
                    ) : (
                        <Text style={styles.contactPhone}>
                            {item.phoneContact.phoneNumbers[0]}
                        </Text>
                    )}
                </View>

                {/* Action */}
                {isOnMinymol && !cannotChat ? (
                    <View style={styles.chatButton}>
                        <Ionicons name="chatbubble-ellipses" size={20} color={COLORS.primary} />
                        <Text style={styles.chatButtonText}>Chatear</Text>
                    </View>
                ) : !isOnMinymol ? (
                    <View style={styles.inviteButton}>
                        <Ionicons name="person-add-outline" size={20} color={COLORS.secondaryText} />
                        <Text style={styles.inviteButtonText}>Invitar</Text>
                    </View>
                ) : null}
            </TouchableOpacity>
        );
    };

    // ============================================================
    // ESTADO VACÍO
    // ============================================================
    const renderEmptyState = () => {
        if (loading) return null;

        if (!permissionGranted) {
            return (
                <View style={styles.emptyState}>
                    <Ionicons name="lock-closed-outline" size={64} color={COLORS.secondaryText} />
                    <Text style={styles.emptyStateTitle}>Permisos necesarios</Text>
                    <Text style={styles.emptyStateSubtitle}>
                        Necesitamos acceso a tus contactos para mostrarte quiénes usan Minymol
                    </Text>
                    <TouchableOpacity style={styles.grantPermissionButton} onPress={loadContacts}>
                        <Text style={styles.grantPermissionText}>Conceder permiso</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color={COLORS.secondaryText} />
                <Text style={styles.emptyStateTitle}>No hay contactos</Text>
                <Text style={styles.emptyStateSubtitle}>
                    No se encontraron contactos en tu teléfono
                </Text>
            </View>
        );
    };


    // ============================================================
    // RENDER
    // ============================================================
    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                {/* Overlay */}
                <TouchableOpacity 
                    style={styles.overlay} 
                    activeOpacity={1}
                    onPress={onClose}
                />

                {/* Contenido deslizable desde abajo */}
                <Animated.View 
                    style={[
                        styles.content,
                        { transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    {/* Header con botón cerrar */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Nuevo chat</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={28} color={COLORS.primaryText} />
                        </TouchableOpacity>
                    </View>

                    {/* Buscador */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color={COLORS.secondaryText} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar contacto..."
                            placeholderTextColor={COLORS.secondaryText}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCapitalize="none"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color={COLORS.secondaryText} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Contador */}
                    {!loading && matchedContacts.length > 0 && (
                        <View style={styles.counterContainer}>
                            <Text style={styles.counterText}>
                                {matchedContacts.filter(c => c.minymolUser).length} contactos en Minymol
                            </Text>
                        </View>
                    )}

                    {/* Lista de contactos */}
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                            <Text style={styles.loadingText}>Cargando contactos...</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredContacts}
                            keyExtractor={(item) => item.phoneContact.id}
                            renderItem={renderContact}
                            ListEmptyComponent={renderEmptyState}
                            contentContainerStyle={filteredContacts.length === 0 ? styles.emptyList : undefined}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end', // Alinear al fondo
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.overlay,
    },
    content: {
        width: SCREEN_WIDTH, // Todo el ancho
        height: SCREEN_HEIGHT * 0.9, // 90% de la altura
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    closeButton: {
        padding: 8,
        position: 'absolute',
        right: 12,
        top: 12,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 22,
        fontFamily: getUbuntuFont('bold'),
        color: COLORS.primaryText,
    },

    // Buscador
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        marginHorizontal: 16,
        marginVertical: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: COLORS.primaryText,
    },

    // Contador
    counterContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    counterText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
        color: COLORS.secondaryText,
    },

    // Lista
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    avatarText: {
        fontSize: 20,
        fontFamily: getUbuntuFont('bold'),
        color: '#ffffff',
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontFamily: getUbuntuFont('medium'),
        color: COLORS.primaryText,
        marginBottom: 2,
    },
    contactPhone: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: COLORS.secondaryText,
    },
    chatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff7ed',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    chatButtonText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
        color: COLORS.primary,
        marginLeft: 4,
    },
    inviteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    inviteButtonText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: COLORS.secondaryText,
        marginLeft: 4,
    },

    // Loading
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: COLORS.secondaryText,
    },

    // Empty state
    emptyList: {
        flex: 1,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 48,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontFamily: getUbuntuFont('bold'),
        color: COLORS.primaryText,
        marginTop: 16,
        textAlign: 'center',
    },
    emptyStateSubtitle: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: COLORS.secondaryText,
        marginTop: 8,
        textAlign: 'center',
        lineHeight: 20,
    },
    grantPermissionButton: {
        marginTop: 20,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    grantPermissionText: {
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        color: '#ffffff',
    },
});

export default ContactsListModal;
