import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getUbuntuFont } from '../../utils/fonts';

const LogoMinymol = ({ onPress = null, size = 'large' }) => {
    const logoStyles = size === 'small' ? styles.logoSmall : styles.logoLarge;
    const textStyles = size === 'small' ? styles.logoTextSmall : styles.logoTextLarge;
    const dotStyles = size === 'small' ? styles.dotSmall : styles.dotLarge;

    const LogoContent = () => (
        <View style={[styles.logoContainer, logoStyles]}>
            <View style={styles.logoTextContainer}>
                <Text style={[styles.logoText, textStyles]}>
                    m<Text style={[styles.logoText, textStyles]}>i</Text>n
                    <Text style={[styles.logoText, textStyles, styles.yLetter]}>y</Text>
                    mol
                </Text>
                <Text style={[styles.dot, dotStyles]}>•</Text>
            </View>
        </View>
    );

    if (onPress) {
        return (
            <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
                <LogoContent />
            </TouchableOpacity>
        );
    }

    return <LogoContent />;
};

const styles = StyleSheet.create({
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    logoLarge: {
        paddingVertical: 20,
    },
    logoSmall: {
        paddingVertical: 10,
    },
    logoTextContainer: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        fontFamily: getUbuntuFont('bold'),
        color: '#14144b',
        includeFontPadding: false,
        margin: 0,
        padding: 0,
    },
    logoTextLarge: {
        fontSize: 50,
    },
    logoTextSmall: {
        fontSize: 32,
    },

    dot: {
        color: '#fa7e17',
        position: 'absolute',
        fontFamily: getUbuntuFont('bold'),
        includeFontPadding: false,
    },
    dotLarge: {
        fontSize: 40,
        top: -12,
        left: 25, // Posición aproximada sobre la 'i'
    },
    dotSmall: {
        fontSize: 25,
        top: -6,
        left: 27, // Posición aproximada sobre la 'i'
    },
    yLetter: {
        color: '#fa7e17',
    },
});

export default LogoMinymol;
