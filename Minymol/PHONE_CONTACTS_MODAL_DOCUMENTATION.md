# PhoneContactsModal - Documentación Completa

## 📋 Descripción General

`PhoneContactsModal` es un componente que permite a los usuarios ver sus contactos telefónicos y determinar cuáles de ellos están registrados en la plataforma. El componente compara los números de teléfono locales con los usuarios registrados y permite iniciar conversaciones o invitar contactos que no están en la plataforma.

---

## 🎯 Características Principales

1. **Acceso a contactos del dispositivo** mediante permisos nativos
2. **Comparación inteligente** de números de teléfono (normalización)
3. **Caché local** con AsyncStorage para mejorar rendimiento (24h de expiración)
4. **Actualización en segundo plano** mientras se muestra caché
5. **Lógica de permisos de chat** entre diferentes tipos de usuarios
6. **Invitación** de contactos no registrados vía WhatsApp/SMS
7. **Búsqueda y filtrado** de contactos
8. **Animaciones suaves** con entrada desde abajo

---

## 📦 Librerías Necesarias

### Instalación

```bash
# Expo Contacts - Para acceder a contactos del teléfono
npx expo install expo-contacts

# AsyncStorage - Para almacenar caché local
npx expo install @react-native-async-storage/async-storage

# Expo Icons - Para iconos (ya incluido en Expo)
npx expo install @expo/vector-icons

# React Native - Componentes nativos base
# (Ya incluido en React Native / Expo)
```

### Dependencias en package.json

```json
{
  "dependencies": {
    "expo-contacts": "~14.0.0",
    "@react-native-async-storage/async-storage": "1.23.1",
    "@expo/vector-icons": "^14.0.0",
    "react-native": "0.74.5"
  }
}
```

---

## 🔑 Permisos Requeridos

### Android (`android/app/src/main/AndroidManifest.xml`)

```xml
<manifest>
  <uses-permission android:name="android.permission.READ_CONTACTS" />
  <uses-permission android:name="android.permission.WRITE_CONTACTS" />
</manifest>
```

### iOS (`ios/YourApp/Info.plist`)

```xml
<key>NSContactsUsageDescription</key>
<string>Necesitamos acceso a tus contactos para mostrarte quiénes están en la plataforma</string>
```

### Solicitud en Runtime

```typescript
import * as Contacts from 'expo-contacts';

const { status } = await Contacts.requestPermissionsAsync();
if (status === 'granted') {
  // Acceso concedido
} else {
  // Mostrar mensaje y opción para ir a configuración
  Linking.openSettings();
}
```

---

## 🔄 Flujo de Funcionamiento

### 1. **Apertura del Modal**

```
Usuario abre modal
    ↓
Animar entrada desde abajo (slideAnim)
    ↓
Llamar a loadContacts()
```

### 2. **Carga de Contactos (loadContacts)**

```
Intentar cargar desde caché
    ↓
¿Caché existe y es válido? (< 24h)
    ├── SÍ → Mostrar contactos cacheados
    │         ↓
    │   Actualizar en segundo plano (updateContactsInBackground)
    │
    └── NO → Mostrar loading
              ↓
          Solicitar permisos
              ↓
          Obtener contactos del teléfono
              ↓
          Obtener usuarios de la plataforma (API)
              ↓
          Comparar y hacer matching
              ↓
          Guardar en caché
              ↓
          Mostrar resultados
```

---

## 📱 Obtención de Contactos del Teléfono

```typescript
// Solicitar permisos
const { status } = await Contacts.requestPermissionsAsync();

if (status === 'granted') {
  // Obtener contactos con campos específicos
  const { data } = await Contacts.getContactsAsync({
    fields: [
      Contacts.Fields.PhoneNumbers,  // Números de teléfono
      Contacts.Fields.Image,          // Avatar (si existe)
    ],
  });

  // data contiene array de contactos
  console.log('Total contactos:', data.length);
}
```

### Estructura de un Contacto

```typescript
{
  id: string;
  name: string;
  phoneNumbers: Array<{
    id: string;
    number: string;
    digits?: string;
    label: string;
  }>;
  imageAvailable: boolean;
}
```

---

## 🔀 Normalización de Números de Teléfono

La normalización es **crítica** para comparar números correctamente, ya que pueden venir en diferentes formatos.

### Ejemplos de Formatos

```
(312) 456-7890
312-456-7890
+57 312 456 7890
573124567890
3124567890
```

