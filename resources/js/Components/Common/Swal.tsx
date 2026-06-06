import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export const showSuccess = (title: string, text: string = '') => {
    return MySwal.fire({
        title,
        text,
        icon: 'success',
        confirmButtonColor: '#3b82f6', // blue-600
    });
};

export const showError = (title: string, text: string = '') => {
    return MySwal.fire({
        title,
        text,
        icon: 'error',
        confirmButtonColor: '#ef4444', // red-500
    });
};

export const showConfirm = (title: string, text: string, confirmText: string = 'Yes, do it!') => {
    return MySwal.fire({
        title,
        text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: confirmText
    });
};
