import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import i18next from 'i18next';

const MySwal = withReactContent(Swal);

export const useSweetAlert = () => {
    const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, text?: string) => {
        return MySwal.fire({
            title,
            text,
            icon: type,
            confirmButtonColor: type === 'error' ? '#EF4444' : type === 'warning' ? '#F59E0B' : '#3B82F6',
            confirmButtonText: i18next.t('common.confirm') || i18next.t('common.ok') || 'OK',
            timer: type === 'success' ? 1500 : undefined,
            showConfirmButton: type !== 'success',
            customClass: {
                popup: 'rounded-2xl shadow-xl',
                title: 'text-lg font-semibold',
                confirmButton: 'px-6 py-2 rounded-lg font-medium',
            },
            backdrop: true,
            allowEscapeKey: true,
            allowOutsideClick: true,
            zIndex: 99999,
            didOpen: (popup: HTMLElement) => {
                popup.style.zIndex = '99999';
                const container = popup.closest('.swal2-container');
                if (container) (container as HTMLElement).style.zIndex = '99999';
            },
        } as any);
    };

    const confirm = async (title: string, text: string, confirmText?: string) => {
        const result = await MySwal.fire({
            title,
            text,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: confirmText || i18next.t('common.yes_confirm') || 'Yes, confirm',
            cancelButtonText: i18next.t('common.cancel') || 'Cancel'
        });
        return result.isConfirmed;
    };

    const toast = (title: string, icon: 'success' | 'error' | 'warning' | 'info' = 'success') => {
        MySwal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', MySwal.stopTimer);
                toast.addEventListener('mouseleave', MySwal.resumeTimer);
            }
        }).fire({
            icon,
            title
        });
    };

    return {
        success: (title: string, text?: string) => showAlert('success', title, text),
        error: (title: string, text?: string) => showAlert('error', title, text),
        warning: (title: string, text?: string) => showAlert('warning', title, text),
        info: (title: string, text?: string) => showAlert('info', title, text),
        confirm,
        toast
    };
};
