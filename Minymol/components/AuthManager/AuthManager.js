import { useEffect, useState } from 'react';
import LoginModal from '../LoginModal';
import RegisterModal from '../RegisterModal';

const AuthManager = ({
    showLogin = false,
    showRegister = false,
    onClose,
    onAuthSuccess
}) => {
    const [currentModal, setCurrentModal] = useState(null);

    // Efecto para manejar cambios en las props
    useEffect(() => {
        if (showLogin && !currentModal) {
            setCurrentModal('login');
        } else if (showRegister && !currentModal) {
            setCurrentModal('register');
        }
    }, [showLogin, showRegister]);

    const handleCloseAll = () => {
        setCurrentModal(null);
        onClose();
    };

    const handleOpenLogin = () => {
        setCurrentModal('login');
    };

    const handleOpenRegister = () => {
        setCurrentModal('register');
    };

    const handleAuthSuccess = (userData, token) => {
        setCurrentModal(null);
        onAuthSuccess(userData, token);
    };

    return (
        <>
            <LoginModal
                visible={currentModal === 'login'}
                onClose={handleCloseAll}
                onLoginSuccess={handleAuthSuccess}
                onOpenRegister={handleOpenRegister}
            />

            <RegisterModal
                visible={currentModal === 'register'}
                onClose={handleCloseAll}
                onRegisterSuccess={handleAuthSuccess}
                onOpenLogin={handleOpenLogin}
            />
        </>
    );
};

export default AuthManager;
