import { useEffect, useState } from 'react';
import ForgotPasswordModal from '../ForgotPasswordModal';
import LoginModal from '../LoginModal';
import RegisterModal from '../RegisterModal';

const AuthManager = ({
    showLogin = false,
    showRegister = false,
    showForgotPassword = false,
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
        } else if (showForgotPassword && !currentModal) {
            setCurrentModal('forgotPassword');
        }
    }, [showLogin, showRegister, showForgotPassword]);

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

    const handleOpenForgotPassword = () => {
        setCurrentModal('forgotPassword');
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
                onOpenForgotPassword={handleOpenForgotPassword}
            />

            <RegisterModal
                visible={currentModal === 'register'}
                onClose={handleCloseAll}
                onRegisterSuccess={handleAuthSuccess}
                onOpenLogin={handleOpenLogin}
            />

            <ForgotPasswordModal
                visible={currentModal === 'forgotPassword'}
                onClose={handleCloseAll}
                onOpenLogin={handleOpenLogin}
            />
        </>
    );
};

export default AuthManager;
