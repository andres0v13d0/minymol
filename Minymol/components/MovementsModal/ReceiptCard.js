import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, View } from 'react-native';
import { getUbuntuFont } from '../../utils/fonts';

const ReceiptCard = ({ movementData }) => {
    const { provider, amount, description, paymentMethod, transferReference, date } = movementData;

    // Calcular nuevo saldo
    const previousDebt = provider.deudaRestante;
    const newDebt = previousDebt - amount;

    // Formatear número
    const formatNumber = (num) => {
        return num.toLocaleString('es-CO', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        });
    };

    return (
        <View style={styles.receipt}>
            {/* Header con gradiente */}
            <LinearGradient
                colors={['#fa7e17', '#ff9a3d']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.checkmarkContainer}>
                    <View style={styles.checkmarkCircle}>
                        <Ionicons name="checkmark" size={24} color="#fff" />
                    </View>
                </View>

                <Text style={styles.headerTitle}>Comprobante de Abono</Text>
                <Text style={styles.headerSubtitle}>Minymol - Sistema SAI</Text>
            </LinearGradient>

            {/* Contenido */}
            <View style={styles.content}>
                {/* Fecha */}
                <View style={styles.dateContainer}>
                    <Ionicons name="calendar-outline" size={11} color="#6b7280" />
                    <Text style={styles.dateText}>{date}</Text>
                </View>

                {/* Separador */}
                <View style={styles.divider} />

                {/* Monto del abono */}
                <View style={styles.amountContainer}>
                    <Text style={styles.amountLabel}>Valor del abono</Text>
                    <Text style={styles.amountValue}>${formatNumber(amount)}</Text>
                </View>

                {/* Descripción */}
                {description && (
                    <View style={styles.infoSection}>
                        <Text style={styles.infoLabel}>Descripción</Text>
                        <Text style={styles.infoValueSecondary}>{description}</Text>
                    </View>
                )}

                {/* Referencia (si es transferencia) */}
                {paymentMethod === 'transferencia' && transferReference && (
                    <View style={styles.referenceContainer}>
                        <Text style={styles.referenceLabel}>Referencia:</Text>
                        <Text style={styles.referenceValue}>{transferReference}</Text>
                    </View>
                )}

                {/* Separador */}
                <View style={styles.divider} />

                {/* Resumen de cuenta */}
                <View style={styles.summarySection}>
                    <Text style={styles.summaryTitle}>Resumen de cuenta</Text>

                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Saldo anterior</Text>
                        <Text style={styles.summaryValue}>${formatNumber(previousDebt)}</Text>
                    </View>

                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Abono realizado</Text>
                        <Text style={[styles.summaryValue, styles.summaryValueNegative]}>
                            -${formatNumber(amount)}
                        </Text>
                    </View>

                    <View style={[styles.summaryRow, styles.summaryRowTotal]}>
                        <Text style={styles.summaryLabelTotal}>Nuevo saldo</Text>
                        <Text style={styles.summaryValueTotal}>${formatNumber(newDebt)}</Text>
                    </View>

                    {newDebt === 0 && (
                        <View style={styles.paidBadge}>
                            <Ionicons name="checkmark-circle" size={12} color="#10b981" />
                            <Text style={styles.paidText}>¡CUENTA SALDADA!</Text>
                        </View>
                    )}
                </View>

                {/* Firma (si es presencial) */}
                {paymentMethod === 'presencial' && movementData.signatureData && (
                    <View style={styles.signatureSection}>
                        <Text style={styles.signatureTitle}>Firma del proveedor</Text>
                        <View style={styles.signatureImageContainer}>
                            <Image
                                source={{ uri: movementData.signatureData }}
                                style={styles.signatureImage}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.signatureName}>{provider.name}</Text>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer}>
                    <Ionicons name="shield-checkmark-outline" size={10} color="#9ca3af" />
                    <Text style={styles.footerText}>
                        Documento generado automáticamente por Minymol
                    </Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    receipt: {
        width: 350,
        backgroundColor: '#ffffff',
        borderRadius: 0,
        overflow: 'hidden',
    },
    header: {
        paddingVertical: 12,
        paddingHorizontal: 12,
        alignItems: 'center',
    },
    checkmarkContainer: {
        marginBottom: 6,
    },
    checkmarkCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    headerTitle: {
        fontSize: 14,
        fontFamily: getUbuntuFont('bold'),
        color: '#ffffff',
        marginBottom: 2,
    },
    headerSubtitle: {
        fontSize: 9,
        fontFamily: getUbuntuFont('regular'),
        color: 'rgba(255,255,255,0.9)',
    },
    content: {
        padding: 12,
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        marginBottom: 8,
    },
    dateText: {
        fontSize: 9,
        fontFamily: getUbuntuFont('regular'),
        color: '#6b7280',
    },
    divider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 8,
    },
    infoSection: {
        marginBottom: 6,
    },
    infoLabel: {
        fontSize: 9,
        fontFamily: getUbuntuFont('medium'),
        color: '#6b7280',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 12,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
    },
    infoValueSecondary: {
        fontSize: 10,
        fontFamily: getUbuntuFont('regular'),
        color: '#374151',
    },
    amountContainer: {
        backgroundColor: '#fff7f0',
        padding: 8,
        borderRadius: 8,
        alignItems: 'center',
        marginVertical: 6,
    },
    amountLabel: {
        fontSize: 9,
        fontFamily: getUbuntuFont('medium'),
        color: '#ea580c',
        marginBottom: 2,
    },
    amountValue: {
        fontSize: 20,
        fontFamily: getUbuntuFont('bold'),
        color: '#fa7e17',
    },
    paymentMethodContainer: {
        alignItems: 'center',
        marginVertical: 6,
    },
    paymentMethodBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff7f0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    paymentMethodText: {
        fontSize: 9,
        fontFamily: getUbuntuFont('medium'),
        color: '#fa7e17',
    },
    referenceContainer: {
        backgroundColor: '#f9fafb',
        padding: 6,
        borderRadius: 6,
        marginTop: 4,
    },
    referenceLabel: {
        fontSize: 8,
        fontFamily: getUbuntuFont('medium'),
        color: '#6b7280',
        marginBottom: 2,
    },
    referenceValue: {
        fontSize: 10,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
    },
    summarySection: {
        backgroundColor: '#f9fafb',
        padding: 10,
        borderRadius: 8,
    },
    summaryTitle: {
        fontSize: 10,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
        marginBottom: 6,
        textAlign: 'center',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    summaryLabel: {
        fontSize: 10,
        fontFamily: getUbuntuFont('regular'),
        color: '#6b7280',
    },
    summaryValue: {
        fontSize: 10,
        fontFamily: getUbuntuFont('medium'),
        color: '#1f2937',
    },
    summaryValueNegative: {
        color: '#10b981',
    },
    summaryRowTotal: {
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 4,
        marginTop: 2,
    },
    summaryLabelTotal: {
        fontSize: 11,
        fontFamily: getUbuntuFont('bold'),
        color: '#1f2937',
    },
    summaryValueTotal: {
        fontSize: 13,
        fontFamily: getUbuntuFont('bold'),
        color: '#fa7e17',
    },
    paidBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#d1fae5',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        marginTop: 6,
        gap: 4,
    },
    paidText: {
        fontSize: 9,
        fontFamily: getUbuntuFont('bold'),
        color: '#10b981',
    },
    signatureSection: {
        marginTop: 8,
        padding: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        backgroundColor: '#fafafa',
    },
    signatureTitle: {
        fontSize: 9,
        fontFamily: getUbuntuFont('medium'),
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 4,
    },
    signatureImageContainer: {
        height: 50,
        backgroundColor: '#ffffff',
        borderRadius: 6,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    signatureImage: {
        width: '100%',
        height: '100%',
    },
    signatureName: {
        fontSize: 9,
        fontFamily: getUbuntuFont('medium'),
        color: '#1f2937',
        textAlign: 'center',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        gap: 4,
    },
    footerText: {
        fontSize: 8,
        fontFamily: getUbuntuFont('regular'),
        color: '#9ca3af',
    },
});

export default ReceiptCard;
