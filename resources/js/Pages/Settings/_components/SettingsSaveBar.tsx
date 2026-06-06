import { Button } from "@/Components/UI/button";
import { cn } from "@/lib/utils";

interface SettingsSaveBarProps {
    processing: boolean;
    isDirty?: boolean;
    onSave?: () => void;
    onCancel?: () => void;
    className?: string;
}

export function SettingsSaveBar({
    processing,
    isDirty = true,
    onSave,
    onCancel,
    className
}: SettingsSaveBarProps) {
    return (
        <div className={cn("flex justify-end items-center gap-3 pt-6 border-t border-gray-100", className)}>
            {onCancel && (
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    disabled={processing}
                >
                    Cancel
                </Button>
            )}

            <Button
                type="submit"
                onClick={onSave} // Optional if type submit in form
                disabled={processing || !isDirty}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all"
            >
                {processing ? (
                    <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                    </span>
                ) : (
                    'Save Changes'
                )}
            </Button>
        </div>
    );
}
