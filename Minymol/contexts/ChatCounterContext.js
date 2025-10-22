/**
 * ChatCounterContext - Contexto para el contador de mensajes no leídos
 * Similar a CartCounterContext, ultra optimizado
 * Minymol Minoristas
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import ChatService from '../services/chat/ChatService';

const ChatCounterContext = createContext();

export const useChatCounter = () => {
    const context = useContext(ChatCounterContext);
    if (!context) {
        throw new Error('useChatCounter debe usarse dentro de ChatCounterProvider');
    }
    return context;
};

export const ChatCounterProvider = ({ children }) => {
    const [count, setCount] = useState(0);
    const isMounted = useRef(false);
    const updateTimer = useRef(null);

    // ============================================================
    // ACTUALIZAR CONTADOR (con throttle para evitar renders excesivos)
    // ============================================================
    const updateCount = useCallback(async () => {
        if (!isMounted.current) return;

        try {
            const unreadCount = await ChatService.getUnreadCount();
            
            if (isMounted.current) {
                setCount(unreadCount);
            }
        } catch (error) {
            // Silencioso: Es normal que falle si ChatService aún no está inicializado
            // Solo loguear en desarrollo para debug
            if (__DEV__) {
                console.log('💬 Chat aún no inicializado, contador en 0');
            }
        }
    }, []);

    // ============================================================
    // ACTUALIZACIÓN CON THROTTLE (máximo cada 500ms)
    // ============================================================
    const throttledUpdate = useCallback(() => {
        if (updateTimer.current) {
            clearTimeout(updateTimer.current);
        }

        updateTimer.current = setTimeout(() => {
            updateCount();
        }, 500);
    }, [updateCount]);

    // ============================================================
    // INICIALIZACIÓN Y LISTENERS
    // ============================================================
    useEffect(() => {
        isMounted.current = true;

        // Esperar a que ChatService esté inicializado
        const initCounter = async () => {
            // Esperar 2 segundos para dar tiempo a que Chat page inicialice ChatService
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            if (isMounted.current) {
                updateCount();
            }
        };

        initCounter();

        // Listeners de eventos del chat
        const handleNewMessage = () => {
            throttledUpdate();
        };

        const handleMessagesRead = () => {
            throttledUpdate();
        };

        const handleUnreadUpdated = () => {
            throttledUpdate();
        };

        ChatService.on('newMessage', handleNewMessage);
        ChatService.on('messagesRead', handleMessagesRead);
        ChatService.on('unreadMessagesUpdated', handleUnreadUpdated);

        // Actualización periódica cada 30 segundos (backup)
        const interval = setInterval(() => {
            if (isMounted.current) {
                updateCount();
            }
        }, 30000);

        // Cleanup
        return () => {
            isMounted.current = false;
            
            if (updateTimer.current) {
                clearTimeout(updateTimer.current);
            }
            
            clearInterval(interval);
            
            ChatService.off('newMessage', handleNewMessage);
            ChatService.off('messagesRead', handleMessagesRead);
            ChatService.off('unreadMessagesUpdated', handleUnreadUpdated);
        };
    }, [updateCount, throttledUpdate]);

    // ============================================================
    // FORZAR ACTUALIZACIÓN (útil para cuando se marca como leído)
    // ============================================================
    const forceUpdate = useCallback(() => {
        updateCount();
    }, [updateCount]);

    const value = {
        count,
        forceUpdate
    };

    return (
        <ChatCounterContext.Provider value={value}>
            {children}
        </ChatCounterContext.Provider>
    );
};
