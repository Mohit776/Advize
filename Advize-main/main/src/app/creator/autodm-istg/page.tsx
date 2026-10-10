'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
    MessageCircle,
    Zap,
    Bot,
    Instagram,
    Loader2,
    AlertTriangle,
    ShieldCheck,
    Plus,
    Trash2,
    ChevronRight,
    ToggleLeft,
    Mail,
    Users,
    Sparkles,
    RefreshCw,
    X,
    CheckCircle2,
    Hash,
    Send,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useFirestore } from '@/firebase';
import { useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

// ── Types ────────────────────────────────────────────────────────────────────

type TriggerType = 'comment' | 'dm' | null;

type InstagramAccount = {
    uid: string;
    ig_user_id: string;
    username: string;
    account_type: string;
    access_token: string;
    token_expires_at: number;
    connected_at: number;
};

// ── Gradient divider (matches QuickDM pink→orange) ───────────────────────────

function GradientDivider() {
    return (
        <div className="h-[3px] w-full rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-orange-400 my-1" />
    );
}

// ── Section card wrapper ──────────────────────────────────────────────────────

function SectionCard({
    icon,
    iconBg,
    title,
    description,
    badge,
    children,
    disabled,
}: {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    description: string;
    badge?: React.ReactNode;
    children?: React.ReactNode;
    disabled?: boolean;
}) {
    return (
        <div className={`transition-opacity ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <GradientDivider />
            <div className="py-5 space-y-4">
                {/* Header row */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                            {icon}
                        </div>
                        <div>
                            <p className="font-semibold text-sm">{title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                        </div>
                    </div>
                    {badge}
                </div>
                {children}
            </div>
        </div>
    );
}

// ── Trigger selector card ─────────────────────────────────────────────────────

function TriggerSelector({
    selected,
    onSelect,
}: {
    selected: TriggerType;
    onSelect: (t: TriggerType) => void;
}) {
    const options = [
        {
            type: 'comment' as TriggerType,
            icon: <MessageCircle className="h-5 w-5 text-white" />,
            bg: 'bg-gradient-to-br from-fuchsia-500 to-pink-600',
            label: 'User comments on your post or reel',
            desc: 'Auto-reply in comments and send a DM when someone uses your keyword',
        },
        {
            type: 'dm' as TriggerType,
            icon: <Send className="h-5 w-5 text-white" />,
            bg: 'bg-gradient-to-br from-purple-500 to-indigo-600',
            label: 'User sends you a DM',
            desc: 'Auto-reply when someone DMs you a specific keyword',
        },
    ];

    return (
        <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Select trigger type
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {options.map((opt) => {
                    const isSelected = selected === opt.type;
                    return (
                        <button
                            key={opt.type}
                            onClick={() => onSelect(isSelected ? null : opt.type)}
                            className={`group relative flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200 hover:scale-[1.01] ${isSelected
                                    ? 'border-fuchsia-500/50 bg-fuchsia-500/8 shadow-md shadow-fuchsia-500/10'
                                    : 'border-white/8 bg-card/60 hover:border-white/15 hover:bg-card/80'
                                }`}
                        >
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${opt.bg} shadow-lg`}>
                                {opt.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium leading-snug">{opt.label}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{opt.desc}</p>
                            </div>
                            <ChevronRight
                                className={`h-4 w-4 flex-shrink-0 transition-all duration-200 ${isSelected ? 'text-fuchsia-400 rotate-90' : 'text-muted-foreground/40 group-hover:text-muted-foreground'
                                    }`}
                            />
                            {isSelected && (
                                <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-fuchsia-400 animate-pulse" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ── Keyword pill editor ───────────────────────────────────────────────────────

function KeywordEditor({
    keywords,
    onChange,
}: {
    keywords: string[];
    onChange: (kws: string[]) => void;
}) {
    const [input, setInput] = useState('');

    const addKeyword = () => {
        const trimmed = input.trim().toLowerCase();
        if (trimmed && !keywords.includes(trimmed)) {
            onChange([...keywords, trimmed]);
        }
        setInput('');
    };

    const removeKeyword = (kw: string) => onChange(keywords.filter((k) => k !== kw));

    return (
        <div className="space-y-2">
            <Label className="text-sm font-medium">Keywords that trigger this automation</Label>
            <div className="flex gap-2">
                <Input
                    placeholder="e.g. link, price, collab"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    className="bg-background/60 text-sm h-9"
                />
                <Button
                    size="sm"
                    variant="outline"
                    onClick={addKeyword}
                    disabled={!input.trim()}
                    className="h-9 px-3 border-white/10 hover:bg-white/5"
                >
                    <Plus className="h-3.5 w-3.5" />
                </Button>
            </div>
            {keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                    {keywords.map((kw) => (
                        <span
                            key={kw}
                            className="inline-flex items-center gap-1 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-2.5 py-0.5 text-xs font-medium text-fuchsia-300"
                        >
                            <Hash className="h-2.5 w-2.5" />
                            {kw}
                            <button onClick={() => removeKeyword(kw)} className="ml-0.5 hover:text-white">
                                <X className="h-2.5 w-2.5" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <p className="text-[11px] text-muted-foreground">Press Enter or click + to add. Case-insensitive.</p>
        </div>
    );
}

// ── Trigger Detail panel (shown after trigger selected) ───────────────────────

function TriggerDetail({
    triggerType,
    keywords,
    onKeywordsChange,
    commentReplies,
    onCommentRepliesChange,
}: {
    triggerType: TriggerType;
    keywords: string[];
    onKeywordsChange: (kws: string[]) => void;
    commentReplies: string[];
    onCommentRepliesChange: (replies: string[]) => void;
}) {
    const [replyInput, setReplyInput] = useState('');

    const addReply = () => {
        const trimmed = replyInput.trim();
        if (trimmed && !commentReplies.includes(trimmed)) {
            onCommentRepliesChange([...commentReplies, trimmed]);
        }
        setReplyInput('');
    };

    if (!triggerType) return null;

    return (
        <div className="mt-4 rounded-xl border border-white/8 bg-background/40 p-4 space-y-5 animate-in slide-in-from-top-1 duration-200">
            {/* Selected trigger pill */}
            <div className="flex items-center gap-2">
                {triggerType === 'comment' ? (
                    <Badge className="bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30 text-xs">
                        <MessageCircle className="h-3 w-3 mr-1" />
                        User comments on your post or reel
                    </Badge>
                ) : (
                    <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/30 text-xs">
                        <Send className="h-3 w-3 mr-1" />
                        User sends you a DM
                    </Badge>
                )}
            </div>

            {/* Post selector — comment flow only */}
            {triggerType === 'comment' && (
                <div className="space-y-2">
                    <Label className="text-sm font-medium">Which Post or Reel?</Label>
                    <div className="rounded-lg border border-white/8 bg-card/60 px-4 py-3 text-sm text-center text-muted-foreground font-medium">
                        All Posts and Reels
                    </div>
                    <p className="text-[11px] text-muted-foreground">Specific post selection — coming soon</p>
                </div>
            )}

            {/* Keywords */}
            <KeywordEditor keywords={keywords} onChange={onKeywordsChange} />

            {/* Comment reply variants — comment flow only */}
            {triggerType === 'comment' && (
                <div className="space-y-2">
                    <Label className="text-sm font-medium">Public comment replies (rotating)</Label>
                    <div className="flex gap-2">
                        <Input
                            placeholder='e.g. "Got it, check your inbox! 📬"'
                            value={replyInput}
                            onChange={(e) => setReplyInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addReply())}
                            className="bg-background/60 text-sm h-9"
                        />
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={addReply}
                            disabled={!replyInput.trim()}
                            className="h-9 px-3 border-white/10 hover:bg-white/5"
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    {commentReplies.length > 0 && (
                        <ul className="space-y-1.5 mt-1">
                            {commentReplies.map((r, i) => (
                                <li
                                    key={i}
                                    className="flex items-center gap-2 rounded-lg border border-white/6 bg-background/40 px-3 py-2 text-sm"
                                >
                                    <span className="h-4 w-4 rounded-full bg-fuchsia-500/20 text-fuchsia-400 text-[10px] flex items-center justify-center flex-shrink-0 font-bold">
                                        {i + 1}
                                    </span>
                                    <span className="flex-1 text-muted-foreground">{r}</span>
                                    <button
                                        onClick={() => onCommentRepliesChange(commentReplies.filter((_, j) => j !== i))}
                                        className="text-muted-foreground/40 hover:text-destructive transition-colors"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                        Instagram will rotate these replies so they look organic.
                    </p>
                </div>
            )}
        </div>
    );
}

// ── Response Flow card ────────────────────────────────────────────────────────

const MAX_CARDS = 11;

type ResponseCard = {
    id: string;
    message: string;
    buttonLabel?: string;
    buttonUrl?: string;
};

function ResponseFlowSection({
    cards,
    onChange,
}: {
    cards: ResponseCard[];
    onChange: (cards: ResponseCard[]) => void;
}) {
    const addCard = () => {
        if (cards.length >= MAX_CARDS) return;
        onChange([
            ...cards,
            { id: crypto.randomUUID(), message: '', buttonLabel: '', buttonUrl: '' },
        ]);
    };

    const updateCard = (id: string, patch: Partial<ResponseCard>) => {
        onChange(cards.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    };

    const removeCard = (id: string) => onChange(cards.filter((c) => c.id !== id));

    return (
        <div className="space-y-3">
            {cards.map((card, idx) => (
                <div
                    key={card.id}
                    className="rounded-xl border border-white/8 bg-background/40 p-4 space-y-3 animate-in slide-in-from-top-1 duration-200"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {idx === 0 ? 'Welcome Message' : `Message ${idx + 1}`}
                        </span>
                        {idx > 0 && (
                            <button
                                onClick={() => removeCard(card.id)}
                                className="text-muted-foreground/40 hover:text-destructive transition-colors"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    <div className="rounded-lg border border-white/6 bg-card/60 overflow-hidden">
                        <p className="text-xs text-muted-foreground px-3 pt-2.5 pb-1 font-medium">Simple Text Message</p>
                        <Textarea
                            placeholder="Hey there! Noticed your interest and just wanted to send a quick thanks. Love having you here! 🤍"
                            value={card.message}
                            onChange={(e) => updateCard(card.id, { message: e.target.value })}
                            className="border-0 bg-transparent resize-none focus-visible:ring-0 text-sm min-h-[90px] px-3 pb-3"
                        />
                        <div className="px-3 pb-2 text-right">
                            <span className="text-[10px] text-muted-foreground">{card.message.length}/640</span>
                        </div>
                    </div>

                    {/* Optional button */}
                    <button
                        onClick={() =>
                            updateCard(card.id, {
                                buttonLabel: card.buttonLabel === undefined ? '' : undefined,
                            })
                        }
                        className="w-full rounded-lg border border-dashed border-white/10 py-2 text-xs text-muted-foreground hover:border-white/20 hover:text-foreground transition-all flex items-center justify-center gap-1.5"
                    >
                        <Plus className="h-3 w-3" />
                        {card.buttonLabel !== undefined ? 'Remove Button' : '+ Add Button (Optional)'}
                    </button>

                    {card.buttonLabel !== undefined && (
                        <div className="grid grid-cols-2 gap-2">
                            <Input
                                placeholder="Button label"
                                value={card.buttonLabel}
                                onChange={(e) => updateCard(card.id, { buttonLabel: e.target.value })}
                                className="bg-background/60 text-xs h-8"
                            />
                            <Input
                                placeholder="https://..."
                                value={card.buttonUrl}
                                onChange={(e) => updateCard(card.id, { buttonUrl: e.target.value })}
                                className="bg-background/60 text-xs h-8"
                            />
                        </div>
                    )}
                </div>
            ))}

            {cards.length < MAX_CARDS && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={addCard}
                    className="w-full border-dashed border-white/10 hover:border-white/20 text-muted-foreground hover:text-foreground text-xs h-9"
                >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add another message card
                </Button>
            )}
        </div>
    );
}

// ── Coming Soon stub ──────────────────────────────────────────────────────────

function ComingSoonToggle({
    icon,
    iconBg,
    title,
    description,
}: {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    description: string;
}) {
    return (
        <SectionCard
            icon={icon}
            iconBg={iconBg}
            title={title}
            description={description}
            badge={
                <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className="text-[10px] px-2 py-0.5 bg-slate-500/10 text-slate-400 border-slate-500/20">
                        Coming Soon
                    </Badge>
                    <Switch disabled />
                </div>
            }
            disabled
        />
    );
}

// ── Not connected panel ───────────────────────────────────────────────────────

const INSTAGRAM_CLIENT_ID = process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
const REDIRECT_URI = `${APP_URL}/api/instagram-auth/callback`;

function NotConnectedBanner({ creatorId }: { creatorId: string }) {
    const [isConnecting, setIsConnecting] = useState(false);

    const handleConnect = () => {
        if (!INSTAGRAM_CLIENT_ID) return;
        setIsConnecting(true);
        const scope = ['instagram_business_basic', 'instagram_business_manage_messages'].join(',');
        const params = new URLSearchParams({
            client_id: INSTAGRAM_CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            scope,
            response_type: 'code',
            state: creatorId,
        });
        window.location.href = `https://www.instagram.com/oauth/authorize?${params.toString()}`;
    };

    return (
        <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4 flex items-center gap-4">
                <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                <div className="flex-1">
                    <p className="text-sm font-medium text-amber-300">Instagram not connected</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Connect your Instagram Professional account to activate automations.
                    </p>
                </div>
                <Button
                    size="sm"
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="flex-shrink-0 bg-gradient-to-r from-fuchsia-600 to-purple-600 border-0 text-white text-xs"
                >
                    {isConnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
                        <><Instagram className="h-3.5 w-3.5 mr-1.5" />Connect</>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AutoDMISTGPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [account, setAccount] = useState<InstagramAccount | null | undefined>(undefined);
    const [triggerType, setTriggerType] = useState<TriggerType>(null);
    const [keywords, setKeywords] = useState<string[]>([]);
    const [commentReplies, setCommentReplies] = useState<string[]>([]);
    const [responseCards, setResponseCards] = useState<ResponseCard[]>([
        { id: 'welcome', message: '', buttonLabel: undefined },
    ]);
    const [isSaving, setIsSaving] = useState(false);

    // Load IG account
    const loadAccount = useCallback(async () => {
        if (!firestore || !user) return;
        try {
            const snap = await getDoc(doc(firestore, 'instagram_accounts', user.uid));
            setAccount(snap.exists() ? (snap.data() as InstagramAccount) : null);
        } catch {
            setAccount(null);
        }
    }, [firestore, user]);

    useEffect(() => {
        loadAccount();
    }, [loadAccount]);

    const handleSave = async () => {
        if (!triggerType) {
            toast({ variant: 'destructive', title: 'Select a trigger type first' });
            return;
        }
        if (keywords.length === 0) {
            toast({ variant: 'destructive', title: 'Add at least one keyword' });
            return;
        }
        setIsSaving(true);
        // TODO: wire to Firestore automations collection
        await new Promise((r) => setTimeout(r, 800));
        setIsSaving(false);
        toast({ title: 'Automation saved', description: 'Your Auto DM automation is now active.' });
    };

    const cardsUsed = responseCards.length;

    return (
        <div className="max-w-2xl mx-auto w-full space-y-6 pb-10">
            {/* Page header */}
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-fuchsia-500 via-purple-600 to-orange-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                        <Bot className="h-4.5 w-4.5 text-white" style={{ height: '1.125rem', width: '1.125rem' }} />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">Auto DM Automation</h1>
                </div>
                <p className="text-sm text-muted-foreground ml-12">
                    Set up keyword-triggered DM flows for Instagram comments and messages.
                </p>
            </div>

            {/* IG connection status */}
            {account === undefined && (
                <Card className="border-white/5">
                    <CardContent className="p-4 flex items-center gap-3">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Checking Instagram connection…</p>
                    </CardContent>
                </Card>
            )}
            {account === null && user && <NotConnectedBanner creatorId={user.uid} />}
            {account && (
                <Card className="border-emerald-500/20 bg-emerald-500/5">
                    <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-pink-500 via-purple-600 to-orange-500 flex items-center justify-center flex-shrink-0">
                            <Instagram className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">@{account.username}</p>
                            <p className="text-[11px] text-muted-foreground">{account.account_type}</p>
                        </div>
                        <Badge className="text-[10px] px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                            <ShieldCheck className="h-2.5 w-2.5 mr-1" />
                            Connected
                        </Badge>
                    </CardContent>
                </Card>
            )}

            {/* Main automation builder card */}
            <Card className="border-white/8 shadow-xl shadow-black/20">
                {/* Top bar — breadcrumb + save */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/6">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>Automation</span>
                        <ChevronRight className="h-3 w-3" />
                        <span className="text-foreground font-medium">Untitled</span>
                    </div>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving || !triggerType}
                        className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 border-0 text-white text-xs h-8 px-4 shadow-md shadow-purple-500/20"
                    >
                        {isSaving ? (
                            <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />Saving…</>
                        ) : (
                            <><Sparkles className="mr-1.5 h-3 w-3" />Save Automation</>
                        )}
                    </Button>
                </div>

                <CardContent className="p-5 space-y-0">

                    {/* ── 1. Trigger Configuration ────────────────────────────────── */}
                    <SectionCard
                        icon={<Zap className="h-5 w-5 text-white" />}
                        iconBg="bg-gradient-to-br from-fuchsia-500 to-orange-500"
                        title="Trigger Configuration"
                        description="Choose an event that will start the automation flow"
                    >
                        <TriggerSelector selected={triggerType} onSelect={setTriggerType} />
                        <TriggerDetail
                            triggerType={triggerType}
                            keywords={keywords}
                            onKeywordsChange={setKeywords}
                            commentReplies={commentReplies}
                            onCommentRepliesChange={setCommentReplies}
                        />
                    </SectionCard>

                    {/* ── 2. Follow Gate (stub) ────────────────────────────────────── */}
                    <ComingSoonToggle
                        icon={<Users className="h-5 w-5 text-white" />}
                        iconBg="bg-gradient-to-br from-pink-500 to-fuchsia-600"
                        title="Follow Gate"
                        description="Require users to follow you before they can access your automation"
                    />

                    {/* ── 3. Lead Gate (stub) ─────────────────────────────────────── */}
                    <ComingSoonToggle
                        icon={<Mail className="h-5 w-5 text-white" />}
                        iconBg="bg-gradient-to-br from-orange-500 to-pink-500"
                        title="Lead Gate"
                        description="Collect email before sending the link — free plan limited to 100 leads"
                    />

                    {/* ── 4. Response Flow ─────────────────────────────────────────── */}
                    <SectionCard
                        icon={
                            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-white">
                                <rect x="2" y="4" width="16" height="3" rx="1.5" fill="currentColor" opacity=".9" />
                                <rect x="2" y="9" width="11" height="3" rx="1.5" fill="currentColor" opacity=".7" />
                                <rect x="2" y="14" width="7" height="3" rx="1.5" fill="currentColor" opacity=".5" />
                            </svg>
                        }
                        iconBg="bg-gradient-to-br from-purple-500 to-indigo-600"
                        title="Response Flow"
                        description="Configure automated DM responses"
                        badge={
                            <div className="flex-shrink-0 text-right">
                                <p className="text-sm font-bold">{cardsUsed}/{MAX_CARDS}</p>
                                <p className="text-[10px] text-muted-foreground">Cards used</p>
                            </div>
                        }
                    >
                        <ResponseFlowSection cards={responseCards} onChange={setResponseCards} />
                    </SectionCard>

                    {/* bottom padding */}
                    <GradientDivider />
                </CardContent>
            </Card>
        </div>
    );
}
