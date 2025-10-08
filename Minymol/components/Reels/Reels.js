import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import { onAuthStateChanged } from 'firebase/auth';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { auth } from '../../config/firebase';
import { useCache } from '../../hooks/useCache';
import { apiCall } from '../../utils/apiUtils';
import { CACHE_KEYS } from '../../utils/cache/StorageKeys';
import { getUbuntuFont } from '../../utils/fonts';
import ProviderStories from './ProviderStories';
import UploadVideoModal from './UploadVideoModal';

const { width: screenWidth } = Dimensions.get('window');
const STORY_WIDTH = 100;
const STORY_HEIGHT = 140;
const STORY_MARGIN = 8;

// Función para cargar mis reels usando apiCall centralizada
const fetchMyReels = async (userId, userIsProvider) => {
    if (!userId || !userIsProvider) {
        console.log('No se cargan mis reels: usuario no es proveedor o no está logueado');
        return [];
    }
    
    try {
        const response = await apiCall('https://api.minymol.com/reels/my-reels');

        if (response.ok) {
            const data = await response.json();
            // Ordenar mis historias por fecha (más reciente primero)
            const sortedMyStories = Array.isArray(data) ? data.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.created_at || 0);
                const dateB = new Date(b.createdAt || b.created_at || 0);
                return dateB - dateA; // Más reciente primero
            }) : [];
            return sortedMyStories;
        } else if (response.status === 404) {
            // No hay reels disponibles para este usuario
            return [];
        } else if (response.status === 403) {
            console.log('Usuario no autorizado para cargar sus reels (no es proveedor)');
            return [];
        }
        
        console.warn(`Error HTTP ${response.status} cargando mis reels`);
        return [];
    } catch (error) {
        // Solo loggear si no es un error de cuota (ya se maneja en apiCall)
        if (!error.message?.includes('quota-exceeded')) {
            console.error('Error cargando mis reels:', error);
        }
        return [];
    }
};

