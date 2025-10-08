import { VideoView, useVideoPlayer } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Image,
    Modal,
    PanResponder,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getUbuntuFont } from '../../utils/fonts';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ProviderStories = ({ visible, provider, onClose, isOwner = false, onDeleteReel }) => {
    const [reels, setReels] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(null);
    const [loading, setLoading] = useState(true);
    const [videoError, setVideoError] = useState(false);
    const [isMuted, setIsMuted] = useState(false); // Audio activado por defecto en React Native
    const [retryCount, setRetryCount] = useState(0);
    const [isRetrying, setIsRetrying] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [reelToDelete, setReelToDelete] = useState(null);
    const [videoPaused, setVideoPaused] = useState(false);
    const [currentVideoTime, setCurrentVideoTime] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);

    // Safe area insets para manejar las áreas seguras
    const insets = useSafeAreaInsets();

    // Crear player dinámico basado en el currentReel
    const currentReel = reels[currentIndex];
    const player = useVideoPlayer(currentReel?.videoUrl || '', (player) => {
        player.loop = false;
        player.muted = isMuted;
    });

    // Refs
    const videoRef = useRef(null);
    const viewedReelsRef = useRef(new Set());
    const progressAnim = useRef(new Animated.Value(0)).current;

    // Función para verificar conectividad (simplificada para React Native)
    const checkConnectivity = () => {
        // En React Native podrías usar @react-native-community/netinfo
        return true; // Por ahora siempre true
    };

    // Función de reintento automático para errores de buffering
    const handleAutoRetry = useCallback((errorType) => {
        const maxRetries = 3;

        if (retryCount < maxRetries && checkConnectivity()) {
            setRetryCount(prev => prev + 1);
            setVideoError(false);
            setIsRetrying(true);

            setTimeout(() => {
                setIsRetrying(false);
                // El componente Video se recargará automáticamente
            }, 1500);
        } else if (retryCount >= maxRetries) {
            setIsRetrying(false);
            setVideoError(true);
        }
    }, [retryCount]);

    const loadProviderReels = useCallback(async () => {
        try {
            const response = await fetch(`https://api.minymol.com/reels/provider/${provider.provider.id}?limit=10`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Validar que los datos sean válidos
            if (!Array.isArray(data)) {
                console.error('Los datos recibidos no son un array:', data);
                setReels([]);
                return;
            }

            // Filtrar reels que tengan videoUrl válida
            const validReels = data.filter(reel =>
                reel &&
                reel.videoUrl &&
                typeof reel.videoUrl === 'string' &&
                reel.videoUrl.trim() !== ''
            );

            setReels(validReels);
        } catch (error) {
            setReels([]);
        } finally {
            setLoading(false);
        }
    }, [provider.provider.id]);

    const updateProgress = useCallback(async (reelId) => {
        try {
            const response = await fetch(`https://api.minymol.com/reels/provider/${provider.provider.id}/progress/${reelId}`);
            const data = await response.json();
            setProgress(data);
        } catch (error) {
            console.error('Error updating progress:', error);
        }
    }, [provider.provider.id]);

    const incrementView = useCallback(async (reelId) => {
        // Evitar múltiples incrementos para el mismo reel
        if (viewedReelsRef.current.has(reelId)) {
            return;
        }

        viewedReelsRef.current.add(reelId);
        try {
            await fetch(`https://api.minymol.com/reels/${reelId}/view`, {
                method: 'POST'
            });
        } catch (error) {
            console.error('Error incrementing view:', error);
            // Si hay error, remover del Set para permitir reintento
            viewedReelsRef.current.delete(reelId);
        }
    }, []);

    // PanResponder para gestos de navegación
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                // Pausar video al tocar
                setVideoPaused(true);
            },
            onPanResponderMove: (evt, gestureState) => {
                // Opcional: manejar gestos de drag
            },
            onPanResponderRelease: (evt, gestureState) => {
                const { dx, dy, vx } = gestureState;

                // Reanudar video
                setVideoPaused(false);

                // Detectar swipe horizontal para cambiar de reel
                if (Math.abs(dx) > 50 && Math.abs(vx) > 0.5) {
                    if (dx > 0) {
                        prevReel();
                    } else {
                        nextReel();
                    }
                    return;
                }

                // Detectar tap en áreas específicas
                const tapX = evt.nativeEvent.pageX;
                const tapY = evt.nativeEvent.pageY;

                // Área izquierda para retroceder (30% de la pantalla)
                if (tapX < screenWidth * 0.3) {
                    prevReel();
                }
                // Área derecha para avanzar (30% de la pantalla)
                else if (tapX > screenWidth * 0.7) {
                    nextReel();
                }
                // Centro para pausar/reanudar
                else {
                    setVideoPaused(!videoPaused);
                }
            },
        })
    ).current;

    useEffect(() => {
        if (visible) {
            loadProviderReels();
        }

        return () => {
            // Cleanup
            viewedReelsRef.current.clear();
        };
    }, [visible, loadProviderReels]);

    useEffect(() => {
        if (reels.length > 0 && currentIndex < reels.length) {
            const currentReel = reels[currentIndex];
            updateProgress(currentReel.id);
            incrementView(currentReel.id);

            // Resetear estados al cambiar de historia
            setRetryCount(0);
            setVideoError(false);
            setIsRetrying(false);
            setCurrentVideoTime(0);
            setVideoDuration(0);

            // Resetear animación de progreso
            progressAnim.setValue(0);
            progressAnim.stopAnimation();
        }
    }, [currentIndex, reels, updateProgress, incrementView, progressAnim]);

    // Control de reproducción y pausa
    useEffect(() => {
        if (player) {
            if (!videoPaused) {
                player.play();
            } else {
                player.pause();
            }
        }
    }, [player, videoPaused]);

    // Interval para actualizar progreso y detectar final del video
    useEffect(() => {
        if (!player || videoPaused || videoError || isRetrying) return;

        const interval = setInterval(() => {
            try {
                const currentTime = player.currentTime || 0;
                const duration = player.duration || 0;

                setCurrentVideoTime(currentTime);
                setVideoDuration(duration);

                // Actualizar barra de progreso en tiempo real
                if (duration > 0) {
                    const progress = currentTime / duration;
                    progressAnim.setValue(Math.min(progress, 1));

                    // Detectar final del video (con margen de 0.1 segundos)
                    if (currentTime >= duration - 0.1 && duration > 0) {
                        clearInterval(interval);
                        nextReel();
                    }
                }
            } catch (error) {
                // Ignorar errores del player si está siendo destruido
                console.warn('Error accessing player properties:', error);
            }
        }, 100); // Actualizar cada 100ms

        return () => clearInterval(interval);
    }, [player, videoPaused, videoError, isRetrying, progressAnim, nextReel]);

    const nextReel = useCallback(() => {
        setVideoError(false);

        if (currentIndex < reels.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // Si no hay más videos, cerrar automáticamente como Instagram
            console.log('Cerrando modal: no hay más videos');
            onClose();
        }
    }, [currentIndex, reels.length, onClose]);

    const prevReel = useCallback(() => {
        setVideoError(false);

        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    }, [currentIndex]);

    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    const confirmDeleteReel = (reel) => {
        setReelToDelete(reel);
        setShowDeleteModal(true);
    };

    const handleDeleteReel = async () => {
        if (reelToDelete && onDeleteReel) {
            await onDeleteReel(reelToDelete);
            setShowDeleteModal(false);
            setReelToDelete(null);
            // Cerrar el modal de stories después de eliminar
            onClose();
        }
    };

    const cancelDeleteReel = () => {
        setShowDeleteModal(false);
        setReelToDelete(null);
    };

    if (!visible) return null;

    if (loading) {
        return (
            <Modal visible={visible} animationType="fade" statusBarTranslucent>
                <StatusBar hidden />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#fa7e17" />
                </View>
            </Modal>
        );
    }

    if (reels.length === 0) {
        return (
            <Modal visible={visible} animationType="fade" statusBarTranslucent>
                <StatusBar hidden />
                <View style={styles.emptyContainer}>
                    <Icon name="video-library" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>No hay historias disponibles</Text>
                    <TouchableOpacity style={styles.emptyCloseButton} onPress={onClose}>
                        <Text style={styles.emptyCloseButtonText}>Cerrar</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        );
    }

    // Validar que el reel actual tenga una URL de video válida
    if (!currentReel || !currentReel.videoUrl) {
        return (
            <Modal visible={visible} animationType="fade" statusBarTranslucent>
                <StatusBar hidden />
                <View style={styles.emptyContainer}>
                    <Icon name="error-outline" size={48} color="#ff4444" />
                    <Text style={styles.emptyText}>Error al cargar el video</Text>
                    <TouchableOpacity style={styles.emptyCloseButton} onPress={onClose}>
                        <Text style={styles.emptyCloseButtonText}>Cerrar</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        );
    }

    return (
        <Modal visible={visible} animationType="fade" statusBarTranslucent>
            <StatusBar hidden />
            <View style={styles.container}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.backdrop} />
                </TouchableWithoutFeedback>

                <View style={styles.content} {...panResponder.panHandlers}>
                    {/* Barras de progreso */}
                    <View style={[styles.progressContainer, { paddingTop: insets.top + 10 }]}>
                        {reels.map((_, i) => (
                            <View key={i} style={styles.progressBarContainer}>
                                <View
                                    style={[
                                        styles.progressBar,
                                        i < currentIndex && styles.progressCompleted,
                                        i > currentIndex && styles.progressPending
                                    ]}
                                />
                                {i === currentIndex && (
                                    <Animated.View
                                        style={[
                                            styles.progressBar,
                                            styles.progressCurrent,
                                            {
                                                width: progressAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: ['0%', '100%'],
                                                }),
                                            },
                                        ]}
                                    />
                                )}
                            </View>
                        ))}
                    </View>

                    {/* Header */}
                    <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                        <View style={styles.providerInfo}>
                            <Image
                                source={{
                                    uri: provider.provider.logo_url || 'https://via.placeholder.com/40'
                                }}
                                style={styles.providerAvatar}
                            />
                            <View style={styles.providerDetails}>
                                <Text style={styles.providerName}>{provider.provider.nombre_empresa}</Text>
                                <Text style={styles.storyTime}>
                                    {progress?.currentIndex || currentIndex + 1}/{progress?.totalReels || reels.length}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                <Icon name="close" size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Video Container */}
                    <View style={styles.videoContainer}>
                        {isRetrying ? (
                            <View style={styles.retryContainer}>
                                <ActivityIndicator size="large" color="#fa7e17" />
                                <Text style={styles.retryTitle}>Reintentando conexión...</Text>
                                <Text style={styles.retryText}>Recuperando video automáticamente</Text>
                            </View>
                        ) : videoError ? (
                            <View style={styles.errorContainer}>
                                <Icon name="warning" size={48} color="#ff4444" />
                                <Text style={styles.errorTitle}>Error al cargar el video</Text>
                                <Text style={styles.errorText}>
                                    {!checkConnectivity()
                                        ? 'Sin conexión a internet. Verifica tu conectividad.'
                                        : 'No se pudo reproducir este contenido. Puede ser un problema temporal del servidor o el video no está disponible.'
                                    }
                                </Text>
                                <View style={styles.errorActions}>
                                    <TouchableOpacity
                                        style={styles.retryButton}
                                        onPress={() => {
                                            if (!checkConnectivity()) {
                                                Alert.alert('Sin conexión', 'Verifica tu conexión a internet');
                                                return;
                                            }
                                            setVideoError(false);
                                            setRetryCount(0);
                                            setIsRetrying(false);
                                        }}
                                    >
                                        <Text style={styles.retryButtonText}>Reintentar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.nextButton} onPress={nextReel}>
                                        <Text style={styles.nextButtonText}>Siguiente</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : player && currentReel?.videoUrl ? (
                            <VideoView
                                ref={videoRef}
                                style={styles.video}
                                player={player}
                                contentFit="cover"
                                fullscreenOptions={{ enabled: false }}
                                allowsPictureInPicture={false}
                                nativeControls={false}
                                showsPlaybackControls={false}
                            />
                        ) : (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#fa7e17" />
                            </View>
                        )}

                        {/* Indicador de audio silenciado (solo mostrar cuando esté muted) */}
                        {isMuted && !videoError && !isRetrying && (
                            <View style={styles.mutedIndicator}>
                                <Icon name="volume-off" size={16} color="white" />
                            </View>
                        )}

                        {/* Play/Pause indicator */}
                        {videoPaused && !videoError && !isRetrying && (
                            <View style={styles.pauseIndicator}>
                                <Icon name="pause" size={20} color="white" />
                            </View>
                        )}

                        {/* Info del reel */}
                        <View style={styles.reelInfo}>
                            <View style={styles.reelStats}>
                                {isOwner && (
                                    <View style={styles.reelViewsContainer}>
                                        <Icon name="visibility" size={14} color="white" />
                                        <Text style={styles.reelViews}> {currentReel.views || 0}</Text>
                                    </View>
                                )}
                            </View>
                            <TouchableOpacity style={styles.muteButton} onPress={toggleMute}>
                                <Icon 
                                    name={isMuted ? 'volume-off' : 'volume-up'} 
                                    size={18} 
                                    color="white" 
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
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
        backgroundColor: 'black',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
        paddingHorizontal: 40,
    },
    emptyText: {
        color: 'white',
        fontSize: 18,
        fontFamily: getUbuntuFont('medium'),
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 8,
    },
    progressContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 10,
        gap: 4,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 5,
    },
    progressBarContainer: {
        flex: 1,
        height: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 1.5,
        position: 'relative',
    },
    progressBar: {
        height: '100%',
        borderRadius: 1.5,
        position: 'absolute',
        top: 0,
        left: 0,
    },
    progressCompleted: {
        backgroundColor: 'white',
        width: '100%',
    },
    progressCurrent: {
        backgroundColor: 'white',
    },
    progressPending: {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    providerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    providerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    providerDetails: {
        flex: 1,
    },
    providerName: {
        color: 'white',
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
    },
    storyTime: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12,
        fontFamily: getUbuntuFont('regular'),
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    deleteButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoContainer: {
        flex: 1,
        position: 'relative',
    },
    video: {
        width: screenWidth,
        height: '100%',
    },
    retryContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    retryTitle: {
        color: 'white',
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        marginTop: 16,
        textAlign: 'center',
    },
    retryText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        marginTop: 8,
        textAlign: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    errorTitle: {
        color: 'white',
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 12,
    },
    errorText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    errorActions: {
        flexDirection: 'row',
        gap: 16,
    },
    retryButton: {
        backgroundColor: '#fa7e17',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 14,
        fontFamily: getUbuntuFont('bold'),
    },
    nextButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
    },
    nextButtonText: {
        color: 'white',
        fontSize: 14,
        fontFamily: getUbuntuFont('bold'),
    },
    mutedIndicator: {
        position: 'absolute',
        top: 20,
        left: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 16,
    },
    pauseIndicator: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -25 }, { translateY: -25 }],
        width: 50,
        height: 50,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reelInfo: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    reelStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    reelViewsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    reelViews: {
        color: 'white',
        fontSize: 14,
        fontFamily: getUbuntuFont('regular'),
    },
    muteButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyCloseButton: {
        backgroundColor: '#fa7e17',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 20,
    },
    emptyCloseButtonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: getUbuntuFont('bold'),
        textAlign: 'center',
    },
});

export default ProviderStories;