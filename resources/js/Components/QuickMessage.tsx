import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Button } from "@/Components/UI/button";
import { MessageCircle, X, Send, Loader2, AlertCircle, ChevronDown, ChevronUp, ArrowLeft, Paperclip, Smile } from "lucide-react";
import {
    Card, CardContent, CardFooter, CardHeader, CardTitle,
} from "@/Components/UI/card";
import { Input } from "@/Components/UI/input";
import { Avatar, AvatarFallback } from "@/Components/UI/avatar";
import { usePage } from '@inertiajs/react';
import { useTranslation } from "@/hooks/useTranslation";

interface Message {
    id: number;
    message: string;
    sender_id: number;
    recipient_id: number | null;
    sender_name: string;
    sender_avatar: string | null;
    is_mine: boolean;
    time: string;
}

interface OnlineUser {
    id: number;
    name: string;
    avatar: string | null;
    is_me: boolean;
}

interface ActiveConversation {
    userId: number;
    userName: string;
    avatar: string | null;
}

const POLL_MS      = 3000;   // poll messages every 3 s when open
const HEARTBEAT_MS = 60000;  // ping every 60 s
const UNREAD_MS    = 60000;  // poll unread every 60 s when closed
const ONLINE_MS    = 120000; // refresh online list every 2 min

const EMOJIS = ['😀','😂','😊','😍','🤔','😢','😡','👍','👎','❤️','🔥','✅','⚠️','📦','🚚','💰','🎉','👋','🙏','💪'];

function initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function playMessageSound() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        oscillator.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
    } catch {}
}

/** Parse [attachment:url] from message text */
function parseAttachment(text: string): { isAttachment: boolean; url: string; rest: string } {
    const match = text.match(/^\[attachment:(.+?)\](.*)$/s);
    if (match) return { isAttachment: true, url: match[1], rest: match[2].trim() };
    return { isAttachment: false, url: '', rest: text };
}

function isPdf(url: string): boolean {
    return url.toLowerCase().endsWith('.pdf') || url.toLowerCase().includes('.pdf?');
}

