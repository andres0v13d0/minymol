import { Dimensions, StyleSheet, View } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

const ProductsSkeleton = () => {
    const renderSkeletonItem = (index) => (
        <View key={index} style={styles.skeletonItem}>
            <View style={styles.skeletonImage} />
            <View style={styles.skeletonText} />
            <View style={styles.skeletonPrice} />
        </View>
    );

    return (
        <View style={styles.container}>
            {Array.from({ length: 6 }, (_, index) => renderSkeletonItem(index))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 10,
        justifyContent: 'space-between',
    },
    skeletonItem: {
        width: (screenWidth - 30) / 2,
        marginBottom: 15,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        padding: 10,
    },
    skeletonImage: {
        width: '100%',
        height: 120,
        backgroundColor: '#e0e0e0',
        borderRadius: 6,
        marginBottom: 8,
    },
    skeletonText: {
        width: '80%',
        height: 14,
        backgroundColor: '#e0e0e0',
        borderRadius: 4,
        marginBottom: 6,
    },
    skeletonPrice: {
        width: '60%',
        height: 12,
        backgroundColor: '#e0e0e0',
        borderRadius: 4,
    },
});

export default ProductsSkeleton;