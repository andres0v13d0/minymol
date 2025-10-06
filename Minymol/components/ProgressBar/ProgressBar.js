import { useEffect, useRef } from 'react';
import {
    Animated,
    StyleSheet,
    View,
} from 'react-native';

const ProgressBar = ({ currentStep, totalSteps = 4 }) => {
    const progressAnim = useRef(new Animated.Value(0)).current;
    const circleAnims = useRef(Array(totalSteps).fill(null).map(() => new Animated.Value(0))).current;

    useEffect(() => {
        // Calcular progreso (paso 1 no se muestra, así que ajustamos)
        const adjustedStep = currentStep - 1; // paso 2 = 1, paso 3 = 2, paso 4 = 3
        const progress = adjustedStep / (totalSteps - 1); // 3 segmentos máximo

        // Animar barra de progreso
        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 400,
            useNativeDriver: false,
        }).start();

        // Animar círculos
        circleAnims.forEach((anim, index) => {
            const targetValue = index < adjustedStep ? 1 : 0;
            Animated.timing(anim, {
                toValue: targetValue,
                duration: 300,
                delay: index * 100, // Efecto cascada
                useNativeDriver: true,
            }).start();
        });
    }, [currentStep]);

    if (currentStep === 1) {
        return null; // No mostrar en paso 1
    }

    return (
        <View style={styles.container}>
            <View style={styles.progressContainer}>
                {/* Línea de fondo */}
                <View style={styles.backgroundLine} />

                {/* Línea de progreso animada */}
                <Animated.View
                    style={[
                        styles.progressLine,
                        {
                            width: progressAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%'],
                            }),
                        }
                    ]}
                />

                {/* Círculos */}
                {Array(totalSteps - 1).fill(null).map((_, index) => {
                    const circleScale = circleAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.2],
                    });

                    const circleColor = circleAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: ['rgba(200, 200, 200, 1)', 'rgba(250, 126, 23, 1)'],
                    });

                    return (
                        <Animated.View
                            key={index}
                            style={[
                                styles.circle,
                                {
                                    left: `${(index / (totalSteps - 2)) * 100}%`,
                                    backgroundColor: circleColor,
                                    transform: [{ scale: circleScale }],
                                }
                            ]}
                        >
                            <Animated.View
                                style={[
                                    styles.innerCircle,
                                    {
                                        opacity: circleAnims[index],
                                    }
                                ]}
                            />
                        </Animated.View>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 40,
        paddingVertical: 20,
        alignItems: 'center',
    },
    progressContainer: {
        width: '100%',
        height: 4,
        position: 'relative',
        justifyContent: 'center',
    },
    backgroundLine: {
        position: 'absolute',
        width: '100%',
        height: 4,
        backgroundColor: '#e8e8e8',
        borderRadius: 2,
    },
    progressLine: {
        position: 'absolute',
        height: 4,
        backgroundColor: '#fa7e17',
        borderRadius: 2,
        shadowColor: '#fa7e17',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    circle: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 8,
        marginLeft: -8, // Centrar círculo
        marginTop: -6, // Centrar verticalmente
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    innerCircle: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'white',
        margin: 4,
    },
});

export default ProgressBar;
