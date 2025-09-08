import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { getUbuntuFont } from '../../utils/fonts';

const CodigoInput = forwardRef(({ length = 6, onComplete, disabled = false }, ref) => {
    const [values, setValues] = useState(Array(length).fill(''));
    const inputRefs = useRef([]);

    // Inicializar refs
    useEffect(() => {
        inputRefs.current = inputRefs.current.slice(0, length);
        for (let i = inputRefs.current.length; i < length; i++) {
            inputRefs.current[i] = null;
        }
    }, [length]);

    useEffect(() => {
        if (!disabled && inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, [disabled]);

    const handleChange = (text, index) => {
        // Solo permitir números
        const value = text.replace(/[^0-9]/g, '');
        
        if (value.length > 1) {
            // Si se pega texto largo, distribuirlo
            const chars = value.slice(0, length).split('');
            const newValues = [...values];
            
            chars.forEach((char, i) => {
                if (index + i < length) {
                    newValues[index + i] = char;
                }
            });
            
            setValues(newValues);
            
            // Enfocar el siguiente input disponible
            const nextIndex = Math.min(index + chars.length, length - 1);
            if (inputRefs.current[nextIndex]) {
                inputRefs.current[nextIndex].focus();
            }
            
            // Verificar si se completó
            const code = newValues.join('');
            if (code.length === length) {
                onComplete(code);
            }
            
            return;
        }

        // Actualizar valor en el estado
        const newValues = [...values];
        newValues[index] = value;
        setValues(newValues);

        // Mover al siguiente input si hay valor
        if (value && index < length - 1) {
            if (inputRefs.current[index + 1]) {
                inputRefs.current[index + 1].focus();
            }
        }

        // Verificar si se completó el código
        const code = newValues.join('');
        if (code.length === length) {
            // Auto-enviar cuando se complete
            setTimeout(() => {
                onComplete(code);
            }, 200); // Pequeño delay para mejor UX
        }
    };

    const handleKeyPress = ({ nativeEvent }, index) => {
        if (nativeEvent.key === 'Backspace') {
            const newValues = [...values];
            
            if (newValues[index]) {
                // Si hay valor, limpiarlo
                newValues[index] = '';
                setValues(newValues);
            } else if (index > 0) {
                // Si no hay valor, ir al anterior y limpiarlo
                newValues[index - 1] = '';
                setValues(newValues);
                if (inputRefs.current[index - 1]) {
                    inputRefs.current[index - 1].focus();
                }
            }
            
            // Notificar cambio
            const code = newValues.join('');
            onComplete(code);
        }
    };

    const clearCode = () => {
        setValues(Array(length).fill(''));
        onComplete('');
        if (!disabled && inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    };

    const clearCodeSilent = () => {
        setValues(Array(length).fill(''));
        // No llamar onComplete para evitar loops
        if (!disabled && inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    };

    // Exponer funciones al componente padre
    useImperativeHandle(ref, () => ({
        clearCode,
        clearCodeSilent,
    }));

    return (
        <View style={styles.container}>
            {Array.from({ length }).map((_, index) => (
                <TextInput
                    key={index}
                    ref={(ref) => inputRefs.current[index] = ref}
                    style={[
                        styles.input,
                        disabled && styles.inputDisabled
                    ]}
                    maxLength={1}
                    keyboardType="numeric"
                    value={values[index]}
                    onChangeText={(text) => handleChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    editable={!disabled}
                    textAlign="center"
                    selectTextOnFocus
                    blurOnSubmit={false}
                    placeholderTextColor="#ccc"
                />
            ))}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        marginVertical: 20,
    },
    input: {
        width: 45,
        height: 55,
        borderWidth: 2,
        borderColor: '#fa7e17',
        borderRadius: 12,
        backgroundColor: '#fff',
        fontSize: 24,
        fontFamily: getUbuntuFont('bold'),
        color: '#14144b',
        textAlign: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    inputDisabled: {
        backgroundColor: '#f0f0f0',
        borderColor: '#ddd',
        color: '#999',
    },
});

CodigoInput.displayName = 'CodigoInput';

export default CodigoInput;
