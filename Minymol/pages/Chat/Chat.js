/**
 * Chat - Página principal de conversaciones (reemplaza Categories)
 * Minymol Minoristas
 */

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    StyleSheet,
    ActivityIndicator,
    Platform,
    StatusBar,
    InteractionManager
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ChatService from '../../services/chat/ChatService';
import ConversationItem from '../../components/chat/ConversationItem';
import ChatModal from '../../components/chat/ChatModal';
import ContactsListModal from '../../components/chat/ContactsListModal';
import NavInf from '../../components/NavInf/NavInf';
import { useCartCounter } from '../../contexts/CartCounterContext';

const Chat = ({ selectedTab, onTabPress }) => {
    // Obtener contador del carrito para el NavInf
    const { count: cartItemCount } = useCartCounter();
    
    // Estado de usuario (para verificar si está logueado)
    const [usuario, setUsuario] = useState(null);
    
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [chatInitialized, setChatInitialized] = useState(false);
    const [notAuthenticated, setNotAuthenticated] = useState(false);

    // Modales
    const [chatModalVisible, setChatModalVisible] = useState(false);
    const [contactsModalVisible, setContactsModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const isMounted = useRef(true);

    // ============================================================
    // INICIALIZACIÓN
    // ============================================================
    useEffect(() => {
        isMounted.current = true;

        // Solo cargar datos del usuario, que a su vez inicializará el chat
        loadUserData();

        return () => {
            isMounted.current = false;
        };
    }, []);

    // Recargar datos del usuario cuando se activa el tab
    useEffect(() => {
        if (selectedTab === 'messages' && !chatInitialized) {
            loadUserData();
        }
    }, [selectedTab]);

    const loadUserData = async () => {
        try {
            // ✅ OPTIMIZACIÓN: Usar InteractionManager para mejorar la carga
            InteractionManager.runAfterInteractions(async () => {
                const userData = await AsyncStorage.getItem('usuario');
                console.log('👤 loadUserData:', userData ? 'Usuario encontrado' : 'No hay usuario');
                
                if (userData) {
                    const user = JSON.parse(userData);
                    console.log('   └─ Usuario:', user.nombre, `(ID: ${user.id})`);
                    
                    if (isMounted.current) {
                        setUsuario(user);
                        setNotAuthenticated(false);
                        
                        // Si el usuario acaba de loguearse, inicializar el chat
                        if (!chatInitialized) {
                            await initializeChatService();
                        }
                    }
                } else {
                    console.log('   └─ No hay usuario en AsyncStorage');
                    if (isMounted.current) {
                        setUsuario(null);
                        setNotAuthenticated(true);
                        setLoading(false); // Detener loading si no hay usuario
                    }
                }
            });
        } catch (error) {
            console.error('Error cargando datos del usuario:', error);
            if (isMounted.current) {
                setUsuario(null);
                setNotAuthenticated(true);
                setLoading(false);
            }
        }
    };

    const initializeChatService = async () => {
        console.log('🚀 Iniciando ChatService...');
        
        try {
            // Solo inicializar si hay un usuario logueado
            const userData = await AsyncStorage.getItem('usuario');
            console.log('👤 Usuario desde AsyncStorage:', userData ? 'Encontrado' : 'No encontrado');
            
            if (!userData) {
                console.log('❌ No hay usuario logueado');
                if (isMounted.current) {
                    setNotAuthenticated(true);
                    setLoading(false);
                }
                return;
            }

            console.log('✅ Iniciando ChatService.init()...');
            await ChatService.init();

            if (isMounted.current) {
                console.log('✅ ChatService inicializado exitosamente');
                setChatInitialized(true);
                setNotAuthenticated(false);
                // NO llamar loadConversations aquí - se llamará automáticamente
                // cuando chatInitialized cambie a true (ver useEffect más abajo)
            }

        } catch (error) {
            console.error('❌ Error inicializando ChatService:', error);
            
            // Si el error es por usuario no autenticado, mostrar pantalla amigable
            if (error.message?.includes('usuario') || error.message?.includes('user')) {
                if (isMounted.current) {
                    setNotAuthenticated(true);
                    setLoading(false);
                }
            } else {
                // Otro tipo de error, silencioso en desarrollo
                if (__DEV__) {
                    console.log('💬 Chat no disponible:', error.message);
                }
                if (isMounted.current) {
                    setLoading(false);
                }
            }
        }
    };

    // ============================================================
    // CARGAR CONVERSACIONES
    // ============================================================
    const loadConversations = async (isRefreshing = false) => {
        console.log('');
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║  📋 CARGANDO CONVERSACIONES                                   ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝');
        console.log('');
        console.log('📊 Estado actual:');
        console.log('   ├─ notAuthenticated:', notAuthenticated);
        console.log('   ├─ chatInitialized:', chatInitialized);
        console.log('   ├─ isRefreshing:', isRefreshing);
        console.log('   └─ usuario:', usuario ? `${usuario.nombre} (ID: ${usuario.id})` : 'null');
        console.log('');

        // No intentar cargar si el usuario no está autenticado
        if (notAuthenticated || !chatInitialized) {
            console.log('⚠️ No se puede cargar:');
            console.log('   ├─ notAuthenticated:', notAuthenticated);
            console.log('   └─ chatInitialized:', chatInitialized);
            console.log('');
            if (isMounted.current) {
                setLoading(false);
                setRefreshing(false);
            }
            return;
        }

        try {
            if (!isRefreshing) {
                setLoading(true);
            }

            console.log('🔍 Llamando a ChatService.getConversations()...');
            const convs = await ChatService.getConversations();
            console.log('');
            console.log('✅ RESPUESTA RECIBIDA:');
            console.log('   ├─ Cantidad de conversaciones:', convs.length);
            
            if (convs.length > 0) {
                console.log('   └─ Conversaciones:');
                convs.forEach((conv, index) => {
                    const messagePreview = typeof conv.lastMessageText === 'string' 
                        ? conv.lastMessageText.substring(0, 30) 
                        : 'N/A';
                    
                    console.log(`      ${index + 1}. ${conv.otherUserName || 'Sin nombre'} (ID: ${conv.otherUserId})`);
                    console.log(`         ├─ Último mensaje: ${messagePreview}...`);
                    console.log(`         ├─ No leídos: ${conv.unreadCount || 0}`);
                    console.log(`         └─ Fecha: ${conv.lastMessageTime || 'N/A'}`);
                });
            } else {
                console.log('   └─ No hay conversaciones');
            }
            console.log('');

            if (isMounted.current) {
                console.log('📝 Actualizando estado con', convs.length, 'conversaciones');
                
                // Eliminar duplicados por chatId (medida de seguridad)
                const uniqueConversations = convs.reduce((acc, current) => {
                    const exists = acc.find(conv => conv.chatId === current.chatId);
                    if (!exists) {
                        acc.push(current);
                    }
                    return acc;
                }, []);
                
                if (uniqueConversations.length !== convs.length) {
                    console.warn(`⚠️ Se eliminaron ${convs.length - uniqueConversations.length} conversaciones duplicadas`);
                }
                
                setConversations(uniqueConversations);
            }

        } catch (error) {
            console.log('');
            console.log('❌ ERROR CARGANDO CONVERSACIONES:');
            console.log('   ├─ Error:', error.message);
            console.log('   └─ Stack:', error.stack);
            console.log('');
            
            if (__DEV__) {
                console.log('💬 Error cargando conversaciones:', error.message);
            }
        } finally {
            if (isMounted.current) {
                console.log('🏁 Finalizando carga de conversaciones');
                console.log('');
                setLoading(false);
                setRefreshing(false);
            }
        }
    };

    // ============================================================
    // LISTENERS DE EVENTOS
    // ============================================================
    
    // Cargar conversaciones cuando el chat esté inicializado
    useEffect(() => {
        if (chatInitialized && !notAuthenticated) {
            console.log('🔄 Chat inicializado - cargando conversaciones...');
            loadConversations();
        }
    }, [chatInitialized]);

    useEffect(() => {
        if (!chatInitialized) return;

        // Mensaje nuevo (actualizar conversación)
        const handleNewMessage = () => {
            loadConversations();
        };

        // Mensajes leídos (actualizar contador)
        const handleMessagesRead = () => {
            loadConversations();
        };

        // Mensajes no leídos actualizados
        const handleUnreadUpdated = () => {
            loadConversations();
        };

        // Registrar listeners (SIN conversationsUpdated para evitar loop)
        ChatService.on('newMessage', handleNewMessage);
        ChatService.on('messagesRead', handleMessagesRead);
        ChatService.on('unreadMessagesUpdated', handleUnreadUpdated);

        // Cleanup
        return () => {
            ChatService.off('newMessage', handleNewMessage);
            ChatService.off('messagesRead', handleMessagesRead);
            ChatService.off('unreadMessagesUpdated', handleUnreadUpdated);
        };
    }, [chatInitialized]);

    // ============================================================
    // REFRESH
    // ============================================================
    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadConversations(true);

        // Sincronizar mensajes en background
        ChatService.syncUnreadMessages().catch(err => {
            console.error('Error sincronizando:', err);
        });
    }, []);

    // ============================================================
    // ABRIR CONVERSACIÓN
    // ============================================================
    const handleOpenConversation = (conversation) => {
        setSelectedUser({
            id: conversation.otherUserId,
            name: conversation.otherUserName,
            isProveedor: conversation.isProveedor
        });
        setChatModalVisible(true);
    };

    // ============================================================
    // ABRIR NUEVO CHAT
    // ============================================================
    const handleNewChat = () => {
        setContactsModalVisible(true);
    };

    // ============================================================
    // SELECCIONAR CONTACTO
    // ============================================================
    const handleSelectContact = (contact) => {
        setSelectedUser(contact);
        setChatModalVisible(true);
    };

    // ============================================================
    // CERRAR CHAT
    // ============================================================
    const handleCloseChat = () => {
        setChatModalVisible(false);
        
        // 🔥 FIX: Limpiar selectedUser DESPUÉS de que el modal termine de animarse (300ms)
        setTimeout(() => {
            setSelectedUser(null);
        }, 300);
        
        // Recargar conversaciones para actualizar último mensaje
        loadConversations();
    };

    // ============================================================
    // RENDERIZAR CONVERSACIÓN
    // ============================================================
    const renderConversation = ({ item }) => (
        <ConversationItem
            conversation={item}
            onPress={() => handleOpenConversation(item)}
        />
    );

    // ============================================================
    // RENDER
    // ============================================================
    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header */}
            <View style={styles.header}>
                <View style={{ flex: 1 }} />
                {usuario && (
                    <TouchableOpacity
                        style={styles.newChatButton}
                        onPress={handleNewChat}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="add" size={26} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Lista de conversaciones */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#fa7e17" />
                    <Text style={styles.loadingText}>Cargando conversaciones...</Text>
                </View>
            ) : notAuthenticated ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="lock-closed-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyTitle}>Inicia sesión</Text>
                    <Text style={styles.emptyText}>
                        Para usar el chat necesitas iniciar sesión
                    </Text>
                    <TouchableOpacity
                        style={styles.emptyButton}
                        onPress={() => onTabPress('profile')}
                    >
                        <Ionicons name="person" size={20} color="#fff" />
                        <Text style={styles.emptyButtonText}>Ir a Perfil</Text>
                    </TouchableOpacity>
                </View>
            ) : conversations.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="chatbubbles-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyTitle}>Sin conversaciones</Text>
                    <Text style={styles.emptyText}>
                        Empieza un nuevo chat con tus proveedores
                    </Text>
                    <TouchableOpacity
                        style={styles.emptyButton}
                        onPress={handleNewChat}
                    >
                        <Ionicons name="add-circle" size={20} color="#fff" />
                        <Text style={styles.emptyButtonText}>Nuevo Chat</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={conversations}
                    renderItem={renderConversation}
                    keyExtractor={(item, index) => {
                        // Generar key única basada en chatId
                        // chatId ya es único (formato: "userId1-userId2")
                        return item.chatId || `conv-${item.otherUserId || index}`;
                    }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={['#fa7e17']}
                            tintColor="#fa7e17"
                        />
                    }
                    contentContainerStyle={styles.listContent}
                />
            )}

            {/* Modal de conversación */}
            <ChatModal
                visible={chatModalVisible}
                otherUser={selectedUser}
                onClose={handleCloseChat}
            />

            {/* Modal de selección de contactos */}
            <ContactsListModal
                visible={contactsModalVisible}
                onClose={() => setContactsModalVisible(false)}
                onSelectContact={handleSelectContact}
            />

            {/* Navegación inferior */}
            <NavInf 
                selectedTab={selectedTab} 
                onTabPress={onTabPress}
                cartItemCount={cartItemCount}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },

    // ============================================================
    // HEADER
    // ============================================================
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingTop: Platform.OS === 'ios' ? 50 : 10,
        paddingBottom: 12,
        paddingHorizontal: 16,
        backgroundColor: '#f5f5f5',
    },
    newChatButton: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#fa7e17',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },

    // ============================================================
    // LISTA
    // ============================================================
    listContent: {
        paddingBottom: 80, // Espacio para el FAB
    },

    // ============================================================
    // ESTADOS
    // ============================================================
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#999',
        marginTop: 20,
    },
    emptyText: {
        fontSize: 15,
        color: '#bbb',
        marginTop: 8,
        textAlign: 'center',
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fa7e17',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
        marginTop: 24,
        gap: 8,
    },
    emptyButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },

    // ============================================================
    // FAB (Floating Action Button)
    // ============================================================
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#fa7e17', // Naranja Minymol
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
});

// ✅ OPTIMIZACIÓN: Memoizar componente para evitar re-renders innecesarios
export default memo(Chat, (prevProps, nextProps) => {
    // Solo re-renderizar si cambia isActive o selectedTab
    return prevProps.isActive === nextProps.isActive && 
           prevProps.selectedTab === nextProps.selectedTab &&
           prevProps.onTabPress === nextProps.onTabPress;
});