### Función de Normalización

```typescript
const normalizePhoneNumber = (phone: string): string => {
  // 1. Eliminar todo excepto números
  let normalized = phone.replace(/\D/g, '');
  
  // 2. Si tiene 10 dígitos, agregar código de país
  if (normalized.length === 10) {
    // Ajustar según país (ej: 57 para Colombia)
    normalized = '57' + normalized;
  }
  
  // 3. Retornar número normalizado
  return normalized;
};
```

### Aplicación

```typescript
// Normalizar números del contacto local
const normalizedPhones = contact.phoneNumbers!.map(pn => 
  normalizePhoneNumber(pn.number || '')
);

// Normalizar número del usuario de la plataforma
const userPhone = normalizePhoneNumber(user.telefono || '');

// Comparar
if (normalizedPhones.includes(userPhone)) {
  // ¡Coincidencia encontrada!
}
```

---

## 🌐 Obtención de Usuarios de la Plataforma

### API Call Example

```typescript
// En ChatService.ts o similar
async getAvailableContacts(): Promise<Contact[]> {
  try {
    const response = await fetch(`${API_URL}/api/chat/contacts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    return data.contacts;
  } catch (error) {
    console.error('Error obteniendo contactos:', error);
    return [];
  }
}
```

### Estructura del Objeto Contact

```typescript
interface Contact {
  userId: number;
  nombre: string;
  telefono: string;
  rol: 'proveedor' | 'comerciante' | 'admin';
  logo_url?: string | null;
  canChat: boolean;  // ← Importante para lógica de permisos
}
```

---

## 🔗 Comparación y Matching

### Lógica de Comparación

```typescript
const matched: MatchedContact[] = phoneContacts
  .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
  .map(contact => {
    // Normalizar todos los números del contacto
    const normalizedPhones = contact.phoneNumbers!.map(pn => 
      normalizePhoneNumber(pn.number || '')
    );

    // Buscar coincidencia con usuarios de la plataforma
    const platformUser = platformUsers.find(user => {
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
      minymolUser: platformUser,  // undefined si no está en la plataforma
    };
  });
```

### Ordenamiento de Resultados

```typescript
.sort((a, b) => {
  // 1. Usuarios que SÍ puedes chatear primero
  const canChatA = a.platformUser?.canChat !== false;
  const canChatB = b.platformUser?.canChat !== false;
  
  if (canChatA && !canChatB) return -1;
  if (!canChatA && canChatB) return 1;
  
  // 2. Dentro de cada grupo, usuarios registrados primero
  if (a.platformUser && !b.platformUser) return -1;
  if (!a.platformUser && b.platformUser) return 1;
  
  // 3. Por último, orden alfabético
  return a.phoneContact.name.localeCompare(b.phoneContact.name);
});
```

---

## 🚫 Lógica de Permisos de Chat (canChat)

### Concepto

El campo `canChat` determina si el usuario actual puede iniciar una conversación con ese contacto, basándose en sus roles.

### Implementación en el Backend (API)

```typescript
// Ejemplo: Endpoint GET /api/chat/contacts
router.get('/contacts', authenticateToken, async (req, res) => {
  const currentUserRole = req.user.rol; // 'proveedor' o 'comerciante'
  
  // Obtener todos los usuarios potenciales
  const users = await getUsersFromDatabase();
  
  // Aplicar lógica de canChat según roles
  const contacts = users.map(user => ({
    userId: user.id,
    nombre: user.nombre,
    telefono: user.telefono,
    rol: user.rol,
    logo_url: user.logo_url,
    canChat: canChatBetweenRoles(currentUserRole, user.rol)
  }));
  
  res.json({ contacts });
});
```

### Función de Validación

```typescript
function canChatBetweenRoles(
  currentUserRole: string, 
  targetUserRole: string
): boolean {
  // Matriz de permisos de chat
  const chatPermissions: Record<string, string[]> = {
    'proveedor': ['comerciante'],      // Proveedores solo chatean con comerciantes
    'comerciante': ['proveedor'],      // Comerciantes solo chatean con proveedores
    'admin': ['proveedor', 'comerciante', 'admin']  // Admin con todos
  };
  
  const allowedRoles = chatPermissions[currentUserRole] || [];
  return allowedRoles.includes(targetUserRole);
}
```

### Ejemplo de Implementación por App

#### App de Mayoristas (Proveedores)
```typescript
// Backend: Proveedor autenticado
if (req.user.rol === 'proveedor') {
  contact.canChat = targetUser.rol === 'comerciante';
}
```

#### App de Minoristas (Comerciantes)
```typescript
// Backend: Comerciante autenticado
if (req.user.rol === 'comerciante') {
  contact.canChat = targetUser.rol === 'proveedor';
}
```

### Manejo en el Frontend

```typescript
const handleContactPress = (matched: MatchedContact) => {
  if (matched.platformUser) {
    // Verificar si se puede chatear
    if (matched.platformUser.canChat === false) {
      const roleMessage = 
        matched.platformUser.rol === 'proveedor' 
          ? 'No puedes chatear con otros proveedores'
        : matched.platformUser.rol === 'comerciante'
          ? 'No puedes chatear con otros comerciantes'
        : 'No puedes chatear con este usuario';
      
      Alert.alert('Chat no disponible', roleMessage);
      return;
    }
    
    // Iniciar chat
    onSelectContact(
      matched.platformUser.userId,
      matched.platformUser.nombre,
      matched.platformUser.logo_url
    );
  } else {
    // Invitar contacto no registrado
    handleInviteContact(matched.phoneContact);
  }
};
```

---

## 💾 Sistema de Caché con AsyncStorage

### Claves de Almacenamiento

```typescript
const CONTACTS_CACHE_KEY = '@app_matched_contacts';
const CONTACTS_TIMESTAMP_KEY = '@app_contacts_timestamp';
const CACHE_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 horas
```

### Guardar en Caché

```typescript
const saveToCache = async (contacts: MatchedContact[]) => {
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
```

### Leer desde Caché

```typescript
const loadFromCache = async (): Promise<MatchedContact[] | null> => {
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

    // Verificar expiración
    if (now - timestamp > CACHE_EXPIRATION_TIME) {
      console.log('⏰ Caché expirado');
      return null;
    }

    return JSON.parse(cachedContacts);
  } catch (error) {
    console.error('Error leyendo caché:', error);
    return null;
  }
};
```

### Actualización en Background

```typescript
const updateContactsInBackground = async () => {
  console.log('🔄 Actualizando contactos en background...');
  
  try {
    // No mostrar loading, solo actualizar silenciosamente
    const { status } = await Contacts.getPermissionsAsync();
    if (status !== 'granted') return;

    // Obtener datos frescos
    const [contactsResult, platformUsers] = await Promise.all([
      Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] }),
      ChatService.getAvailableContacts(),
    ]);

    // Hacer matching
    const matched = compareAndMatch(contactsResult.data, platformUsers);

    // Actualizar UI y caché
    setMatchedContacts(matched);
    await saveToCache(matched);
    
    console.log('✅ Contactos actualizados en background');
  } catch (error) {
    console.error('Error en actualización background:', error);
  }
};
```

---

## 📤 Invitación de Contactos No Registrados

### Función de Invitación

```typescript
const handleInviteContact = (contact: PhoneContact) => {
  const message = `¡Hola ${contact.name}! Te invito a usar [App Name], la mejor plataforma para [tu propósito]. Descárgala aquí: https://tuapp.com/descargar`;
  
  const phoneNumber = contact.phoneNumbers[0];
  
  // URL de WhatsApp
  const whatsappUrl = Platform.select({
    ios: `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`,
    android: `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`,
  });

  Linking.canOpenURL(whatsappUrl!)
    .then(supported => {
      if (supported) {
        Linking.openURL(whatsappUrl!);
      } else {
        // Fallback a SMS
        const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
        Linking.openURL(smsUrl);
      }
    })
    .catch(err => {
      Alert.alert('Error', 'No se pudo abrir WhatsApp o SMS.');
    });
};
```

---

## 🎨 Renderizado de Contactos

### Contacto con Usuario Registrado

```typescript
{isOnPlatform && !cannotChat && (
  <View style={styles.chatButton}>
    <Ionicons name="chatbubble-ellipses" size={20} color={COLORS.primary} />
    <Text style={styles.chatButtonText}>Chatear</Text>
  </View>
)}
```

### Contacto NO Registrado

```typescript
{!isOnPlatform && (
  <View style={styles.inviteButton}>
    <Ionicons name="person-add-outline" size={20} color={COLORS.secondaryText} />
    <Text style={styles.inviteButtonText}>Invitar</Text>
  </View>
)}
```

### Contacto Restringido (canChat = false)

```typescript
{cannotChat && (
  <Text style={[styles.contactPhone, { color: '#dc2626', fontStyle: 'italic' }]}>
    No puedes chatear con este tipo de usuario
  </Text>
)}
```

---

## 🔍 Búsqueda y Filtrado

```typescript
const [searchQuery, setSearchQuery] = useState('');

