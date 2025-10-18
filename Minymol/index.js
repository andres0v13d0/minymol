import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// Configurar el manejador de mensajes en background
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Mensaje FCM recibido en background:', remoteMessage);
  
  // Aquí puedes procesar el mensaje, actualizar estado local, etc.
  // NO uses console.log en producción ya que puede afectar el rendimiento
});

AppRegistry.registerComponent(appName, () => App);