import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const UploadVideoModal = ({
    visible,
    onClose,
    onUpload,
    uploading,
    uploadProgress,
    processingProgress,
    uploadStatus
}) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [videoPreview, setVideoPreview] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false); // Audio activado por defecto en React Native
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState('');
    const [videoDuration, setVideoDuration] = useState(0);
    const videoRef = useRef(null);

    // Video player con expo-video
    const player = useVideoPlayer(videoPreview || '', (player) => {
        player.loop = true;
        player.muted = isMuted;
    });

    // Limpiar estado al cerrar modal
    useEffect(() => {
        if (!visible) {
            setSelectedFile(null);
            setVideoPreview(null);
            setIsPlaying(false);
            setIsMuted(false);
            setIsProcessing(false);
            setProcessingStep('');
            setVideoDuration(0);
        }
    }, [visible]);

    // Controlar el video player
    useEffect(() => {
        if (player && videoPreview) {
            player.replaceAsync(videoPreview);
            player.muted = isMuted;
            
            if (isPlaying) {
                player.play();
            } else {
                player.pause();
            }
        }
    }, [player, videoPreview, isPlaying, isMuted]);

    // Agregar listeners del video player
    useEffect(() => {
        if (!player) return;

        const statusListener = player.addListener('playbackStatusUpdate', (status) => {
            if (status.isLoaded) {
                const durationSeconds = status.durationMillis / 1000;
                setVideoDuration(durationSeconds);

                // Validar duración
                if (durationSeconds > 60) {
                    Alert.alert(
                        'Video muy largo',
                        'El video no puede ser mayor a 60 segundos',
                        [
                            {
                                text: 'OK',
                                onPress: () => {
                                    setSelectedFile(null);
                                    setVideoPreview(null);
                                }
                            }
                        ]
                    );
                }
            }
        });

        const errorListener = player.addListener('playbackError', (error) => {
            console.error('Video preview error:', error);
            Alert.alert('Error', 'Error al cargar el preview del video');
        });

        return () => {
            statusListener?.remove();
            errorListener?.remove();
        };
    }, [player]);

    const handleFileSelect = async () => {
        try {
            // Solicitar permisos para acceder a la galería
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            if (status !== 'granted') {
                Alert.alert(
                    'Permisos requeridos',
                    'Necesitamos acceso a tu galería para seleccionar videos.'
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'videos',
                allowsEditing: true,
                aspect: [9, 16], // Aspecto vertical tipo Instagram
                quality: 1,
                videoMaxDuration: 60, // Máximo 60 segundos
            });

            if (result.canceled) {
                // Usuario canceló la selección
                return;
            }

            const file = result.assets[0];

            // Validar duración del video
            if (file.duration && file.duration > 60000) { // 60 segundos en ms
                Alert.alert(
                    'Video muy largo',
                    'El video debe durar máximo 60 segundos para los reels.'
                );
                return;
            }

            // Crear objeto compatible con el resto del código
            const selectedFile = {
                uri: file.uri,
                name: file.fileName || `video_${Date.now()}.mp4`,
                type: file.type || 'video/mp4',
                size: file.fileSize || 0
            };

            // Validar tamaño según estrategia de procesamiento
            const fileSizeMB = selectedFile.size / (1024 * 1024);
            const maxSize = fileSizeMB > 10 ? 200 : 100; // Más espacio para videos grandes

            if (fileSizeMB > maxSize) {
                Alert.alert(
                    'Archivo muy grande',
                    `El archivo es demasiado grande. Máximo ${maxSize}MB.\n\nPara videos grandes se usará procesamiento optimizado.`
                );
                return;
            }

            setSelectedFile(selectedFile);
            setVideoPreview(file.uri);

        } catch (error) {
            console.error('Error selecting file:', error);
            Alert.alert('Error', 'Error al seleccionar el archivo de video');
        }
    };

    const handlePlayPause = () => {
        setIsPlaying(!isPlaying);
    };

    const handleMuteToggle = () => {
        setIsMuted(!isMuted);
    };

    // Función simplificada - Solo sube el archivo original
    const prepareVideoForUpload = async (file) => {
        return new Promise((resolve) => {
            setProcessingStep('Preparando video...');

            // Simular preparación breve
            setTimeout(() => {
                setProcessingStep('¡Listo para subir!');
                resolve(file); // Siempre usar archivo original
            }, 1000);
        });
    };

    const processAndUpload = async () => {
        if (!selectedFile) return;

        try {
            setIsProcessing(true);
            setProcessingStep('Preparando video...');

            // Preparar archivo original para upload
            const processingPromise = prepareVideoForUpload(selectedFile);

            // Race entre procesamiento y timeout
            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => {
                    resolve(selectedFile);
                }, 15000); // 15 segundos máximo total
            });

            const processedFile = await Promise.race([processingPromise, timeoutPromise]);

            setProcessingStep('¡Listo! Iniciando subida...');

            // Pequeña pausa para que el usuario vea el mensaje
            await new Promise(resolve => setTimeout(resolve, 500));

            // Subir el video
            await onUpload(
                processedFile.uri,
                processedFile.name,
                processedFile.size
            );

        } catch (error) {
            setProcessingStep('Error, subiendo archivo original...');

            try {
                // Fallback: subir original si hay error en procesamiento
                await onUpload(
                    selectedFile.uri,
                    selectedFile.name,
                    selectedFile.size
                );
            } catch (uploadError) {
                Alert.alert('Error', 'Error al subir el video. Por favor, inténtalo de nuevo.');
            }
        } finally {
            setIsProcessing(false);
            setProcessingStep('');
        }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" statusBarTranslucent>
            <StatusBar backgroundColor="rgba(0,0,0,0.9)" barStyle="light-content" />
            <View style={styles.container}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.backdrop} />
                </TouchableWithoutFeedback>

                <View style={styles.content}>
                    {/* Contenido del modal */}
                    {!selectedFile ? (
                        <>
                            {/* Header */}
                            <View style={styles.header}>
                                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                    <Icon name="close" size={20} color="#333" />
                                </TouchableOpacity>
                            </View>
                            
                            {/* Selector de archivo */}
                            <View style={styles.fileSelectorContainer}>
                            <View style={styles.uploadZone}>
                                <View style={styles.uploadIconLarge}>
                                    <Icon name="videocam" size={48} color="#fa7e17" />
                                </View>
                                <Text style={styles.uploadTitle}>Selecciona un video</Text>
                                <Text style={styles.uploadSubtitle}>Máximo 60 segundos</Text>

                                <TouchableOpacity
                                    style={styles.selectButton}
                                    onPress={handleFileSelect}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.selectButtonText}>Elegir video</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        </>
                    ) : (uploadStatus === 'idle' && !uploading && !isProcessing) ? (
                        // Preview fullscreen con controles superpuestos - sin contenedor
                        <View style={styles.fullscreenContainer}>
                            {videoPreview && (
                                <>
                                    <VideoView
                                        ref={videoRef}
                                        style={styles.fullscreenVideo}
                                        player={player}
                                        contentFit="cover"
                                        fullscreenOptions={{ enabled: false }}
                                        allowsPictureInPicture={false}
                                    />

                                    {/* Controles superpuestos */}
                                    <View style={styles.overlayControls}>
                                        {/* Header transparente - solo botón cerrar */}
                                        <View style={styles.overlayHeader}>
                                            <TouchableOpacity style={styles.overlayButton} onPress={onClose}>
                                                <Icon name="close" size={24} color="white" />
                                            </TouchableOpacity>
                                            <Text style={styles.overlayTitle}>Preview del video</Text>
                                            <View style={{ width: 44 }} />
                                        </View>

                                        {/* Botón de play/pause centrado */}
                                        {!isPlaying && (
                                            <TouchableOpacity
                                                style={styles.centerPlayButton}
                                                onPress={handlePlayPause}
                                                activeOpacity={0.8}
                                            >
                                                <Icon name="play-arrow" size={60} color="white" />
                                            </TouchableOpacity>
                                        )}

                                        {/* Controles inferiores */}
                                        <View style={styles.overlayFooter}>
                                            <TouchableOpacity 
                                                style={styles.overlayActionButton} 
                                                onPress={() => {
                                                    setSelectedFile(null);
                                                    setVideoPreview(null);
                                                }}
                                                activeOpacity={0.8}
                                            >
                                                <Icon name="swap-horiz" size={24} color="white" />
                                                <Text style={styles.overlayButtonText}>Cambiar</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity 
                                                style={styles.overlayActionButton} 
                                                onPress={processAndUpload}
                                                activeOpacity={0.8}
                                            >
                                                <Icon name="cloud-upload" size={24} color="white" />
                                                <Text style={styles.overlayButtonText}>Subir</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </>
                            )}
                        </View>
                    ) : isProcessing && uploadStatus === 'idle' ? (
                        // Procesamiento interno (antes de que inicie el upload)
                        <View style={styles.uploadStatus}>
                            <View style={styles.progressSection}>
                                <View style={styles.progressIcon}>
                                    <Icon name="movie" size={48} color="#fa7e17" />
                                </View>
                                <Text style={styles.statusTitle}>Optimizando video</Text>
                                <Text style={styles.statusText}>{processingStep}</Text>
                                <View style={styles.spinnerContainer}>
                                    <ActivityIndicator size="large" color="#fa7e17" />
                                </View>
                            </View>
                        </View>
                    ) : (
                        // Estado de upload/procesamiento del componente padre
                        <View style={styles.uploadStatus}>
                            {uploadStatus === 'uploading' && (
                                <View style={styles.progressSection}>
                                    <View style={styles.progressIcon}>
                                        <Icon name="cloud-upload" size={48} color="#fa7e17" />
                                    </View>
                                    <Text style={styles.statusTitle}>Subiendo historia...</Text>
                                    <View style={styles.progressBar}>
                                        <View
                                            style={[
                                                styles.progressFill,
                                                { width: `${uploadProgress || 0}%` }
                                            ]}
                                        />
                                    </View>
                                    <Text style={styles.progressText}>{Math.round(uploadProgress || 0)}%</Text>
                                </View>
                            )}

                            {uploadStatus === 'processing' && (
                                <View style={styles.progressSection}>
                                    <View style={styles.progressIcon}>
                                        <Icon name="movie" size={48} color="#4CAF50" />
                                    </View>
                                    <Text style={styles.statusTitle}>Procesando en servidor...</Text>
                                    <View style={styles.progressBar}>
                                        <View
                                            style={[
                                                styles.progressFill,
                                                styles.processingFill,
                                                { width: `${processingProgress || 0}%` }
                                            ]}
                                        />
                                    </View>
                                    <Text style={styles.progressText}>{Math.round(processingProgress || 0)}%</Text>
                                </View>
                            )}

                            {uploadStatus === 'completed' && (
                                <View style={styles.progressSection}>
                                    <View style={styles.progressIcon}>
                                        <Icon name="check-circle" size={48} color="#4CAF50" />
                                    </View>
                                    <Text style={styles.statusTitle}>¡Historia subida exitosamente!</Text>
                                    <Text style={styles.statusText}>Tu video ya está disponible para tus seguidores</Text>
                                </View>
                            )}

                            {uploadStatus === 'error' && (
                                <View style={[styles.progressSection, styles.errorSection]}>
                                    <View style={styles.progressIcon}>
                                        <Icon name="error" size={48} color="#ff4444" />
                                    </View>
                                    <Text style={styles.statusTitle}>Error al subir video</Text>
                                    <Text style={styles.statusText}>Hubo un problema. Intenta nuevamente.</Text>
                                    <TouchableOpacity style={styles.primaryButton} onPress={onClose}>
                                        <Text style={styles.primaryButtonText}>Cerrar</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    content: {
        flex: 1,
        backgroundColor: 'white',
        marginTop: 50,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fileSelectorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    uploadZone: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 60,
        borderWidth: 2,
        borderColor: '#ddd',
        borderStyle: 'dashed',
        borderRadius: 12,
        backgroundColor: '#f8f8f8',
    },
    uploadIconLarge: {
        marginBottom: 20,
    },
    uploadTitle: {
        fontSize: 20,
        fontFamily: getUbuntuFont('bold'),
        color: '#333',
        marginBottom: 8,
    },
    uploadSubtitle: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: '#666',
        marginBottom: 24,
    },
    selectButton: {
        backgroundColor: '#fa7e17',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 8,
    },
    selectButtonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
    },
    videoEditor: {
        flex: 1,
    },
    previewContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    videoPreview: {
        width: screenWidth * 0.6,
        aspectRatio: 9 / 16,
        backgroundColor: '#000',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    previewVideo: {
        width: '100%',
        height: '100%',
    },
    playOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    playButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoTouchControl: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    muteButton: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editorControls: {
        padding: 20,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    uploadActions: {
        flexDirection: 'row',
        gap: 12,
    },
    secondaryButton: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#333',
        fontSize: 16,
        fontFamily: getUbuntuFont('medium'),
    },
    primaryButton: {
        flex: 2,
        backgroundColor: '#fa7e17',
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
    processingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    processingContent: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    processingTitle: {
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        color: '#333',
        marginTop: 16,
    },
    processingStep: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: '#666',
        marginTop: 8,
        textAlign: 'center',
    },
    processingSubtitle: {
        fontSize: 12,
        fontFamily: getUbuntuFont('regular'),
        color: '#999',
        marginTop: 4,
        textAlign: 'center',
    },
    uploadStatus: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    progressSection: {
        alignItems: 'center',
        width: '100%',
    },
    progressIcon: {
        marginBottom: 20,
    },
    statusTitle: {
        fontSize: 20,
        fontFamily: getUbuntuFont('bold'),
        color: '#333',
        marginBottom: 12,
        textAlign: 'center',
    },
    statusText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
    },
    progressBar: {
        width: '100%',
        height: 8,
        backgroundColor: '#f0f0f0',
        borderRadius: 4,
        marginVertical: 16,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#fa7e17',
        borderRadius: 4,
    },
    processingFill: {
        backgroundColor: '#4CAF50',
    },
    progressText: {
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        color: '#333',
    },
    spinnerContainer: {
        marginTop: 20,
    },
    errorSection: {
        paddingHorizontal: 20,
    },
    // Estilos para preview fullscreen
    fullscreenContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#000',
    },
    fullscreenVideo: {
        width: '100%',
        height: '100%',
    },
    overlayControls: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'space-between',
    },
    overlayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    overlayButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayTitle: {
        fontSize: 16,
        fontFamily: getUbuntuFont('medium'),
        color: 'white',
    },
    centerPlayButton: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -40 }, { translateY: -40 }],
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayFooter: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingBottom: 50,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    overlayActionButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 25,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        minWidth: 100,
    },
    overlayButtonText: {
        fontSize: 14,
        fontFamily: getUbuntuFont('medium'),
        color: 'white',
        marginTop: 4,
    },
});

export default UploadVideoModal;