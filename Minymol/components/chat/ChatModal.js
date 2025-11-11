/**
 * ChatModal - Modal deslizable desde la derecha para conversación individual
 * Se desliza de derecha a izquierda con animación suave
 * Minymol Minoristas
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Modal,
    Animated,
    ActivityIndicator,
    Keyboard,
    Dimensions,
    ImageBackground,
    Alert,
    LayoutAnimation,
    UIManager,
    StatusBar
} from 'react-native';

// Habilitar LayoutAnimation en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChatService from '../../services/chat/ChatService';
import ChatWebSocket from '../../services/chat/ChatWebSocket';
import MessageBubble from './MessageBubble';
import { getUserData } from '../../utils/apiUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
    background: '#e9ecef',
    header: '#fa7e17',
    headerGradientStart: '#ff8c42',
    headerGradientEnd: '#fa7e17',
    border: '#e5e7eb',
    primaryText: '#ffffff',
    secondaryText: 'rgba(255, 255, 255, 0.9)',
    primary: '#fa7e17',
    inputBg: '#ffffff',
    inputBorder: '#e5e7eb',
    inputText: '#1f2937',
    inputPlaceholder: '#9ca3af',
    sendButton: '#fa7e17',
    sendButtonDisabled: '#d1d5db',
    online: '#10b981',
    offline: '#94a3b8',
    overlay: 'rgba(0, 0, 0, 0.6)',
    emptyIcon: '#cbd5e1',
    loadingText: '#64748b',
};

const ChatModal = ({ visible, otherUser, onClose, initialMessage = '' }) => {
    const insets = useSafeAreaInsets();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isOnline, setIsOnline] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
    const flatListRef = useRef(null);
    const messageListenerRef = useRef(null);
    const messageSentListenerRef = useRef(null);
    const messageDeliveredListenerRef = useRef(null);
    const messageReadListenerRef = useRef(null);
    const messageFailedListenerRef = useRef(null);
    const userConnectedListenerRef = useRef(null);
    const userDisconnectedListenerRef = useRef(null);
    const onlineIntervalRef = useRef(null);

    // 💬 NUEVO: Establecer mensaje inicial cuando se abre el modal
    useEffect(() => {
        if (visible && initialMessage) {
            console.log('💬 Estableciendo mensaje inicial:', initialMessage);
            setInputText(initialMessage);
        } else if (!visible) {
            // Limpiar cuando se cierra
            setInputText('');
        }
    }, [visible, initialMessage]);

    // ============================================================
    // ANIMACIÓN DE ENTRADA/SALIDA
    // ============================================================
    useEffect(() => {
        // 🔥 FIX: Verificar que otherUser tenga datos válidos ANTES de continuar
        if (visible && otherUser?.id) {
            // Animar entrada desde la derecha
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 11,
            }).start();

            initializeChat();

            // Escuchar eventos del teclado
            const keyboardWillShow = Keyboard.addListener(
                Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
                (e) => {
                    const height = e.endCoordinates.height;
                    
                    if (Platform.OS === 'android') {
                        // En Android, animar el cambio de altura
                        Animated.timing(slideAnim, {
                            toValue: 0,
                            duration: 250,
                            useNativeDriver: true,
                        }).start();
                    }
                    
                    setKeyboardHeight(height);
                    
                    // Scroll al final
                    setTimeout(() => {
                        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                    }, 100);
                }
            );
            
            const keyboardWillHide = Keyboard.addListener(
                Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
                () => {
                    setKeyboardHeight(0);
                }
            );

            // 🔥 FIX: Limpiar listeners anteriores ANTES de agregar nuevos
            if (messageListenerRef.current) {
                ChatWebSocket.off('newMessage', messageListenerRef.current);
            }
            if (messageSentListenerRef.current) {
                ChatWebSocket.off('messageSent', messageSentListenerRef.current);
            }
            if (messageDeliveredListenerRef.current) {
                ChatWebSocket.off('messageDelivered', messageDeliveredListenerRef.current);
            }
            if (messageReadListenerRef.current) {
                ChatWebSocket.off('messageRead', messageReadListenerRef.current);
            }
            if (messageFailedListenerRef.current) {
                ChatWebSocket.off('messageFailed', messageFailedListenerRef.current);
            }
            if (userConnectedListenerRef.current) {
                ChatWebSocket.off('userConnected', userConnectedListenerRef.current);
            }
            if (userDisconnectedListenerRef.current) {
                ChatWebSocket.off('userDisconnected', userDisconnectedListenerRef.current);
            }

            // Escuchar mensajes nuevos en tiempo real
            messageListenerRef.current = handleNewMessage;
            ChatWebSocket.on('newMessage', messageListenerRef.current);

            // Escuchar confirmación de envío (quita el reloj ⏳)
            messageSentListenerRef.current = handleMessageSent;
            ChatWebSocket.on('messageSent', messageSentListenerRef.current);

            // Escuchar cuando mensajes son entregados (✓✓)
            messageDeliveredListenerRef.current = handleMessageDelivered;
            ChatWebSocket.on('messageDelivered', messageDeliveredListenerRef.current);

            // Escuchar cuando mensajes son leídos (✓✓ azul)
            messageReadListenerRef.current = handleMessageRead;
            ChatWebSocket.on('messageRead', messageReadListenerRef.current);

            // Escuchar errores al enviar mensajes
            messageFailedListenerRef.current = handleMessageFailed;
            ChatWebSocket.on('messageFailed', messageFailedListenerRef.current);

            // Verificar estado online
            checkOnlineStatus();
            const onlineInterval = setInterval(checkOnlineStatus, 30000);
            onlineIntervalRef.current = onlineInterval;

            // Escuchar eventos de conexión/desconexión en tiempo real
            const handleUserConnected = (data) => {
                console.log('🟢 Evento userConnected recibido:', data);
                if (data?.userId === otherUser?.id) {
                    console.log('✅ El usuario', otherUser.name, 'se conectó');
                    setIsOnline(true);
                }
            };

            const handleUserDisconnected = (data) => {
                console.log('🔴 Evento userDisconnected recibido:', data);
                if (data?.userId === otherUser?.id) {
                    console.log('❌ El usuario', otherUser.name, 'se desconectó');
                    setIsOnline(false);
                }
            };

            userConnectedListenerRef.current = handleUserConnected;
            userDisconnectedListenerRef.current = handleUserDisconnected;

            ChatWebSocket.on('userConnected', userConnectedListenerRef.current);
            ChatWebSocket.on('userDisconnected', userDisconnectedListenerRef.current);

            return () => {
                console.log('🧹 Limpiando listeners del ChatModal...');
                
                keyboardWillShow.remove();
                keyboardWillHide.remove();
                
                if (messageListenerRef.current) {
                    ChatWebSocket.off('newMessage', messageListenerRef.current);
                    messageListenerRef.current = null;
                }
                if (messageSentListenerRef.current) {
                    ChatWebSocket.off('messageSent', messageSentListenerRef.current);
                    messageSentListenerRef.current = null;
                }
                if (messageDeliveredListenerRef.current) {
                    ChatWebSocket.off('messageDelivered', messageDeliveredListenerRef.current);
                    messageDeliveredListenerRef.current = null;
                }
                if (messageReadListenerRef.current) {
                    ChatWebSocket.off('messageRead', messageReadListenerRef.current);
                    messageReadListenerRef.current = null;
                }
                if (messageFailedListenerRef.current) {
                    ChatWebSocket.off('messageFailed', messageFailedListenerRef.current);
                    messageFailedListenerRef.current = null;
                }
                if (userConnectedListenerRef.current) {
                    ChatWebSocket.off('userConnected', userConnectedListenerRef.current);
                    userConnectedListenerRef.current = null;
                }
                if (userDisconnectedListenerRef.current) {
                    ChatWebSocket.off('userDisconnected', userDisconnectedListenerRef.current);
                    userDisconnectedListenerRef.current = null;
                }
                // 🔥 FIX: Limpiar interval cuando el modal se cierra
                if (onlineIntervalRef.current) {
                    clearInterval(onlineIntervalRef.current);
                    onlineIntervalRef.current = null;
                }
                
                console.log('✅ Listeners limpiados correctamente');
            };
        } else if (!visible) {
            // 🔥 FIX: Limpiar interval cuando el modal se oculta
            if (onlineIntervalRef.current) {
                clearInterval(onlineIntervalRef.current);
                onlineIntervalRef.current = null;
            }
            
            // Animar salida hacia la derecha
            Animated.timing(slideAnim, {
                toValue: SCREEN_WIDTH,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, otherUser?.id]);

    // ============================================================
    // HELPER: ELIMINAR MENSAJES DUPLICADOS
    // ============================================================
    const removeDuplicates = (messageArray) => {
        const seen = new Set();
        const unique = [];
        
        for (const msg of messageArray) {
            const key = msg.id || msg.tempId;
            if (key && !seen.has(key)) {
                seen.add(key);
                unique.push(msg);
            }
        }
        
        if (unique.length !== messageArray.length) {
            console.log(`🧹 Eliminados ${messageArray.length - unique.length} mensajes duplicados`);
        }
        
        return unique;
    };

    // ============================================================
    // CARGAR DATOS INICIALES + SINCRONIZACIÓN
    // ============================================================
    const initializeChat = async () => {
        // 🔥 FIX: Validar que otherUser tenga datos antes de continuar
        if (!otherUser?.id) {
            console.error('❌ No se puede inicializar chat: otherUser es inválido', otherUser);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            // 1. Obtener ID del usuario actual
            const userData = await getUserData();
            setCurrentUserId(userData?.id);

            // 2. Cargar mensajes locales inmediatamente (UX rápida)
            if (otherUser?.id) {
                const localMessages = await ChatService.getMessages(otherUser.id, 50, 0);
                
                // 🔥 Limpiar duplicados al cargar
                const uniqueMessages = removeDuplicates(localMessages);
                setMessages(uniqueMessages);
                setLoading(false);

                // 3. Sincronizar con servidor en background
                setIsSyncing(true);
                const newMessagesCount = await ChatService.syncMessages(otherUser.id);
                setIsSyncing(false);

                // 4. Si hay mensajes nuevos, recargar
                if (newMessagesCount > 0) {
                    const updatedMessages = await ChatService.getMessages(otherUser.id, 50, 0);
                    const uniqueUpdatedMessages = removeDuplicates(updatedMessages);
                    setMessages(uniqueUpdatedMessages);
                }

                // 5. Marcar como leídos (REST API)
                await ChatService.markAsRead(otherUser.id);

                // 6. Notificar via WebSocket que abrimos el chat (marcar como entregado/leído)
                if (userData?.id) {
                    // Marcar como entregado primero
                    ChatWebSocket.markAsDelivered(otherUser.id, userData.id);
                    
                    // Luego marcar como leído
                    ChatWebSocket.markAsRead(otherUser.id, userData.id);
                }
            }

        } catch (error) {
            console.error('❌ Error inicializando chat:', error);
            setLoading(false);
            setIsSyncing(false);
            Alert.alert('Error', 'No se pudo cargar el chat');
        }
    };

    // ============================================================
    // VERIFICAR ESTADO ONLINE
    // ============================================================
    const checkOnlineStatus = useCallback(async () => {
        // 🔥 FIX: No ejecutar si el modal no está visible o no hay otherUser
        if (!visible || !otherUser?.id) {
            return;
        }

        try {
            console.log('🔍 Verificando si usuario', otherUser.id, '(' + otherUser.name + ') está online...');
            const online = await ChatService.isUserOnline(otherUser.id);
            console.log('📊 Resultado:', online ? '✅ ONLINE' : '❌ OFFLINE');
            setIsOnline(online);
        } catch (error) {
            console.error('❌ Error verificando estado online:', error);
            setIsOnline(false);
        }
    }, [visible, otherUser?.id, otherUser?.name]);

    // ============================================================
    // LISTENERS DE EVENTOS WEBSOCKET
    // ============================================================
    const handleNewMessage = async (newMessage) => {
        // Solo procesar si es de este chat
        if (newMessage.senderId === otherUser.id || newMessage.receiverId === otherUser.id) {
            
            // 🔥 FIX: NO agregar mensajes que YO envié (ya están con optimistic update)
            // Solo agregar mensajes que RECIBO (de otherUser)
            if (newMessage.senderId === otherUser.id) {
                // Verificar que no exista ya (evitar duplicados)
                setMessages(prev => {
                    const exists = prev.some(msg => 
                        (msg.id && msg.id === newMessage.id) ||
                        (msg.tempId && msg.tempId === newMessage.tempId)
                    );
                    
                    if (exists) {
                        console.log('⚠️ Mensaje ya existe en la lista, no se agrega');
                        return prev;
                    }
                    
                    return [newMessage, ...prev];
                });

                // Marcar en BD local
                await ChatService.markAsRead(otherUser.id);
                
                // Notificar via WebSocket
                if (currentUserId) {
                    ChatWebSocket.markAsDelivered(otherUser.id, currentUserId);
                    ChatWebSocket.markAsRead(otherUser.id, currentUserId);
                }
            }
            // Si el mensaje es MÍO (receiverId === otherUser.id), ignorarlo
            // porque ya lo agregué en handleSend con optimistic update
        }
    };

    const handleMessageSent = async (payload) => {
        console.log('');
        console.log('🔄 PROCESANDO CONFIRMACIÓN');
        console.log('   ├─ Temp ID:', payload.tempId);
        console.log('   ├─ ID Real:', payload.message?.id);
        console.log('   └─ Actualizando mensaje...');

        // Actualizar mensaje en el state (UI)
        setMessages(prev => {
            const updated = [...prev];
            let foundIndex = -1;
            let foundTempId = null;
            
            // Buscar el mensaje por tempId
            for (let index = 0; index < updated.length; index++) {
                const msg = updated[index];
                
                // Buscar por tempId exacto
                if (payload.tempId && msg.tempId === payload.tempId) {
                    foundIndex = index;
                    foundTempId = msg.tempId;
                    break;
                }
            }
            
            if (foundIndex !== -1) {
                // Reemplazar el mensaje temporal con el confirmado
                updated[foundIndex] = {
                    ...payload.message,
                    isSentByMe: true,
                    tempId: undefined, // ❌ Quitar tempId para que use ID real
                };
                console.log('   └─ ✅ Mensaje actualizado en posición', foundIndex);
                
                // Actualizar en SQLite también
                if (foundTempId && payload.message?.id) {
                    ChatService.updateMessageInDB(foundTempId, payload.message.id)
                        .then(() => console.log('   └─ ✅ SQLite actualizado'))
                        .catch(error => console.error('❌ Error actualizando mensaje en SQLite:', error));
                }
            } else {
                console.log('   └─ ⚠️ Mensaje no encontrado por tempId:', payload.tempId);
            }
            
            return updated;
        });
        
        // 🔥 LIMPIEZA: Eliminar duplicados después de actualizar
        setTimeout(() => {
            setMessages(prev => {
                const seen = new Set();
                const unique = [];
                
                for (const msg of prev) {
                    // Crear clave única: preferir ID real, luego tempId
                    const key = (msg.id && !msg.id.startsWith('temp_')) ? msg.id : msg.tempId || msg.id;
                    
                    if (key && !seen.has(key)) {
                        seen.add(key);
                        unique.push(msg);
                    }
                }
                
                if (unique.length !== prev.length) {
                    console.log(`   └─ 🧹 Eliminados ${prev.length - unique.length} duplicados`);
                }
                
                return unique;
            });
        }, 100);
        
        console.log('');
    };

    const handleMessageDelivered = async (update) => {
        // Solo actualizar si soy el remitente (el otro usuario recibió mis mensajes)
        if (update.receiverId === otherUser.id) {
            const messagesToUpdate = [];

            setMessages(prev => prev.map(msg => {
                if (msg.isSentByMe && msg.receiverId === otherUser.id && !msg.isDelivered) {
                    if (msg.id && !msg.tempId) {
                        messagesToUpdate.push(msg.id);
                    }
                    return { ...msg, isDelivered: true };
                }
                return msg;
            }));

            // Actualizar en SQLite
            for (const messageId of messagesToUpdate) {
                try {
                    await ChatService.updateMessageStatus(messageId, true, false);
                } catch (error) {
                    console.error('❌ Error actualizando estado delivered en SQLite:', error);
                }
            }
        }
    };

    const handleMessageRead = async (update) => {
        // Solo actualizar si soy el remitente (el otro usuario leyó mis mensajes)
        if (update.receiverId === otherUser.id) {
            const messagesToUpdate = [];

            setMessages(prev => prev.map(msg => {
                if (msg.isSentByMe && msg.receiverId === otherUser.id && !msg.isRead) {
                    if (msg.id && !msg.tempId) {
                        messagesToUpdate.push(msg.id);
                    }
                    return { ...msg, isDelivered: true, isRead: true };
                }
                return msg;
            }));

            // Actualizar en SQLite
            for (const messageId of messagesToUpdate) {
                try {
                    await ChatService.updateMessageStatus(messageId, true, true);
                } catch (error) {
                    console.error('❌ Error actualizando estado read en SQLite:', error);
                }
            }
        }
    };

    const handleMessageFailed = (payload) => {
        console.log('');
        console.log('❌ MANEJANDO MENSAJE FALLIDO:');
        console.log('   ├─ Temp ID:', payload.tempId);
        console.log('   └─ Error:', payload.error);
        console.log('');
        
        if (payload.tempId) {
            // Marcar el mensaje como fallido en UI
            setMessages(prev => prev.map(msg => {
                if (msg.tempId === payload.tempId || msg.id === payload.tempId) {
                    console.log('   └─ ✅ Mensaje marcado como fallido en UI');
                    return { 
                        ...msg, 
                        failed: true,
                        status: 'failed'
                    };
                }
                return msg;
            }));

            // Mostrar alerta al usuario
            Alert.alert(
                'Error al enviar', 
                payload.error || 'No se pudo enviar el mensaje. Verifica tu conexión.',
                [
                    {
                        text: 'OK',
                        style: 'cancel'
                    }
                ]
            );
        }
    };

    // ============================================================
    // ENVIAR MENSAJE
    // ============================================================
    const handleSend = useCallback(async () => {
        const text = inputText.trim();

        if (!text || sending || !otherUser?.id) return;

        try {
            setSending(true);

            // Limpiar input inmediatamente (UX rápida)
            setInputText('');

            // Enviar mensaje (ya se guarda en SQLite dentro de ChatService)
            const newMessage = await ChatService.sendMessage(otherUser.id, text);

            // ✅ Agregar SOLO si no existe ya (evitar duplicados)
            setMessages(prev => {
                // Verificar si ya existe un mensaje con este tempId o id
                const exists = prev.some(msg => 
                    (msg.tempId && msg.tempId === newMessage.tempId) ||
                    (msg.id && msg.id === newMessage.id)
                );
                
                if (exists) {
                    console.log('⚠️ Mensaje ya existe en la lista, no se agrega');
                    return prev;
                }
                
                // Agregar al inicio (lista invertida)
                return [newMessage, ...prev];
            });

        } catch (error) {
            console.error('❌ Error enviando mensaje:', error);
            
            // Mensajes de error personalizados
            let errorMessage = 'No se pudo enviar el mensaje';
            
            if (error.message?.includes('permiso para chatear')) {
                errorMessage = 'Este comerciante debe iniciar la conversación primero. Espera a que te escriba.';
            } else if (error.message?.includes('403')) {
                errorMessage = 'No tienes permiso para chatear con este usuario';
            }
            
            Alert.alert('Error', errorMessage);

            // Restaurar el texto si falló
            setInputText(text);
        } finally {
            setSending(false);
        }
    }, [inputText, sending, otherUser?.id]);

    // ============================================================
    // CARGAR MÁS MENSAJES (PAGINACIÓN)
    // ============================================================
    const handleLoadMore = useCallback(async () => {
        if (loading || !hasMore || !otherUser?.id) return;

        try {
            const nextPage = page + 1;
            const olderMessages = await ChatService.getMessages(otherUser.id, 50, nextPage);

            if (olderMessages.length > 0) {
                setMessages(prev => {
                    const combined = [...prev, ...olderMessages];
                    return removeDuplicates(combined);
                });
                setPage(nextPage);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error('❌ Error cargando más mensajes:', error);
        }
    }, [loading, hasMore, page, otherUser?.id]);

    // ============================================================
    // RENDERIZAR MENSAJE
    // ============================================================
    const renderMessage = ({ item, index }) => {
        return (
            <MessageBubble
                message={item}
                previousMessage={index > 0 ? messages[index - 1] : null}
                currentUserId={currentUserId}
            />
        );
    };

    // ============================================================
    // RENDERIZAR FOOTER (CARGA MÁS MENSAJES)
    // ============================================================
    const renderFooter = () => {
        if (!hasMore || loading) return null;

        return (
            <View style={styles.loadingFooter}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingFooterText}>Cargando más mensajes...</Text>
            </View>
        );
    };

    // ============================================================
    // RENDERIZAR ESTADO VACÍO
    // ============================================================
    const renderEmptyState = () => {
        if (loading) return null;

        return (
            <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                    <Ionicons name="chatbubbles" size={50} color={COLORS.emptyIcon} />
                </View>
                <Text style={styles.emptyStateText}>
                    No hay mensajes aún
                </Text>
                <Text style={styles.emptyStateSubtext}>
                    Envía un mensaje para iniciar la conversación con {otherUser?.name}
                </Text>
            </View>
        );
    };

    // ============================================================
    // CERRAR MODAL
    // ============================================================
    const handleClose = () => {        
        // Animar salida
        Animated.timing(slideAnim, {
            toValue: SCREEN_WIDTH,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };

    // ============================================================
    // RENDER
    // ============================================================
    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
            statusBarTranslucent
            presentationStyle="overFullScreen"
        >
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <View style={styles.modalContainer}>
                {/* Overlay semitransparente */}
                <TouchableOpacity 
                    style={styles.overlay} 
                    activeOpacity={1}
                    onPress={handleClose}
                />

                {/* Contenedor animado desde la derecha */}
                <Animated.View 
                    style={[
                        styles.chatContainer,
                        { 
                            transform: [{ translateX: slideAnim }],
                            paddingTop: insets.top,
                        }
                    ]}
                >
                    <KeyboardAvoidingView
                        style={styles.flex1}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                    >
                        <View style={styles.flex1}>
                        {/* Header */}
                        <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={handleClose}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="arrow-back" size={24} color={COLORS.primaryText} />
                        </TouchableOpacity>

                        <View style={styles.headerInfo}>
                            <Text style={styles.headerTitle} numberOfLines={1}>
                                {otherUser?.name || 'Chat'}
                            </Text>
                            <View style={styles.statusContainer}>
                                <View style={[
                                    styles.statusDot,
                                    { backgroundColor: isOnline ? COLORS.online : COLORS.offline }
                                ]} />
                                <Text style={styles.statusText}>
                                    {isOnline ? 'En línea' : 'Desconectado'}
                                </Text>
                            </View>
                        </View>

                        {isSyncing && (
                            <ActivityIndicator size="small" color="#ffffff" />
                        )}
                    </View>

                    {/* Lista de mensajes con fondo */}
                    <View style={[
                        styles.flex1,
                        Platform.OS === 'android' && keyboardHeight > 0 && {
                            paddingBottom: 68, // Altura del input
                        }
                    ]}>
                    <ImageBackground 
                        source={require('../../assets/background.jpg')}
                        resizeMode="cover"
                        style={styles.messagesBackground}
                    >
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={COLORS.primary} />
                                <Text style={styles.loadingText}>Cargando mensajes...</Text>
                            </View>
                        ) : messages.length === 0 ? (
                            renderEmptyState()
                        ) : (
                            <FlatList
                                ref={flatListRef}
                                data={messages}
                                keyExtractor={(item, index) => {
                                    // Prioridad: ID real > tempId > fallback único
                                    // 1. Si tiene ID real Y NO empieza con 'temp_', usar ID real
                                    if (item.id && !item.id.startsWith('temp_')) {
                                        return `msg-${item.id}`;
                                    }
                                    // 2. Si tiene tempId (mensaje pendiente), usarlo
                                    if (item.tempId) {
                                        return `temp-${item.tempId}`;
                                    }
                                    // 3. Si solo tiene ID temporal (formato 'temp_xxx')
                                    if (item.id) {
                                        return `temp-${item.id}`;
                                    }
                                    // 4. Fallback: combinación única
                                    return `msg-${index}-${item.createdAt || Date.now()}`;
                                }}
                                renderItem={renderMessage}
                                inverted
                                onEndReached={handleLoadMore}
                                onEndReachedThreshold={0.1}
                                ListFooterComponent={renderFooter}
                                contentContainerStyle={styles.messagesList}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                keyboardDismissMode="interactive"
                                initialNumToRender={20}
                                maxToRenderPerBatch={10}
                                windowSize={10}
                            />
                        )}
                    </ImageBackground>
                    </View>

                    {/* Input de mensaje */}
                    <View style={[
                        styles.inputContainer,
                        Platform.OS === 'android' && keyboardHeight > 0 && {
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                        }
                    ]}>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.textInput}
                                value={inputText}
                                onChangeText={setInputText}
                                placeholder="Escribe un mensaje..."
                                placeholderTextColor={COLORS.inputPlaceholder}
                                multiline
                                maxLength={1000}
                                editable={!sending}
                                textAlignVertical="center"
                                returnKeyType="default"
                                blurOnSubmit={false}
                            />

                            <TouchableOpacity
                                style={[
                                    styles.sendButton,
                                    (!inputText.trim() || sending) && styles.sendButtonDisabled
                                ]}
                                onPress={handleSend}
                                disabled={!inputText.trim() || sending}
                                activeOpacity={0.8}
                            >
                                {sending ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <Ionicons 
                                        name="send" 
                                        size={22} 
                                        color="#ffffff" 
                                        style={{ marginLeft: 2 }}
                                    />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Safe Area inferior - solo en iOS o cuando no hay teclado */}
                    {Platform.OS === 'ios' && keyboardHeight === 0 && insets.bottom > 0 && (
                        <View style={[styles.safeAreaBottom, { height: insets.bottom }]} />
                    )}
                    </View>
                    </KeyboardAvoidingView>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        flexDirection: 'row',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.overlay,
    },
    chatContainer: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: SCREEN_WIDTH,
        backgroundColor: COLORS.background,
        shadowColor: '#000',
        shadowOffset: { width: -2, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    flex1: {
        flex: 1,
    },

    // ============================================================
    // HEADER
    // ============================================================
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.header,
        paddingHorizontal: 16,
        paddingVertical: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    headerInfo: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 19,
        fontWeight: '700',
        color: COLORS.primaryText,
        marginBottom: 3,
        letterSpacing: 0.3,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 9,
        height: 9,
        borderRadius: 5,
        marginRight: 6,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    statusText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.secondaryText,
        letterSpacing: 0.2,
    },

    // ============================================================
    // MENSAJES
    // ============================================================
    messagesBackground: {
        flex: 1,
    },
    messagesList: {
        paddingVertical: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: COLORS.loadingText,
    },
    loadingFooter: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
    },
    loadingFooterText: {
        marginLeft: 8,
        fontSize: 14,
        color: COLORS.loadingText,
    },

    // ============================================================
    // ESTADO VACÍO
    // ============================================================
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 48,
        paddingBottom: 60,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1f2937',
        marginTop: 20,
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    emptyStateSubtext: {
        fontSize: 15,
        color: '#6b7280',
        marginTop: 10,
        textAlign: 'center',
        lineHeight: 22,
    },

    // ============================================================
    // INPUT
    // ============================================================
    inputContainer: {
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingHorizontal: 12,
        paddingVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 5,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
    },
    textInput: {
        flex: 1,
        backgroundColor: COLORS.inputBg,
        borderWidth: 1.5,
        borderColor: COLORS.inputBorder,
        borderRadius: 24,
        paddingHorizontal: 18,
        paddingVertical: 12,
        paddingTop: 12,
        maxHeight: 120,
        fontSize: 16,
        color: COLORS.inputText,
        lineHeight: 20,
    },
    sendButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.sendButton,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.sendButton,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    sendButtonDisabled: {
        backgroundColor: COLORS.sendButtonDisabled,
        shadowOpacity: 0,
        elevation: 0,
    },
    safeAreaBottom: {
        backgroundColor: '#ffffff',
    },
});

export default ChatModal;
