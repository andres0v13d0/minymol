import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUbuntuFont } from '../../utils/fonts';

const CustomPicker = ({
    selectedValue,
    onValueChange,
    items,
    placeholder = "Seleccionar...",
    disabled = false,
    error = false
}) => {
    const [isVisible, setIsVisible] = useState(false);

    const selectedItem = items.find(item => item.value === selectedValue);
    const displayText = selectedItem ? selectedItem.label : placeholder;

    const handleSelect = (value) => {
        onValueChange(value);
        setIsVisible(false);
    };

    return (
        <>
            <TouchableOpacity
                style={[
                    styles.pickerButton,
                    error && styles.pickerButtonError,
                    disabled && styles.pickerButtonDisabled
                ]}
                onPress={() => !disabled && setIsVisible(true)}
                activeOpacity={0.7}
            >
                <Text style={[
                    styles.pickerText,
                    !selectedItem && styles.placeholderText,
                    disabled && styles.disabledText
                ]}>
                    {displayText}
                </Text>
                <Ionicons
                    name="chevron-down"
                    size={20}
                    color={disabled ? "#ccc" : "#666"}
                />
            </TouchableOpacity>

            <Modal
                visible={isVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
                            {/* Header */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {placeholder}
                                </Text>
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={() => setIsVisible(false)}
                                >
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>

                            {/* Lista de opciones */}
                            <FlatList
                                data={items}
                                keyExtractor={(item) => item.value.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.option,
                                            selectedValue === item.value && styles.selectedOption
                                        ]}
                                        onPress={() => handleSelect(item.value)}
                                    >
                                        <Text style={[
                                            styles.optionText,
                                            selectedValue === item.value && styles.selectedOptionText
                                        ]}>
                                            {item.label}
                                        </Text>
                                        {selectedValue === item.value && (
                                            <Ionicons
                                                name="checkmark"
                                                size={20}
                                                color="#fa7e17"
                                            />
                                        )}
                                    </TouchableOpacity>
                                )}
                                showsVerticalScrollIndicator={false}
                            />
                        </SafeAreaView>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 2,
        borderColor: '#e8e8e8',
        borderRadius: 16,
        backgroundColor: '#fafafa',
        paddingHorizontal: 16,
        paddingVertical: 16,
        minHeight: 56,
    },
    pickerButtonError: {
        borderColor: '#ff4757',
        backgroundColor: '#fff5f5',
    },
    pickerButtonDisabled: {
        backgroundColor: '#f0f0f0',
        borderColor: '#ddd',
    },
    pickerText: {
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: '#333',
        flex: 1,
    },
    placeholderText: {
        color: '#aaa',
    },
    disabledText: {
        color: '#999',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
        minHeight: '50%',
    },
    safeArea: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: getUbuntuFont('bold'),
        color: '#14144b',
        flex: 1,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f8f8f8',
        justifyContent: 'center',
        alignItems: 'center',
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f8f8f8',
    },
    selectedOption: {
        backgroundColor: '#fff3e6',
    },
    optionText: {
        fontSize: 16,
        fontFamily: getUbuntuFont('regular'),
        color: '#333',
        flex: 1,
    },
    selectedOptionText: {
        color: '#fa7e17',
        fontFamily: getUbuntuFont('medium'),
    },
});

export default CustomPicker;
