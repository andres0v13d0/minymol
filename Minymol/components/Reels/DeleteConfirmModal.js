import {
    Dimensions,
    Image,
    Modal,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getUbuntuFont } from '../../utils/fonts';

const { width: screenWidth } = Dimensions.get('window');

const DeleteConfirmModal = ({ visible, reel, onConfirm, onCancel }) => {
    if (!visible || !reel) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
            <StatusBar backgroundColor="rgba(0,0,0,0.5)" barStyle="light-content" />
            <View style={styles.container}>
                <TouchableWithoutFeedback onPress={onCancel}>
                    <View style={styles.backdrop} />
                </TouchableWithoutFeedback>

                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Eliminar Historia</Text>
                    </View>

                    <View style={styles.body}>
                        <View style={styles.previewContainer}>
                            <Image
                                source={{
                                    uri: reel.thumbnailUrl || 'https://via.placeholder.com/120x160'
                                }}
                                style={styles.thumbnail}
                                onError={() => {
                                    // Fallback a placeholder en caso de error
                                }}
                            />
                        </View>

                        <View style={styles.messageContainer}>
                            <Text style={styles.confirmMessage}>
                                <Text style={styles.boldText}>¿Estás seguro que quieres eliminar esta historia?</Text>
                            </Text>
                            <Text style={styles.warningMessage}>
                                Esta acción no se puede deshacer. La historia será eliminada permanentemente.
                            </Text>

                            <View style={styles.infoContainer}>
                                <View style={styles.durationContainer}>
                                    <Icon name="schedule" size={14} color="#666" />
                                    <Text style={styles.durationInfo}> {reel.duration || 0}s de duración</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onCancel}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={onConfirm}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.deleteButtonText}>Eliminar Historia</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    content: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: 'white',
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 5,
        },
        shadowOpacity: 0.25,
        shadowRadius: 10,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        backgroundColor: '#fff',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        color: '#333',
        textAlign: 'center',
    },
    body: {
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    previewContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    thumbnail: {
        width: 80,
        height: 120,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
    },
    messageContainer: {
        alignItems: 'center',
    },
    confirmMessage: {
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: '#333',
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 22,
    },
    boldText: {
        fontFamily: getUbuntuFont('bold'),
    },
    warningMessage: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 16,
    },
    infoContainer: {
        backgroundColor: '#f8f8f8',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    durationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    durationInfo: {
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
        color: '#666',
    },
    actions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 16,
        backgroundColor: '#f8f8f8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontFamily: getUbuntuFont('medium'),
        color: '#666',
    },
    deleteButton: {
        flex: 1,
        paddingVertical: 16,
        backgroundColor: '#ff4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteButtonText: {
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        color: 'white',
    },
});

export default DeleteConfirmModal;