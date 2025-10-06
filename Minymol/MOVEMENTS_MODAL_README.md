# 📱 Sistema de Comprobantes Digitales - Minymol

## 🎯 Descripción

Sistema completo de registro de movimientos (abonos/compras) con generación automática de comprobantes digitales tipo Nequi/Daviplata.

---

## 🚀 Funcionalidades

### ✅ Registro de Movimientos
- **Tipo de movimiento**: Abono o Compra
- **Selector de proveedor**: Con resumen de deuda actual
- **Monto**: Con formato de miles (ej: $45.000)
- **Descripción**: Campo opcional
- **Días para pagar**: Solo en compras

### ✅ Métodos de Pago (Abonos)
1. **Presencial**: Con firma digital del proveedor
2. **Transferencia**: Con número de referencia

### ✅ Comprobante Digital
- Diseño profesional tipo app bancaria
- Formato PNG cuadrado (350x350px)
- Incluye:
  - Header con gradiente naranja
  - Checkmark de éxito
  - Información del proveedor
  - Monto destacado
  - Método de pago
  - Resumen de cuenta (saldo anterior, abono, nuevo saldo)
  - Firma digital (si aplica)
  - Footer de validación

### ✅ Compartir
- **WhatsApp directo**: Abre conversación con el proveedor y permite compartir comprobante
- **Compartir general**: Email, Telegram, Drive, etc.

---

## 📦 Dependencias Instaladas

```json
{
  "react-native-view-shot": "^3.8.0",
  "expo-sharing": "latest",
  "expo-file-system": "latest",
  "react-native-signature-canvas": "latest"
}
```

---

## 🏗️ Estructura de Componentes

```
components/MovementsModal/
├── MovementsModal.js       # Modal principal (formulario)
├── SignaturePad.js         # Captura de firma digital
├── ReceiptCard.js          # Diseño del comprobante
├── SuccessModal.js         # Modal de éxito + compartir
└── index.js                # Export
```

---

## 🎨 Diseño

- **Animación**: Slide de derecha a izquierda (tipo drawer)
- **Colores**: Naranja Minymol (#fa7e17)
- **Tipografía**: Ubuntu (Bold, Medium, Regular)
- **Iconos**: Ionicons
- **SafeArea**: Compatible iOS/Android

---

## 🔧 Uso

```jsx
import MovementsModal from '../../components/MovementsModal';

// En tu componente
const [showMovementsModal, setShowMovementsModal] = useState(false);

// Renderizar
<MovementsModal
  visible={showMovementsModal}
  onClose={() => setShowMovementsModal(false)}
/>
```

---

## 📝 Flujo de Usuario

1. Usuario abre "Registrar movimiento"
2. Selecciona proveedor
3. Elige tipo (Abono/Compra)
4. Ingresa monto y descripción
5. Si es abono:
   - **Presencial**: Firma digital
   - **Transferencia**: Número de referencia
6. Confirma movimiento
7. Si es abono → Modal de éxito
8. Comparte comprobante por WhatsApp o cualquier app

---

## 🌐 API Endpoints Utilizados

- `GET /debts/providers` - Listar proveedores
- `POST /movements` - Crear movimiento

### Request Body (Abono Presencial)
```json
{
  "providerId": 1,
  "type": "abono",
  "amount": 45000,
  "description": "Abono parcial",
  "paymentMethod": "presencial"
}
```

### Request Body (Abono Transferencia)
```json
{
  "providerId": 1,
  "type": "abono",
  "amount": 45000,
  "description": "Abono parcial",
  "paymentMethod": "transferencia",
  "transferReference": "TRX-12345678"
}
```

### Request Body (Compra/Deuda)
```json
{
  "providerId": 1,
  "type": "deuda",
  "amount": 100000,
  "description": "Compra de mercancía",
  "dueInDays": 30
}
```

---

## 🎯 Características Técnicas

- ✅ **ViewShot**: Captura componente React como PNG
- ✅ **Expo Sharing**: Compartir nativo (compatible con Expo Go)
- ✅ **Expo FileSystem**: Manejo de archivos temporales
- ✅ **Signature Canvas**: Firma digital con canvas HTML5
- ✅ **WhatsApp Deep Linking**: Abre WhatsApp con mensaje predefinido
- ✅ **Validación**: Formulario validado en tiempo real

---

## 🔐 Seguridad

- Token JWT en headers (`Authorization: Bearer <token>`)
- Validación de saldos antes de registrar abonos
- Firma digital como evidencia de pago presencial

---

## 🎨 Personalización

### Colores
Edita en `ReceiptCard.js`:
```javascript
colors={['#fa7e17', '#ff9a3d']} // Gradiente header
```

### Tamaño del comprobante
Edita en `ReceiptCard.js`:
```javascript
receipt: {
  width: 350, // Ancho
  // Altura se ajusta automáticamente
}
```

---

## 📱 Compatibilidad

- ✅ iOS (Expo Go)
- ✅ Android (Expo Go)
- ✅ iOS (Build standalone)
- ✅ Android (Build standalone)

---

## 🐛 Troubleshooting

### Error: "TurboModuleRegistry: RNShare not found"
**Solución**: Usar `expo-sharing` en lugar de `react-native-share`

### La firma no se captura
**Solución**: Verificar que `react-native-signature-canvas` esté instalado

### El comprobante no se comparte
**Solución**: Verificar permisos de almacenamiento en Android

---

## 📄 Licencia

Propiedad de **Minymol** - Sistema SAI (Sistema de Abonos Inteligentes)

---

## 👨‍💻 Autor

Desarrollado para **Minymol** - Octubre 2025
