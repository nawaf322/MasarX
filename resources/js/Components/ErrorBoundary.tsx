import React from 'react';
import { Button } from "@/Components/UI/button";

interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div className="p-6 border border-red-200 rounded-lg bg-red-50 text-center">
                    <h3 className="text-red-800 font-bold mb-2">Editor Error</h3>
                    <div className="text-red-600 text-xs text-left bg-white p-2 rounded border border-red-100 mb-4 overflow-auto max-h-[200px] whitespace-pre-wrap">
                        {this.state.error instanceof Error ? this.state.error.toString() : String(this.state.error)}
                        {this.state.error instanceof Error && this.state.error.stack && (
                            <div className="mt-2 pt-2 border-t border-red-100 text-gray-500 font-mono">
                                {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                            </div>
                        )}
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => this.setState({ hasError: false })}
                        className="bg-white"
                    >
                        Try Again
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
