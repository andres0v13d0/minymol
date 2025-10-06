import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';
import { getUbuntuFont } from '../../utils/fonts';

const { width: screenWidth } = Dimensions.get('window');

const SignaturePad = ({ onSave, onBegin, onEnd }) => {
    const signatureRef = useRef(null);

    const handleSignature = (signature) => {
        onSave(signature);
    };

    const handleClear = () => {
        signatureRef.current?.clearSignature();
        onSave(null);
    };

    const handleEnd = () => {
        signatureRef.current?.readSignature();
        if (onEnd) onEnd();
    };

    const handleBegin = () => {
        if (onBegin) onBegin();
    };

    const style = `.m-signature-pad {
        box-shadow: none;
        border: none;
        margin: 0;
    }
    .m-signature-pad--body {
        border: none;
    }
    .m-signature-pad--footer {
        display: none;
    }
    body,html {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
        touch-action: none;
    }`;

    return (
        <View style={styles.container}>
            <View style={styles.signatureContainer}>
                <SignatureScreen
                    ref={signatureRef}
                    onBegin={handleBegin}
                    onEnd={handleEnd}
                    onOK={handleSignature}
                    descriptionText="Firme aquí"
                    clearText="Limpiar"
                    confirmText="Confirmar"
                    webStyle={style}
                    autoClear={false}
                    trimWhitespace={true}
                    penColor="#1f2937"
                    backgroundColor="#ffffff"
                />
            </View>

            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                <Ionicons name="refresh-outline" size={18} color="#ef4444" />
                <Text style={styles.clearButtonText}>Limpiar firma</Text>
            </TouchableOpacity>

            <View style={styles.hint}>
                <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
                <Text style={styles.hintText}>
                    El proveedor debe firmar aquí para confirmar el abono
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    signatureContainer: {
        width: '100%',
        height: 200,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        backgroundColor: '#ffffff',
        overflow: 'hidden',
        borderStyle: 'dashed',
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#fef2f2',
        gap: 6,
    },
    clearButtonText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
        color: '#ef4444',
    },
    hint: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 6,
    },
    hintText: {
        flex: 1,
        fontSize: 12,
        fontFamily: getUbuntuFont('regular'),
        color: '#6b7280',
        lineHeight: 16,
    },
});

export default SignaturePad;
