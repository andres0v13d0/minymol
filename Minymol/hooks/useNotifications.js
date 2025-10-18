import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import messaging from '@react-native-firebase/messaging';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { apiCall, getUserData } from '../utils/apiUtils';

// Configuración del comportamiento de las notificaciones
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export const useNotifications = () => {
    const [fcmToken, setFcmToken] = useState('');
    const [notification, setNotification] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);

    // Verificar si está en Expo Go
    const isExpoGo = Constants.appOwnership === 'expo';

    useEffect(() => {
        // Inicializar notificaciones automáticamente
        initializeNotifications();

        // Solo agregar listeners si NO está en Expo Go
        if (isExpoGo) {
            console.log('⚠️ Expo Go detectado - Listeners de notificaciones deshabilitados');
            return;
        }

        // Listener para notificaciones recibidas (Expo Notifications para mostrar localmente)
        const notificationListener = Notifications.addNotificationReceivedListener?.(notification => {
            setNotification(notification);
        });

        // Listener para cuando el usuario toca la notificación
        const responseListener = Notifications.addNotificationResponseReceivedListener?.(response => {
            console.log('Notificación tocada:', response);
            // Aquí puedes manejar la navegación según el contenido de la notificación
        });

        // Listeners de Firebase para mensajes en background y foreground
        const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
            console.log('Mensaje FCM recibido en foreground:', remoteMessage);
            
            // Mostrar notificación local usando Expo Notifications
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: remoteMessage.notification?.title || 'Notificación',
                    body: remoteMessage.notification?.body || 'Tienes un nuevo mensaje',
                    data: remoteMessage.data || {},
                },
                trigger: null, // Mostrar inmediatamente
            });
        });

        // Listener para cuando la app se abre desde una notificación
        messaging().onNotificationOpenedApp(remoteMessage => {
            console.log('Notificación abrió la app desde background:', remoteMessage);
            // Manejar navegación aquí
        });

        // Verificar si la app se abrió desde una notificación cuando estaba cerrada
        messaging()
            .getInitialNotification()
            .then(remoteMessage => {
                if (remoteMessage) {
                    console.log('Notificación abrió la app desde estado cerrado:', remoteMessage);
                    // Manejar navegación aquí
                }
            });

        return () => {
            // Remover listeners de Expo Notifications
            if (notificationListener && typeof Notifications.removeNotificationSubscription === 'function') {
                Notifications.removeNotificationSubscription(notificationListener);
            }
            if (responseListener && typeof Notifications.removeNotificationSubscription === 'function') {
                Notifications.removeNotificationSubscription(responseListener);
            }
            
            // Remover listeners de Firebase
            if (unsubscribeOnMessage) {
                unsubscribeOnMessage();
            }
        };
    }, [isExpoGo]);

    const checkNotificationStatus = async () => {
        try {
            const enabled = await AsyncStorage.getItem('notificaciones-activadas');
            // Por defecto están activadas, solo se desactivan si explícitamente se guardó 'false'
            setNotificationsEnabled(enabled !== 'false');
        } catch (error) {
            console.error('Error verificando estado de notificaciones:', error);
        }
    };

    const initializeNotifications = async () => {
        try {
            // Verificar el estado actual
            const disabled = await AsyncStorage.getItem('notificaciones-activadas');
            
            // Si NO están explícitamente desactivadas, activarlas automáticamente
            if (disabled !== 'false') {
                console.log('🔔 Inicializando notificaciones automáticamente...');
                const result = await enableNotifications(true); // isAutoInit = true
                if (result.success) {
                    console.log('✅ Notificaciones inicializadas correctamente');
                } else if (!isExpoGo) {
                    console.warn('⚠️ No se pudieron inicializar las notificaciones:', result.message);
                }
            } else {
                // Solo verificar el estado si están explícitamente desactivadas
                await checkNotificationStatus();
            }
        } catch (error) {
            console.error('Error inicializando notificaciones:', error);
            // En caso de error, solo verificar el estado
            await checkNotificationStatus();
        }
    };

    const registerForPushNotificationsAsync = async (isAutoInit = false) => {
        let token;

        // Verificar si está corriendo en Expo Go
        const isExpoGo = Constants.appOwnership === 'expo';
        if (isExpoGo) {
            const message = '⚠️ Las notificaciones push no están disponibles en Expo Go.\n\n' +
                'Para usar notificaciones push, necesitas crear un Development Build o APK con EAS Build.\n\n' +
                'Ejecuta: eas build -p android --profile preview';
            
            if (isAutoInit) {
                console.warn(message);
                return null; // No lanzar error en inicialización automática
            } else {
                throw new Error(message);
            }
        }

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#fa7e17',
            });
        }

        if (Device.isDevice) {
            // Solicitar permisos para notificaciones
            const authStatus = await messaging().requestPermission();
            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            if (!enabled) {
                throw new Error('No se otorgaron permisos para notificaciones push');
            }

            // Obtener el token FCM de Firebase
            // Primero eliminar cualquier token existente para forzar uno nuevo
            try {
                await messaging().deleteToken();
            } catch (error) {
                // Ignorar error si no había token anterior
            }
            
            token = await messaging().getToken();
            console.log('Token FCM:', token);

            if (!token) {
                throw new Error('No se pudo obtener el token FCM');
            }
        } else {
            console.warn('Las notificaciones push solo funcionan en dispositivos físicos');
            throw new Error('Debe usar un dispositivo físico para las notificaciones push');
        }

        return token;
    };

    const enableNotifications = async (isAutoInit = false) => {
        try {
            const token = await registerForPushNotificationsAsync(isAutoInit);
            if (!token && isAutoInit) {
                // En Expo Go durante inicialización automática, simplemente retornamos
                return { success: false, message: 'Notificaciones no disponibles en Expo Go' };
            }
            setFcmToken(token);

            // Guardar el token en el backend
            const userData = await getUserData();
            if (userData) {
                try {
                    const response = await apiCall(
                        'https://api.minymol.com/push/register-token',
                        {
                            method: 'POST',
                            body: JSON.stringify({
                                fcmToken: token,
                                userId: userData.id || userData.proveedorInfo?.id,
                                userType: userData.rol
                            })
                        }
                    );

                    if (!response.ok) {
                        throw new Error(`Error ${response.status}: ${response.statusText}`);
                    }

                    // Marcar como activadas (o remover la clave de desactivación)
                    await AsyncStorage.removeItem('notificaciones-activadas'); // Por defecto están activadas
                    await AsyncStorage.setItem('push-token', token);
                    setNotificationsEnabled(true);

                    return { success: true, message: '✅ Notificaciones activadas correctamente' };
                } catch (apiError) {
                    console.error('Error registrando token en el backend:', apiError);
                    throw new Error(`Error al registrar token: ${apiError.message}`);
                }
            } else {
                throw new Error('Usuario no autenticado');
            }
        } catch (error) {
            console.error('Error activando notificaciones:', error);
            return {
                success: false,
                message: error.message || '❌ Error al activar notificaciones'
            };
        }
    };

    const disableNotifications = async () => {
        try {
            // Marcar como desactivadas explícitamente
            await AsyncStorage.setItem('notificaciones-activadas', 'false');
            await AsyncStorage.removeItem('push-token');
            setNotificationsEnabled(false);

            // Opcional: informar al backend que se desactivaron
            const userData = await getUserData();
            if (userData) {
                try {
                    const response = await apiCall(
                        'https://api.minymol.com/push/disable-notifications',
                        {
                            method: 'POST',
                            body: JSON.stringify({
                                userId: userData.id || userData.proveedorInfo?.id,
                                userType: userData.rol
                            })
                        }
                    );

                    if (!response.ok) {
                        console.warn('Error informando al backend sobre desactivación:', response.statusText);
                    }
                } catch (apiError) {
                    console.warn('Error informando al backend sobre desactivación:', apiError.message);
                    // No fallar si el backend no responde, las notificaciones locales ya están desactivadas
                }
            }

            return { success: true, message: '🔕 Notificaciones desactivadas' };
        } catch (error) {
            console.error('Error desactivando notificaciones:', error);
            return {
                success: false,
                message: '❌ Error al desactivar notificaciones'
            };
        }
    };

    const toggleNotifications = async () => {
        if (notificationsEnabled) {
            return await disableNotifications();
        } else {
            return await enableNotifications();
        }
    };

    return {
        fcmToken,
        notification,
        notificationsEnabled,
        enableNotifications,
        disableNotifications,
        toggleNotifications,
    };
};

export default useNotifications;