const filteredContacts = matchedContacts.filter(matched => 
  matched.phoneContact.name.toLowerCase().includes(searchQuery.toLowerCase())
);

// Buscador UI
<TextInput
  style={styles.searchInput}
  placeholder="Buscar contacto..."
  value={searchQuery}
  onChangeText={setSearchQuery}
  autoCapitalize="none"
/>
```

---

## 🎭 Animaciones

### Entrada desde Abajo

```typescript
const [slideAnim] = useState(new Animated.Value(SCREEN_HEIGHT));

// Al abrir modal
Animated.spring(slideAnim, {
  toValue: 0,
  useNativeDriver: true,
  tension: 65,
  friction: 11,
}).start();

// Al cerrar modal
Animated.timing(slideAnim, {
  toValue: SCREEN_HEIGHT,
  duration: 250,
  useNativeDriver: true,
}).start();
```

---

## 🧪 Testing y Debug

### Logs Importantes

```typescript
console.log('📦 Contactos cargados desde caché');
console.log('⏰ Caché expirado, recargando...');
console.log('💾 Contactos guardados en caché');
console.log('🔄 Actualizando contactos en background...');
console.log('✅ Contactos actualizados en background');
```

### Verificación de Permisos

```typescript
const { status } = await Contacts.getPermissionsAsync();
console.log('Estado de permisos:', status); // 'granted', 'denied', 'undetermined'
```

### Debug de Matching

```typescript
console.log('Total contactos teléfono:', phoneContacts.length);
console.log('Total usuarios plataforma:', platformUsers.length);
console.log('Total coincidencias:', matched.length);
console.log('Usuarios con canChat=true:', 
  matched.filter(m => m.platformUser?.canChat === true).length
);
```

---

## ⚠️ Consideraciones y Mejores Prácticas

### 1. **Privacidad y Permisos**
- Siempre explicar por qué necesitas los permisos
- Ofrecer opción de ir a Configuración si se niegan
- No solicitar permisos hasta que sea necesario

### 2. **Rendimiento**
- Usar caché para evitar lecturas innecesarias
- Actualizar en background mientras se muestra caché
- Limitar campos solicitados a Contacts API

### 3. **UX**
- Mostrar loading solo en primera carga
- Permitir cerrar modal con overlay tap
- Ordenar contactos lógicamente (registrados primero)

### 4. **Normalización de Números**
- Ajustar código de país según región
- Manejar formatos internacionales
- Validar antes de comparar

### 5. **Errores Comunes**
- No normalizar números → matching falla
- No verificar permisos → crash
- No manejar caché → rendimiento pobre
- No validar canChat → UX confusa

---

## 📊 Diagrama de Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO ABRE MODAL                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              ¿Existe caché válido? (< 24h)                   │
└────────────────────┬──────────────────┬─────────────────────┘
                     │ SÍ               │ NO
                     ↓                  ↓
        ┌────────────────────┐  ┌──────────────────┐
        │ Mostrar caché      │  │ Mostrar loading  │
        │ inmediatamente     │  └────────┬─────────┘
        └────────┬───────────┘           │
                 │                       ↓
                 │         ┌─────────────────────────────┐
                 │         │ Solicitar permisos          │
                 │         │ (Contacts.requestPermissions)│
                 │         └─────────┬───────────────────┘
                 │                   │
                 │                   ↓
                 │         ┌─────────────────────────────┐
                 │         │ ¿Permisos concedidos?       │
                 │         └──────┬──────────────┬───────┘
                 │                │ SÍ           │ NO
                 │                ↓              ↓
                 │    ┌───────────────────┐  ┌─────────────┐
                 │    │ Obtener contactos │  │ Mostrar msg │
                 │    │ del teléfono      │  │ de permisos │
                 │    └─────┬─────────────┘  └─────────────┘
                 │          │
                 │          ↓
                 │    ┌───────────────────────┐
                 │    │ Obtener usuarios de   │
                 │    │ plataforma (API)      │
                 │    └─────┬─────────────────┘
                 │          │
                 │          ↓
                 │    ┌───────────────────────┐
                 │    │ Normalizar y comparar │
                 │    │ números de teléfono   │
                 │    └─────┬─────────────────┘
                 │          │
                 │          ↓
                 │    ┌───────────────────────┐
                 │    │ Aplicar lógica        │
                 │    │ canChat (roles)       │
                 │    └─────┬─────────────────┘
                 │          │
                 │          ↓
                 │    ┌───────────────────────┐
                 │    │ Ordenar resultados    │
                 │    └─────┬─────────────────┘
                 │          │
                 │          ↓
                 │    ┌───────────────────────┐
                 │    │ Guardar en caché      │
                 │    └─────┬─────────────────┘
                 │          │
                 ↓          ↓
        ┌────────────────────────────────────┐
        │ Actualizar contactos en background │
        │ (proceso silencioso)               │
        └────────────────────────────────────┘
                         │
                         ↓
        ┌────────────────────────────────────┐
        │ USUARIO VE LISTA DE CONTACTOS      │
        │ (puede buscar, filtrar, seleccionar)│
        └────────────────┬───────────────────┘
                         │
                         ↓
        ┌────────────────────────────────────┐
        │ USUARIO TOCA UN CONTACTO           │
        └────────┬───────────────────────────┘
                 │
                 ↓
        ┌──────────────────────────────┐
        │ ¿Usuario está en plataforma? │
        └──────┬──────────────┬────────┘
               │ SÍ           │ NO
               ↓              ↓
    ┌──────────────────┐  ┌────────────────┐
    │ ¿canChat=true?   │  │ Invitar vía    │
    └───┬──────┬───────┘  │ WhatsApp/SMS   │
        │ SÍ   │ NO       └────────────────┘
        ↓      ↓
    ┌───────┐ ┌─────────────────┐
    │ Abrir │ │ Mostrar alerta  │
    │ Chat  │ │ "No disponible" │
    └───────┘ └─────────────────┘
```