// Función para cargar proveedores con historias
const fetchProvidersWithReels = async () => {
    try {
        const response = await fetch('https://api.minymol.com/reels/list?groupBy=provider&limit=10');

        if (!response.ok) {
            // Si es 404, significa que no hay reels disponibles
            if (response.status === 404) {
                console.log('No hay reels disponibles');
                return [];
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Verificar que data sea un array válido
        if (Array.isArray(data)) {
            // Ordenar cada provider por fecha de sus reels (más reciente primero)
            const sortedProviders = data.map(provider => ({
                ...provider,
                reels: provider.reels ? provider.reels.sort((a, b) => {
                    const dateA = new Date(a.createdAt || a.created_at || 0);
                    const dateB = new Date(b.createdAt || b.created_at || 0);
                    return dateB - dateA; // Más reciente primero
                }) : []
            })).sort((a, b) => {
                // Ordenar providers por el reel más reciente de cada uno
                const latestA = a.reels[0] ? new Date(a.reels[0].createdAt || a.reels[0].created_at || 0) : new Date(0);
                const latestB = b.reels[0] ? new Date(b.reels[0].createdAt || b.reels[0].created_at || 0) : new Date(0);
                return latestB - latestA; // Provider con reel más reciente primero
            });
            return sortedProviders;
        } else {
            console.warn('La respuesta no es un array válido:', data);
            return [];
        }
    } catch (error) {
        console.error('Error cargando reels:', error);
        return [];
    }
};

const Reels = ({ onEmpty }) => {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showStories, setShowStories] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [processingProgress, setProcessingProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, processing, completed
    const [myStories, setMyStories] = useState([]);
    const [isProvider, setIsProvider] = useState(false);

    // Hook de caché para proveedores con reels
    const {
        data: providers,
        isLoading: loadingProviders,
        isRefreshing,
        hasCache,
        isOnline,
        refresh: refreshProviders,
        mutate: mutateProviders
    } = useCache(
        CACHE_KEYS.REELS_PROVIDERS,
        fetchProvidersWithReels,
        {
            refreshOnMount: true,
            refreshOnFocus: false
        }
    );

    // Hook de caché para mis reels (solo si es usuario proveedor)
    const myReelsCacheKey = user && isProvider ? CACHE_KEYS.MY_REELS(user.uid) : null;
    const {
        data: myReelsData,
        isLoading: loadingMyReels,
        mutate: mutateMyReels
    } = useCache(
        myReelsCacheKey,
        user && isProvider ? () => fetchMyReels(user.uid, isProvider) : null,
        {
            enabled: !!(user && isProvider),
            refreshOnMount: true
        }
    );

    // Combinar loading states - solo loading si no hay caché
    const loading = (loadingProviders && !hasCache) || (user && loadingMyReels && !myReelsData);

    // Firebase auth listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setAuthLoading(false);
        });

        return unsubscribe;
    }, []);

    // Actualizar myStories cuando cambien los datos del caché
    useEffect(() => {
        if (myReelsData) {
            setMyStories(myReelsData);
        }
    }, [myReelsData]);

    // Manejar callback cuando no hay contenido
    useEffect(() => {
        const noProviders = !providers || providers.length === 0;
        const noUserOrNotProvider = !user || !isProvider;
        
        if (!loading && noProviders && noUserOrNotProvider) {
            if (onEmpty) {
                onEmpty();
            }
        }
    }, [providers, user, isProvider, loading]); // Removido onEmpty para evitar loops

    // Verificar si el usuario es proveedor
    const checkIsProvider = async () => {
        try {
            const usuario = await AsyncStorage.getItem('usuario');
            return user && usuario && JSON.parse(usuario)?.proveedorInfo?.id;
        } catch (error) {
            return false;
        }
    };

    useEffect(() => {
        checkIsProvider().then(setIsProvider);
    }, [user]);

    // Obtener duración del video (simplificado para React Native)
    const getVideoDuration = async (fileUri) => {
        // En React Native necesitaríamos una librería como react-native-video-info
        // Por ahora retornamos un valor por defecto
        return Promise.resolve(30); // 30 segundos por defecto
    };

    // Manejar upload de video
    const handleVideoUpload = async (fileUri, fileName, fileSize) => {
        if (!fileUri || !user) return;

        setUploading(true);
        setUploadStatus('uploading');
        setUploadProgress(0);

        try {
            // Obtener duración del video
            const duration = await getVideoDuration(fileUri);

            if (duration > 60) {
                Alert.alert('Video muy largo', 'El video no puede ser mayor a 60 segundos');
                return;
            }

            setUploadProgress(10);

            // 1. Solicitar presigned URL
            const uploadRequest = await apiCall('https://api.minymol.com/reels/upload', {
                method: 'POST',
                body: JSON.stringify({
                    filename: fileName,
                    duration: Math.round(duration),
                    contentType: 'video/mp4'
                })
            });

            if (!uploadRequest.ok) {
                const error = await uploadRequest.json();
                throw new Error(error.message || 'Error al solicitar upload');
            }

            const { presignedUrl, uploadKey } = await uploadRequest.json();
            setUploadProgress(30);

            // 2. Subir a S3 usando presigned URL
            setUploadProgress(30);

            try {
                // Crear una instancia de File con la nueva API
                const file = new File(fileUri);

                // Realizar el upload usando fetch con el file object de React Native
                const uploadResponse = await fetch(presignedUrl, {
                    method: 'PUT',
                    body: {
                        uri: file.uri,
                        type: 'video/mp4',
                        name: fileName
                    },
                    headers: {
                        'Content-Type': 'video/mp4'
                    }
                });

                if (!uploadResponse.ok) {
                    const errorText = await uploadResponse.text();
                    throw new Error(`S3 Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
                }

            } catch (uploadError) {
                console.error('Error uploading to S3:', uploadError);
                throw new Error('Error al subir video a S3: ' + uploadError.message);
            }

            setUploadProgress(80);

            // 3. Notificar completado
            await apiCall('https://api.minymol.com/reels/upload-complete', {
                method: 'POST',
                body: JSON.stringify({ uploadKey })
            });

            setUploadProgress(100);
            setUploadStatus('processing');

            // Simular progreso de procesamiento
            let processing = 0;
            const processingInterval = setInterval(() => {
                processing += Math.random() * 15;
                if (processing >= 100) {
                    processing = 100;
                    clearInterval(processingInterval);
                    setUploadStatus('completed');

                    // Refrescar datos del caché después del procesamiento
                    setTimeout(() => {
                        refreshProviders(); // Refrescar providers
                        if (myReelsCacheKey) {
                            // Refrescar mis reels con la nueva función
                            fetchMyReels(user.uid).then(newMyReels => {
                                if (newMyReels) {
                                    mutateMyReels(newMyReels, false);
                                    setMyStories(newMyReels);
                                }
                            });
                        }
                        setShowUploadModal(false);
                    }, 2000);
                }
                setProcessingProgress(processing);
            }, 500);

        } catch (error) {
            console.error('Error uploading video:', error);
            Alert.alert('Error', 'Error: ' + error.message);
            setUploadStatus('error');
        } finally {
            setUploading(false);
        }
    };

    // Eliminar un reel
    const handleDeleteReel = async (reelId) => {
        if (!user) return;

        try {
            const response = await apiCall(`https://api.minymol.com/reels/${reelId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Actualizar la lista de mis historias en el caché
                const updatedMyStories = myStories.filter(reel => reel.id !== reelId);
                setMyStories(updatedMyStories);
                
                // Actualizar caché de mis reels
                if (myReelsCacheKey) {
                    mutateMyReels(updatedMyStories, false);
                }

                // Si estamos viendo las historias y eliminamos el reel actual, cerrar el modal
                if (selectedProvider && selectedProvider.provider.id === user.uid) {
                    const updatedReels = selectedProvider.reels.filter(reel => reel.id !== reelId);
                    if (updatedReels.length === 0) {
                        setShowStories(false);
                        setSelectedProvider(null);
                    } else {
                        // Actualizar la lista de reels en el provider seleccionado
                        setSelectedProvider(prev => ({
                            ...prev,
                            reels: updatedReels,
                            totalReels: updatedReels.length
                        }));
                    }
                }

                // Actualizar el caché de proveedores eliminando el reel
                if (providers) {
                    const updatedProviders = providers.map(provider => {
                        if (provider.provider.id === user.uid) {
                            const filteredReels = provider.reels.filter(reel => reel.id !== reelId);
                            return {
                                ...provider,
                                reels: filteredReels,
                                totalReels: filteredReels.length
                            };
                        }
                        return provider;
                    }).filter(provider => provider.reels.length > 0); // Remover providers sin reels
                    
                    mutateProviders(updatedProviders, true); // Revalidar después de actualizar
                }
            } else {
                throw new Error('Error al eliminar el reel');
            }
        } catch (error) {
            console.error('Error eliminando reel:', error);
            Alert.alert('Error', 'Error al eliminar el reel. Intenta nuevamente.');
        }
    };

    // Verificar si el usuario es dueño del provider actual
    const checkIsOwner = useCallback(async (provider) => {
        if (!user || !provider) return false;
        
        try {
            const usuario = await AsyncStorage.getItem('usuario');
            if (!usuario) return false;
            
            const userData = JSON.parse(usuario);
            return provider.provider.id === userData?.proveedorInfo?.id;
        } catch {
            return false;
        }
    }, [user?.uid]); // Solo depender del uid del usuario

    const [currentIsOwner, setCurrentIsOwner] = useState(false);

    // Actualizar isOwner cuando cambie el provider seleccionado o el usuario
    useEffect(() => {
        if (selectedProvider && user) {
            checkIsOwner(selectedProvider).then(setCurrentIsOwner);
        } else {
            setCurrentIsOwner(false);
        }
    }, [selectedProvider, user?.uid, checkIsOwner]);

    const openProviderStories = (provider) => {
        setSelectedProvider(provider);
        setShowStories(true);
    };

    const openMyStories = () => {
        if (myStories.length > 0) {
            // Usar el provider ID del primer reel (todos deberían tener el mismo provider)
            const firstReel = myStories[0];
            const myProvider = {
                provider: {
                    id: firstReel.provider?.id || user.uid,
                    nombre_empresa: firstReel.provider?.nombre_empresa || 'Mis historias',
                    logo_url: firstReel.provider?.logo_url || user.photoURL || '/logo192.png'
                },
                reels: myStories,
                totalReels: myStories.length
            };
            setSelectedProvider(myProvider);
            setShowStories(true);
        }
    };

    // Mostrar loading solo si no hay caché y está cargando
    const shouldShowLoading = loading && !hasCache && authLoading;
    
    if (shouldShowLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fa7e17" />
            </View>
        );
    }

    // No mostrar nada si no hay reels y el usuario no es proveedor
    if ((!providers || providers.length === 0) && (!user || !isProvider)) {
        return null; // El callback onEmpty se maneja en useEffect
    }

    return (
        <View style={styles.container}>
            {/* Indicador sutil de actualización en background */}
            {isRefreshing && (
                <View style={styles.refreshIndicator}>
                    <Text style={styles.refreshText}>⟳</Text>
                </View>
            )}
            
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContainer}
                style={styles.scrollView}
            >
                {/* Mis historias (solo si tengo historias) */}
                {user && myStories.length > 0 && (
                    <TouchableOpacity
                        style={styles.storyItem}
                        onPress={openMyStories}
                        activeOpacity={0.8}
                    >
                        <View style={styles.storyThumbnail}>
                            <Image
                                source={{
                                    uri: myStories[0]?.thumbnailUrl || myStories[0]?.provider?.logo_url || 'https://via.placeholder.com/100x140'
                                }}
                                style={styles.thumbnailImage}
                                resizeMode="cover"
                            />
                            
                            {/* Overlay gradient */}
                            <View style={styles.overlayGradient} />
                            
                            {/* Provider info at bottom */}
                            <View style={styles.providerInfo}>
                                <Image
                                    source={{
                                        uri: myStories[0]?.provider?.logo_url || user?.photoURL || 'https://via.placeholder.com/20'
                                    }}
                                    style={styles.providerAvatar}
                                />
                                <Text style={styles.providerName} numberOfLines={1}>
                                    Mis historias
                                </Text>
                            </View>
                            
                            {/* Story count badge */}
                            <View style={styles.storyCount}>
                                <Text style={styles.countText}>{myStories.length}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Lista de providers con reels */}
                {Array.isArray(providers) && providers.length > 0 &&
                    providers
                        .filter((providerData) => {
                            // Excluir mis historias del listado general
                            if (!user || !myStories.length > 0) return true;
                            return providerData.provider.id !== myStories[0]?.provider?.id;
                        })
                        .map((providerData) => (
                            <TouchableOpacity
                                key={providerData.provider.id}
                                style={styles.storyItem}
                                onPress={() => openProviderStories(providerData)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.storyThumbnail}>
                                    <Image
                                        source={{
                                            uri: providerData.reels[0]?.thumbnailUrl || providerData.provider.logo_url || 'https://via.placeholder.com/100x140'
                                        }}
                                        style={styles.thumbnailImage}
                                        resizeMode="cover"
                                    />
                                    
                                    {/* Overlay gradient */}
                                    <View style={styles.overlayGradient} />
                                    
                                    {/* Provider info at bottom */}
                                    <View style={styles.providerInfo}>
                                        <Image
                                            source={{
                                                uri: providerData.provider.logo_url || 'https://via.placeholder.com/20'
                                            }}
                                            style={styles.providerAvatar}
                                        />
                                        <Text style={styles.providerName} numberOfLines={1}>
                                            {providerData.provider.nombre_empresa}
                                        </Text>
                                    </View>
                                    
                                    {/* Story count badge */}
                                    <View style={styles.storyCount}>
                                        <Text style={styles.countText}>{providerData.totalReels}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                }

                {(!Array.isArray(providers) || providers.length === 0) && !user && (
                    <View style={styles.noReelsContainer}>
                        <Text style={styles.noReelsText}>No hay historias disponibles aún</Text>
                    </View>
                )}
            </ScrollView>

            {/* Modal de upload */}
            {showUploadModal && (
                <UploadVideoModal
                    visible={showUploadModal}
                    onClose={() => {
                        setShowUploadModal(false);
                        setUploadStatus('idle');
                        setUploadProgress(0);
                        setProcessingProgress(0);
                    }}
                    onUpload={handleVideoUpload}
                    uploading={uploading}
                    uploadProgress={uploadProgress}
                    processingProgress={processingProgress}
                    uploadStatus={uploadStatus}
                />
            )}

            {/* Modal de historias */}
            {showStories && selectedProvider && (
                <ProviderStories
                    visible={showStories}
                    provider={selectedProvider}
                    onClose={() => {
                        setShowStories(false);
                        setSelectedProvider(null);
                    }}
                    isOwner={currentIsOwner}
                    onDeleteReel={(reel) => handleDeleteReel(reel.id)}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        paddingVertical: 15,
    },
    refreshIndicator: {
        position: 'absolute',
        top: 5,
        right: 16,
        zIndex: 10,
        backgroundColor: 'rgba(250, 126, 23, 0.1)',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    refreshText: {
        fontSize: 12,
        color: '#fa7e17',
        fontFamily: getUbuntuFont('medium'),
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
        minHeight: 120,
    },
    header: {
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        color: '#333',
        textAlign: 'left',
    },
    scrollView: {
        paddingLeft: 16,
    },
    scrollContainer: {
        paddingRight: 16,
        alignItems: 'flex-start',
    },
    storyItem: {
        alignItems: 'center',
        marginRight: STORY_MARGIN,
        width: STORY_WIDTH,
    },
    storyThumbnail: {
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
        borderRadius: 12,
        backgroundColor: '#f0f0f0',
        position: 'relative',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    addStoryThumbnail: {
        borderWidth: 2,
        borderColor: '#ddd',
        borderStyle: 'dashed',
        backgroundColor: '#f8f8f8',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addStoryContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    addStoryCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#fa7e17',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    addStoryText: {
        fontSize: 12,
        color: '#666',
        fontFamily: getUbuntuFont('medium'),
        textAlign: 'center',
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
    },
    overlayGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    providerInfo: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        right: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    providerAvatar: {
        width: 20,
        height: 20,
        borderRadius: 10,
        marginRight: 6,
        borderWidth: 1,
        borderColor: 'white',
    },
    providerName: {
        fontSize: 11,
        color: 'white',
        fontFamily: getUbuntuFont('medium'),
        flex: 1,
    },
    storyCount: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#fa7e17',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    countText: {
        fontSize: 10,
        color: 'white',
        fontFamily: getUbuntuFont('bold'),
        textAlign: 'center',
    },
    noReelsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    noReelsText: {
        fontSize: 14,
        color: '#888',
        fontFamily: getUbuntuFont('regular'),
        textAlign: 'center',
    },
});

export default Reels;