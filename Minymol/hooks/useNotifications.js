import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Configuración del comportamiento de las notificaciones
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export const useNotifications = () => {
    const [expoPushToken, setExpoPushToken] = useState('');
    const [notification, setNotification] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);

    // Verificar si está en Expo Go
    const isExpoGo = Constants.appOwnership === 'expo';

    useEffect(() => {
        // Verificar si las notificaciones están activadas
        checkNotificationStatus();

        // Solo agregar listeners si NO está en Expo Go
        if (isExpoGo) {
            console.log('⚠️ Expo Go detectado - Listeners de notificaciones deshabilitados');
            return;
        }

        // Listener para notificaciones recibidas
        const notificationListener = Notifications.addNotificationReceivedListener?.(notification => {
            setNotification(notification);
        });

        // Listener para cuando el usuario toca la notificación
        const responseListener = Notifications.addNotificationResponseReceivedListener?.(response => {
            console.log('Notificación tocada:', response);
            // Aquí puedes manejar la navegación según el contenido de la notificación
        });

        return () => {
            // Solo remover listeners si existen
            if (notificationListener && typeof Notifications.removeNotificationSubscription === 'function') {
                Notifications.removeNotificationSubscription(notificationListener);
            }
            if (responseListener && typeof Notifications.removeNotificationSubscription === 'function') {
                Notifications.removeNotificationSubscription(responseListener);
            }
        };
    }, [isExpoGo]);

    const checkNotificationStatus = async () => {
        try {
            const enabled = await AsyncStorage.getItem('notificaciones-activadas');
            setNotificationsEnabled(enabled === 'true');
        } catch (error) {
            console.error('Error verificando estado de notificaciones:', error);
        }
    };

    const registerForPushNotificationsAsync = async () => {
        let token;

        // Verificar si está corriendo en Expo Go
        const isExpoGo = Constants.appOwnership === 'expo';
        if (isExpoGo) {
            throw new Error(
                '⚠️ Las notificaciones push no están disponibles en Expo Go.\n\n' +
                'Para usar notificaciones push, necesitas crear un Development Build o APK con EAS Build.\n\n' +
                'Ejecuta: eas build -p android --profile preview'
            );
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
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                throw new Error('No se otorgaron permisos para notificaciones push');
            }

            // Obtener el token de Expo Push
            token = (await Notifications.getExpoPushTokenAsync({
                projectId: 'fa331260-c87d-4a77-b708-31b53a5f11d3' // Tu project ID de EAS
            })).data;

            console.log('Token de notificación:', token);
        } else {
            console.warn('Las notificaciones push solo funcionan en dispositivos físicos');
            throw new Error('Debe usar un dispositivo físico para las notificaciones push');
        }

        return token;
    };

    const enableNotifications = async () => {
        try {
            const token = await registerForPushNotificationsAsync();
            setExpoPushToken(token);

            // Guardar el token en el backend
            const usuario = await AsyncStorage.getItem('usuario');
            if (usuario) {
                const userData = JSON.parse(usuario);
                const authToken = await AsyncStorage.getItem('token');

                await axios.post(
                    'https://api.minymol.com/push/register-token',
                    {
                        fcmToken: token,
                        userId: userData.id || userData.proveedorInfo?.id,
                        userType: userData.rol
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${authToken}`
                        }
                    }
                );

                // Marcar como activadas
                await AsyncStorage.setItem('notificaciones-activadas', 'true');
                await AsyncStorage.setItem('push-token', token);
                setNotificationsEnabled(true);

                return { success: true, message: '✅ Notificaciones activadas correctamente' };
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
            await AsyncStorage.removeItem('notificaciones-activadas');
            await AsyncStorage.removeItem('push-token');
            setNotificationsEnabled(false);

            // Opcional: informar al backend que se desactivaron
            const authToken = await AsyncStorage.getItem('token');
            if (authToken) {
                await axios.post(
                    'https://api.minymol.com/push/unregister-token',
                    {},
                    {
                        headers: {
                            Authorization: `Bearer ${authToken}`
                        }
                    }
                );
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
        expoPushToken,
        notification,
        notificationsEnabled,
        enableNotifications,
        disableNotifications,
        toggleNotifications,
    };
};

export default useNotifications;