export function QuickMessage() {
    const { t }  = useTranslation();
    const { props } = usePage() as any;
    const authUser   = props?.auth?.user;

    const [isOpen,              setIsOpen]              = useState(false);
    const [showOnline,          setShowOnline]          = useState(false);
    const [messages,            setMessages]            = useState<Message[]>([]);
    const [text,                setText]                = useState('');
    const [sending,             setSending]             = useState(false);
    const [loading,             setLoading]             = useState(false);
    const [error,               setError]               = useState<string | null>(null);
    const [unread,              setUnread]              = useState(0);
    const [onlineUsers,         setOnlineUsers]         = useState<OnlineUser[]>([]);
    const [lastId,              setLastId]              = useState<number | null>(null);
    const [activeConversation,  setActiveConversation]  = useState<ActiveConversation | null>(null);
    const [showEmojiPicker,     setShowEmojiPicker]     = useState(false);
    const [attachPreview,       setAttachPreview]       = useState<{ file: File; previewUrl: string } | null>(null);
    const [uploading,           setUploading]           = useState(false);
    // Per-user unread counts for DM badge (keyed by user id)
    const [dmUnread,            setDmUnread]            = useState<Record<number, number>>({});

    const bodyRef       = useRef<HTMLDivElement>(null);
    const inputRef      = useRef<HTMLInputElement>(null);
    const fileInputRef  = useRef<HTMLInputElement>(null);
    const pollTimer     = useRef<ReturnType<typeof setInterval> | null>(null);
    const heartbeatRef  = useRef<ReturnType<typeof setInterval> | null>(null);
    const onlineTimer   = useRef<ReturnType<typeof setInterval> | null>(null);
    const isOpenRef     = useRef(isOpen);
    const lastIdRef     = useRef<number | null>(lastId);
    const activeConvRef = useRef<ActiveConversation | null>(activeConversation);

    // Keep refs in sync
    useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);
    useEffect(() => { lastIdRef.current = lastId; }, [lastId]);
    useEffect(() => { activeConvRef.current = activeConversation; }, [activeConversation]);

    const onlineCount = onlineUsers.length;

    /* ── scroll to bottom ── */
    const scrollDown = () => {
        setTimeout(() => {
            if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
        }, 50);
    };

    /* ── heartbeat: signal presence ── */
    const sendPing = useCallback(() => {
        axios.post('/chat/ping').catch(() => {});
    }, []);

    /* ── fetch online users list ── */
    const fetchOnline = useCallback(async () => {
        try {
            const res = await axios.get('/chat/online');
            const users: OnlineUser[] = res.data.users ?? [];
            setOnlineUsers(users);
            // Refresh DM unread counts for each online user (except self)
            users.filter(u => !u.is_me).forEach(async (u) => {
                try {
                    const r = await axios.get('/chat/unread', { params: { recipient_id: u.id } });
                    setDmUnread(prev => ({ ...prev, [u.id]: r.data.unread ?? 0 }));
                } catch {}
            });
        } catch { /* silent */ }
    }, []);

    /* ── load initial messages ── */
    const loadMessages = useCallback(async (conv: ActiveConversation | null = null) => {
        try {
            setLoading(true);
            setError(null);
            const params: Record<string, any> = { limit: 50 };
            if (conv) params.recipient_id = conv.userId;
            const res = await axios.get('/chat/messages', { params });
            setMessages(res.data.messages);
            setLastId(res.data.last_id);
            scrollDown();
        } catch {
            setError(t('chat.error_load'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    /* ── poll for new messages ── */
    const pollMessages = useCallback(async () => {
        if (!isOpenRef.current) return;
        const conv = activeConvRef.current;
        const currentLastId = lastIdRef.current;
        try {
            const params: Record<string, any> = { after_id: currentLastId, limit: 50 };
            if (conv) params.recipient_id = conv.userId;
            const res = await axios.get('/chat/messages', { params });
            const newMsgs: Message[] = res.data.messages;
            if (newMsgs.length > 0) {
                const myId = authUser?.id;
                const hasOtherMsg = newMsgs.some(m => m.sender_id !== myId);
                if (hasOtherMsg) playMessageSound();
                setMessages(prev => {
                    const ids = new Set(prev.map(m => m.id));
                    return [...prev, ...newMsgs.filter(m => !ids.has(m.id))];
                });
                setLastId(res.data.last_id);
                scrollDown();
            }
        } catch { /* silent */ }
    }, [authUser?.id]);

    /* ── unread badge poll (when closed) ── */
    const pollUnread = useCallback(async () => {
        if (isOpenRef.current) return;
        try {
            const res = await axios.get('/chat/unread');
            setUnread(res.data.unread ?? 0);
        } catch { /* silent */ }
    }, []);

    /* ── start heartbeat on mount, stop on unmount ── */
    useEffect(() => {
        sendPing(); // immediate ping on load
        heartbeatRef.current = setInterval(sendPing, HEARTBEAT_MS);
        // Start unread polling immediately
        pollTimer.current = setInterval(pollUnread, UNREAD_MS);
        pollUnread();
        return () => {
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
            if (pollTimer.current) clearInterval(pollTimer.current);
        };
    }, []); // eslint-disable-line

    /* ── open / close effects ── */
    useEffect(() => {
        if (isOpen) {
            setUnread(0);
            loadMessages(activeConversation);
            fetchOnline();
            axios.post('/chat/read', activeConversation ? { recipient_id: activeConversation.userId } : {}).catch(() => {});
            inputRef.current?.focus();
            if (pollTimer.current) clearInterval(pollTimer.current);
            pollTimer.current = setInterval(pollMessages, POLL_MS);
            onlineTimer.current = setInterval(fetchOnline, ONLINE_MS);
        } else {
            if (pollTimer.current)  clearInterval(pollTimer.current);
            if (onlineTimer.current) clearInterval(onlineTimer.current);
            pollTimer.current = setInterval(pollUnread, UNREAD_MS);
        }
        return () => {
            if (pollTimer.current)   clearInterval(pollTimer.current);
            if (onlineTimer.current) clearInterval(onlineTimer.current);
        };
    }, [isOpen]); // eslint-disable-line

    /* ── restart poll when lastId changes ── */
    useEffect(() => {
        if (!isOpen) return;
        if (pollTimer.current) clearInterval(pollTimer.current);
        pollTimer.current = setInterval(pollMessages, POLL_MS);
        return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
    }, [lastId, isOpen, pollMessages]);

    /* ── switch conversation ── */
    const switchConversation = useCallback((conv: ActiveConversation | null) => {
        setActiveConversation(conv);
        setMessages([]);
        setLastId(null);
        setError(null);
        setShowEmojiPicker(false);
        setAttachPreview(null);
        // Mark as read immediately
        if (isOpen) {
            axios.post('/chat/read', conv ? { recipient_id: conv.userId } : {}).catch(() => {});
            if (conv) {
                setDmUnread(prev => ({ ...prev, [conv.userId]: 0 }));
            }
            loadMessages(conv);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, loadMessages]);

    /* ── handle file selection ── */
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setError(t('chat.upload_error'));
            return;
        }
        const previewUrl = URL.createObjectURL(file);
        setAttachPreview({ file, previewUrl });
        e.target.value = '';
    };

    /* ── send message ── */
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = text.trim();
        if ((!trimmed && !attachPreview) || sending || uploading) return;

        setText('');
        setSending(true);
        setError(null);
        setShowEmojiPicker(false);

        let finalMessage = trimmed;

        // Upload attachment first if any
        if (attachPreview) {
            setUploading(true);
            try {
                const formData = new FormData();
                formData.append('file', attachPreview.file);
                const uploadRes = await axios.post('/chat/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                const url = uploadRes.data.url;
                finalMessage = `[attachment:${url}]${trimmed ? ' ' + trimmed : ''}`;
            } catch {
                setError(t('chat.upload_error'));
                setSending(false);
                setUploading(false);
                return;
            } finally {
                setUploading(false);
                URL.revokeObjectURL(attachPreview.previewUrl);
                setAttachPreview(null);
            }
        }

        if (!finalMessage.trim()) {
            setSending(false);
            return;
        }

        try {
            const payload: Record<string, any> = { message: finalMessage };
            if (activeConversation) payload.recipient_id = activeConversation.userId;
            const res = await axios.post('/chat/messages', payload);
            setMessages(prev => {
                if (prev.some(m => m.id === res.data.id)) return prev;
                return [...prev, res.data];
            });
            setLastId(res.data.id);
            scrollDown();
        } catch {
            setError(t('chat.error_send'));
            setText(trimmed);
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend(e as any);
        }
    };

    const appendEmoji = (emoji: string) => {
        setText(prev => prev + emoji);
        setShowEmojiPicker(false);
        inputRef.current?.focus();
    };

    const totalDmUnread = Object.values(dmUnread).reduce((a, b) => a + b, 0);
    const totalUnread = unread + totalDmUnread;

    return (
        <div className="fixed bottom-4 right-3 sm:bottom-6 sm:right-6 z-50">

            {/* ── Bubble button ── */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="relative h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors"
                >
                    <MessageCircle className="h-6 w-6" />
                    {totalUnread > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center px-1">
                            {totalUnread > 99 ? '99+' : totalUnread}
                        </span>
                    )}
                </button>
            )}

            {/* ── Chat window ── */}
            {isOpen && (
                <Card className="w-[min(340px,calc(100vw-1.5rem))] shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
                      style={{ height: showOnline ? '500px' : '440px' }}>

                    {/* Header */}
                    <CardHeader className="flex flex-row items-center justify-between p-4 bg-blue-600 text-white rounded-t-xl flex-shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                            {activeConversation ? (
                                // DM mode header
                                <>
                                    <button
                                        onClick={() => switchConversation(null)}
                                        className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-blue-700 transition-colors flex-shrink-0"
                                        title={t('chat.back_to_team')}
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                    </button>
                                    <div className="relative flex-shrink-0">
                                        <div className="h-8 w-8 rounded-full bg-blue-400 flex items-center justify-center text-sm font-bold border-2 border-white/20 overflow-hidden">
                                            {activeConversation.avatar
                                                ? <img src={activeConversation.avatar} alt={activeConversation.userName} className="h-8 w-8 object-cover" />
                                                : initials(activeConversation.userName)
                                            }
                                        </div>
                                        {onlineUsers.some(u => u.id === activeConversation.userId) && (
                                            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-400 border border-blue-600" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <CardTitle className="text-sm font-semibold truncate">{activeConversation.userName}</CardTitle>
                                        <span className="text-xs text-blue-100">{t('chat.direct_message')}</span>
                                    </div>
                                </>
                            ) : (
                                // Team chat header
                                <>
                                    <div className="relative flex-shrink-0">
                                        <div className="h-8 w-8 rounded-full bg-blue-400 flex items-center justify-center text-sm font-bold border-2 border-white/20">
                                            {authUser?.name ? initials(authUser.name) : 'T'}
                                        </div>
                                        <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-400 border border-blue-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-sm font-semibold">{t('chat.team_chat')}</CardTitle>
                                        <button
                                            onClick={() => setShowOnline(v => !v)}
                                            className="flex items-center gap-1 text-xs text-blue-100 hover:text-white transition-colors"
                                        >
                                            <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" />
                                            {onlineCount > 0
                                                ? t('chat.online_count', { count: onlineCount })
                                                : t('chat.no_online')}
                                            {showOnline
                                                ? <ChevronUp className="h-3 w-3" />
                                                : <ChevronDown className="h-3 w-3" />}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="h-8 w-8 rounded-md flex items-center justify-center text-white/80 hover:bg-blue-700 hover:text-white transition-colors flex-shrink-0"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </CardHeader>

                    {/* ── Online users panel (collapsible, team mode only) ── */}
                    {showOnline && !activeConversation && (
                        <div className="flex-shrink-0 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900 px-4 py-2 max-h-32 overflow-y-auto">
                            {onlineUsers.filter(u => !u.is_me).length === 0 ? (
                                <p className="text-xs text-gray-400 py-1">{t('chat.no_online')}</p>
                            ) : (
                                <div className="flex flex-col gap-1.5">
                                    {onlineUsers.filter(u => !u.is_me).map(u => (
                                        <button
                                            key={u.id}
                                            onClick={() => switchConversation({ userId: u.id, userName: u.name, avatar: u.avatar })}
                                            className="flex items-center gap-2 w-full hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded px-1 py-0.5 transition-colors text-left"
                                            title={t('chat.start_dm', { name: u.name })}
                                        >
                                            <div className="relative flex-shrink-0">
                                                <div className="h-6 w-6 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-[10px] font-semibold text-blue-700 dark:text-blue-200 overflow-hidden">
                                                    {u.avatar
                                                        ? <img src={u.avatar} alt={u.name} className="h-6 w-6 object-cover" />
                                                        : initials(u.name)
                                                    }
                                                </div>
                                                <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-green-400 border border-white" />
                                            </div>
                                            <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">{u.name}</span>
                                            {(dmUnread[u.id] ?? 0) > 0 && (
                                                <span className="h-4 min-w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                                                    {dmUnread[u.id]! > 99 ? '99+' : dmUnread[u.id]}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                    {onlineUsers.some(u => u.is_me) && (
                                        <div className="flex items-center gap-2 px-1 py-0.5 opacity-60">
                                            <div className="relative flex-shrink-0">
                                                <div className="h-6 w-6 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-[10px] font-semibold text-blue-700 dark:text-blue-200 overflow-hidden">
                                                    {onlineUsers.find(u => u.is_me)?.avatar
                                                        ? <img src={onlineUsers.find(u => u.is_me)!.avatar!} alt="" className="h-6 w-6 object-cover" />
                                                        : initials(onlineUsers.find(u => u.is_me)?.name ?? '')
                                                    }
                                                </div>
                                                <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-green-400 border border-white" />
                                            </div>
                                            <span className="text-xs text-gray-500 truncate">
                                                {onlineUsers.find(u => u.is_me)?.name}
                                                <span className="text-gray-400 ml-1">({t('chat.you')})</span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Messages */}
                    <CardContent
                        ref={bodyRef}
                        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900"
                    >
                        {loading && (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                            </div>
                        )}

                        {!loading && messages.length === 0 && (
                            <p className="text-center text-xs text-gray-400 py-8">{t('chat.empty')}</p>
                        )}

                        {error && (
                            <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded p-2 border border-red-100">
                                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        {messages.map((msg) => {
                            const { isAttachment, url, rest } = parseAttachment(msg.message);
                            return (
                                <div
                                    key={msg.id}
                                    className={`flex gap-2 ${msg.is_mine ? 'justify-end' : 'justify-start'}`}
                                >
                                    {!msg.is_mine && (
                                        <Avatar className="h-6 w-6 flex-shrink-0 mt-1">
                                            {msg.sender_avatar && (
                                                <img src={msg.sender_avatar} alt={msg.sender_name} className="h-6 w-6 rounded-full object-cover" />
                                            )}
                                            <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                                                {initials(msg.sender_name)}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div className={`max-w-[78%] ${msg.is_mine ? 'items-end' : 'items-start'} flex flex-col`}>
                                        {!msg.is_mine && (
                                            <div className="flex items-center gap-1 mb-0.5 pl-1">
                                                <span className="text-[10px] text-gray-400">{msg.sender_name}</span>
                                                {onlineUsers.some(u => u.id === msg.sender_id) && (
                                                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" title={t('chat.online')} />
                                                )}
                                            </div>
                                        )}
                                        <div className={`px-3 py-2 rounded-xl text-sm leading-snug break-words ${
                                            msg.is_mine
                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm border border-gray-100 dark:border-gray-700 rounded-tl-none'
                                        }`}>
                                            {isAttachment ? (
                                                <div className="flex flex-col gap-1">
                                                    {isPdf(url) ? (
                                                        <a href={url} target="_blank" rel="noopener noreferrer"
                                                           className="flex items-center gap-1 underline text-sm">
                                                            <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
                                                            {t('chat.click_to_open')}
                                                        </a>
                                                    ) : (
                                                        <a href={url} target="_blank" rel="noopener noreferrer">
                                                            <img src={url} alt={t('chat.attachment')}
                                                                 className="max-w-[180px] max-h-[160px] rounded-lg object-cover border border-white/20" />
                                                        </a>
                                                    )}
                                                    {rest && <span>{rest}</span>}
                                                </div>
                                            ) : (
                                                msg.message
                                            )}
                                        </div>
                                        <span className="text-[10px] text-gray-400 mt-0.5 px-1">{msg.time}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>

                    {/* Attachment preview */}
                    {attachPreview && (
                        <div className="flex-shrink-0 px-3 pb-1 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 pt-2">
                            <div className="relative inline-block">
                                {isPdf(attachPreview.file.name) ? (
                                    <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 text-xs text-gray-700 dark:text-gray-300">
                                        <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span className="truncate max-w-[160px]">{attachPreview.file.name}</span>
                                    </div>
                                ) : (
                                    <img src={attachPreview.previewUrl} alt=""
                                         className="h-14 w-14 object-cover rounded-md border border-gray-200" />
                                )}
                                <button
                                    onClick={() => { URL.revokeObjectURL(attachPreview.previewUrl); setAttachPreview(null); }}
                                    className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-gray-500 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                                >
                                    <X className="h-2.5 w-2.5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Emoji picker */}
                    {showEmojiPicker && (
                        <div className="flex-shrink-0 px-3 pb-1 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 pt-2">
                            <div className="flex flex-wrap gap-1">
                                {EMOJIS.map((emoji) => (
                                    <button
                                        key={emoji}
                                        onClick={() => appendEmoji(emoji)}
                                        className="text-lg hover:scale-125 transition-transform leading-none"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <CardFooter className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 flex-shrink-0">
                        <form className="flex w-full gap-1.5 items-center" onSubmit={handleSend}>
                            {/* Emoji button */}
                            <button
                                type="button"
                                onClick={() => setShowEmojiPicker(v => !v)}
                                title={t('chat.emoji_picker')}
                                className="h-9 w-9 rounded-md flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                            >
                                <Smile className="h-4 w-4" />
                            </button>

                            {/* Attach button */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                title={t('chat.attach_file')}
                                className="h-9 w-9 rounded-md flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                                disabled={uploading}
                            >
                                {uploading
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <Paperclip className="h-4 w-4" />
                                }
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,.pdf"
                                className="hidden"
                                onChange={handleFileChange}
                            />

                            <Input
                                ref={inputRef}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={activeConversation
                                    ? t('chat.placeholder_dm', { name: activeConversation.userName })
                                    : t('chat.placeholder')}
                                className="h-9 px-3 text-sm flex-1"
                                disabled={sending || uploading}
                                maxLength={1000}
                            />
                            <button
                                type="submit"
                                disabled={sending || uploading || (!text.trim() && !attachPreview)}
                                className="h-9 w-9 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white flex items-center justify-center flex-shrink-0 transition-colors"
                            >
                                {sending
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <Send className="h-4 w-4" />
                                }
                            </button>
                        </form>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}
