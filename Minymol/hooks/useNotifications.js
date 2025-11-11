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
    const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);

    // Verificar si está en Expo Go
    const isExpoGo = Constants.appOwnership === 'expo';

    useEffect(() => {
        // Verificar si el usuario está logueado al inicializar
        checkUserStatus();
        // También verificar el estado de las notificaciones
        checkNotificationStatus();
    }, []);

    useEffect(() => {
        // NO inicializar automáticamente - esperar a que el usuario haga login
        // Las notificaciones se activarán después del login/registro desde LoginModal/RegisterModal

        // Solo agregar listeners si NO está en Expo Go y el usuario está logueado
        if (isExpoGo || !isUserLoggedIn) {
            if (isExpoGo) {
                console.log('⚠️ Expo Go detectado - Listeners de notificaciones deshabilitados');
            }
            if (!isUserLoggedIn) {
                console.log('⚠️ Usuario no logueado - Notificaciones no inicializadas');
            }
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
    }, [isExpoGo, isUserLoggedIn]);

    const checkUserStatus = async () => {
        try {
            const userData = await getUserData();
            setIsUserLoggedIn(!!userData);
        } catch (error) {
            console.error('Error verificando estado del usuario:', error);
            setIsUserLoggedIn(false);
        }
    };

    const checkNotificationStatus = async () => {
        try {
            const enabled = await AsyncStorage.getItem('notificaciones-activadas');
            // Por defecto están desactivadas hasta que el usuario haga login
            setNotificationsEnabled(enabled === 'true');
        } catch (error) {
            console.error('Error verificando estado de notificaciones:', error);
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
            try {
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
                    if (!isAutoInit) {
                        console.log('⚠️ No se pudo eliminar token anterior:', error.message);
                    }
                }
                
                token = await messaging().getToken();
                
                if (!token) {
                    throw new Error('No se pudo obtener el token FCM');
                }
                
                console.log('✅ Token FCM obtenido correctamente');
                
            } catch (error) {
                // Manejar errores específicos de Firebase
                if (error.message?.includes('SERVICE_NOT_AVAILABLE')) {
                    const message = 'Servicios de Google Play no disponibles. Verifica tu conexión a internet y que los servicios de Google Play estén actualizados.';
                    if (isAutoInit) {
                        console.warn('⚠️', message);
                        return null; // No fallar durante inicialización automática
                    } else {
                        throw new Error(message);
                    }
                } else if (error.message?.includes('NETWORK_ERROR')) {
                    const message = 'Error de red. Verifica tu conexión a internet.';
                    if (isAutoInit) {
                        console.warn('⚠️', message);
                        return null;
                    } else {
                        throw new Error(message);
                    }
                } else {
                    // Re-lanzar cualquier otro error
                    throw error;
                }
            }
        } else {
            console.warn('Las notificaciones push solo funcionan en dispositivos físicos');
            throw new Error('Debe usar un dispositivo físico para las notificaciones push');
        }

        return token;
    };

    const enableNotifications = async (isAutoInit = false) => {
        try {
            // Verificar que el usuario esté logueado primero
            const userData = await getUserData();
            if (!userData) {
                const message = 'Debes iniciar sesión para activar las notificaciones';
                if (!isAutoInit) {
                    console.warn('⚠️', message);
                }
                return { success: false, message: message };
            }

            const token = await registerForPushNotificationsAsync(isAutoInit);
            if (!token && isAutoInit) {
                // En Expo Go durante inicialización automática, simplemente retornamos
                return { success: false, message: 'Notificaciones no disponibles en Expo Go' };
            }
            
            if (!token) {
                throw new Error('No se pudo obtener el token de notificaciones');
            }
            
            setFcmToken(token);

            // Guardar el token en el backend
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

                // Marcar como activadas explícitamente
                await AsyncStorage.setItem('notificaciones-activadas', 'true');
                await AsyncStorage.setItem('push-token', token);
                setNotificationsEnabled(true);
                setIsUserLoggedIn(true);

                return { success: true, message: '✅ Notificaciones activadas correctamente' };
            } catch (apiError) {
                console.error('Error registrando token en el backend:', apiError);
                throw new Error(`Error al registrar token: ${apiError.message}`);
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
        isUserLoggedIn,
        enableNotifications,
        disableNotifications,
        toggleNotifications,
        checkUserStatus, // Exponer para que se pueda llamar después del login
    };
};

export default useNotifications;