---

## 🎯 Checklist de Implementación

- [ ] Instalar librerías necesarias (`expo-contacts`, `@react-native-async-storage/async-storage`)
- [ ] Configurar permisos en `AndroidManifest.xml` y `Info.plist`
- [ ] Implementar solicitud de permisos en runtime
- [ ] Crear función de normalización de números de teléfono
- [ ] Implementar endpoint API para obtener usuarios con `canChat`
- [ ] Configurar lógica de roles y permisos de chat en backend
- [ ] Implementar sistema de caché con AsyncStorage
- [ ] Crear comparación y matching de contactos
- [ ] Implementar actualización en background
- [ ] Agregar búsqueda y filtrado de contactos
- [ ] Implementar invitación vía WhatsApp/SMS
- [ ] Agregar animaciones de entrada/salida
- [ ] Testear con diferentes tipos de usuarios (roles)
- [ ] Validar normalización con números internacionales
- [ ] Probar rendimiento con muchos contactos (>1000)

---

## 📚 Recursos Adicionales

- [Expo Contacts Documentation](https://docs.expo.dev/versions/latest/sdk/contacts/)
- [AsyncStorage Documentation](https://react-native-async-storage.github.io/async-storage/)
- [React Native Linking](https://reactnative.dev/docs/linking)
- [React Native Animated](https://reactnative.dev/docs/animated)

---

## 🤝 Adaptación por App

### Para App de Proveedores (Mayoristas)
```typescript
// Backend: canChat logic
canChat: targetUser.rol === 'comerciante'

// Mensaje de error
"No puedes chatear con otros proveedores"
```

### Para App de Comerciantes (Minoristas)
```typescript
// Backend: canChat logic
canChat: targetUser.rol === 'proveedor'

// Mensaje de error
"No puedes chatear con otros comerciantes"
```

**Nota:** Ajustar mensajes y lógica de `canChat` según el rol del usuario autenticado en cada aplicación.

---

## 🐛 Troubleshooting

### Problema: No se encuentran coincidencias
**Solución:** Verificar normalización de números. Asegurar que el código de país sea consistente.

### Problema: Caché no se actualiza
**Solución:** Verificar timestamp y tiempo de expiración. Borrar caché manualmente en desarrollo.

### Problema: Permisos se niegan automáticamente
**Solución:** Usuario debe ir a Configuración del sistema y habilitar permisos manualmente.

### Problema: canChat no funciona correctamente
**Solución:** Verificar que el backend envíe el campo `canChat` correctamente según roles.

---

**Versión del documento:** 1.0  
**Última actualización:** Octubre 2025  
**Autor:** Minymol Development Team
