'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Bot,
  Plus,
  Trash2,
  Pencil,
  X,
  Instagram,
  MessageCircle,
  Zap,
  Search,
  Type,
  ArrowRight,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  LogOut,
  ExternalLink,
  Link2,
  RefreshCw,
  MessageSquare,
  Image as ImageIcon,
  ChevronLeft,
  MessageSquareDot,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

// ── Types ───────────────────────────────────────────────────────────────────

type MatchType = 'exact' | 'contains' | 'starts_with';
export type TriggerType = 'dm' | 'comment_specific';

type AutomationMode = 'inbox_dm' | 'comment_reply';

type AutoDMRule = {
  id: string;
  creator_id: string;
  keyword: string;
  match_type: MatchType;
  trigger_type?: TriggerType;
  media_id?: string;
  media_url?: string;
  reply: string;
  enabled: boolean;
  created_at: any;
};

type InstagramAccount = {
  uid: string;
  ig_user_id: string;
  username: string;
  account_type: string;
  access_token: string;
  token_expires_at: number;
  connected_at: number;
};

// ── Config ──────────────────────────────────────────────────────────────────

const MATCH_TYPE_CONFIG: Record<
  MatchType,
  { label: string; icon: React.ElementType; description: string; color: string }
> = {
  exact: {
    label: 'Exact Match',
    icon: Type,
    description: 'Message must be exactly this keyword',
    color: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  },
  contains: {
    label: 'Contains',
    icon: Search,
    description: 'Message contains this keyword anywhere',
    color: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  },
  starts_with: {
    label: 'Starts With',
    icon: ArrowRight,
    description: 'Message starts with this keyword',
    color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
};

const TRIGGER_TYPE_CONFIG: Record<
  TriggerType,
  { label: string; icon: React.ElementType; description: string; short: string }
> = {
  dm: {
    label: 'Direct Message',
    short: 'DM',
    icon: MessageCircle,
    description: 'When someone sends you a DM',
  },
  comment_specific: {
    label: 'Specific Post/Reel',
    short: 'Specific Post',
    icon: ImageIcon,
    description: 'When someone comments on a selected post',
  },
};

interface IGMedia {
  id: string;
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
}

const INSTAGRAM_CLIENT_ID = process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
const REDIRECT_URI = `${APP_URL}/api/instagram-auth/callback`;

// ── Sub-components ───────────────────────────────────────────────────────────

const AUTOMATION_MODE_CONFIG: Record<
  AutomationMode,
  { label: string; short: string; icon: React.ElementType; description: string; gradient: string; accent: string }
> = {
  inbox_dm: {
    label: 'Inbox DM Reply',
    short: 'DM Automation',
    icon: MessageCircle,
    description: 'Auto-reply when someone sends you a direct message containing a keyword.',
    gradient: 'from-sky-500 via-blue-600 to-indigo-600',
    accent: 'sky',
  },
  comment_reply: {
    label: 'Comment Reply',
    short: 'Comment Automation',
    icon: MessageSquareDot,
    description: 'Auto-DM users who comment a keyword on your selected posts or reels.',
    gradient: 'from-fuchsia-500 via-purple-600 to-pink-600',
    accent: 'fuchsia',
  },
};

// ── Mode Selector ─────────────────────────────────────────────────────────────

function AutomationModeSelector({ onSelect }: { onSelect: (mode: AutomationMode) => void }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2 pb-2">
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Choose the type of automation you want to set up for your Instagram account.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {(Object.entries(AUTOMATION_MODE_CONFIG) as [AutomationMode, typeof AUTOMATION_MODE_CONFIG[AutomationMode]][]).map(
          ([mode, cfg]) => (
            <button
              key={mode}
              onClick={() => onSelect(mode)}
              className={`group relative flex flex-col items-start gap-5 rounded-2xl border border-white/10 bg-card/40 backdrop-blur-xl p-6 text-left hover:border-white/20 hover:bg-card/60 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.99] overflow-hidden`}
            >
              {/* Animated gradient blob */}
              <div className={`absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-bl ${cfg.gradient} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity duration-500 pointer-events-none`} />

              <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shadow-xl ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-300`}>
                <cfg.icon className="h-7 w-7 text-white" />
              </div>

              <div className="space-y-1.5 flex-1">
                <p className="text-base font-bold tracking-tight text-foreground">{cfg.label}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{cfg.description}</p>
              </div>

              <div className={`flex items-center gap-1.5 text-xs font-semibold bg-gradient-to-r ${cfg.gradient} bg-clip-text text-transparent group-hover:gap-2.5 transition-all duration-200`}>
                Get started
                <ArrowRight className="h-3.5 w-3.5 text-purple-400 group-hover:translate-x-0.5 transition-transform duration-200" />
              </div>
            </button>
          )
        )}
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
        <Sparkles className="h-3.5 w-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          You can set up both DM and comment automations independently. Connect your Instagram once and create rules for either.
        </p>
      </div>
    </div>
  );
}

/** Gradient hero banner – reused in both states */
function HeroBanner({
  connectedAccount,
  mode,
  onBack,
}: {
  connectedAccount?: InstagramAccount | null;
  mode: AutomationMode | null;
  onBack?: () => void;
}) {
  const modeConfig = mode ? AUTOMATION_MODE_CONFIG[mode] : null;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-card/40 backdrop-blur-xl p-8 mb-8 shadow-2xl">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-fuchsia-500/5 to-orange-500/10" />
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-bl from-pink-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-gradient-to-tr from-purple-600/20 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {/* Back button when a mode is selected */}
        {mode && onBack && (
          <button
            onClick={onBack}
            className="absolute top-0 right-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-base font-semibold text-foreground bg-white/10 border border-white/20 hover:bg-white/20 hover:border-white/30 hover:scale-[1.02] active:scale-[0.98] shadow-lg transition-all duration-200 group z-10"
            aria-label="Back to mode selection"
          >
            <ChevronLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform duration-150" />
            Change mode
          </button>
        )}

        <div className="relative flex-shrink-0">
          <div className={`h-16 w-16 rounded-2xl flex items-center justify-center shadow-xl ring-1 ring-white/20 ${modeConfig ? `bg-gradient-to-br ${modeConfig.gradient}` : 'bg-gradient-to-br from-fuchsia-500 via-purple-600 to-orange-500'}`}>
            {modeConfig ? <modeConfig.icon className="h-8 w-8 text-white" /> : <Bot className="h-8 w-8 text-white" />}
          </div>
          <div className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center shadow-lg border-2 border-background">
            <Instagram className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
            {modeConfig ? modeConfig.label + ' Automation' : 'Instagram Auto DM'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-md leading-relaxed">
            {connectedAccount
              ? `Connected as @${connectedAccount.username}. Your auto-replies are active.`
              : modeConfig
              ? modeConfig.description
              : 'Engage your audience 24/7. Connect your Instagram to set up intelligent auto-replies for DMs and comments.'}
          </p>
        </div>
   
      </div>
    </div>
  );
}

/** Step indicator for the connect flow */
function StepRow({
  number,
  title,
  desc,
  done,
}: {
  number: number;
  title: string;
  desc: string;
  done?: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      <div
        className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-sm transition-all duration-300 ${done
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-primary/10 text-primary border border-primary/20'
          }`}
      >
        {done ? <CheckCircle2 className="h-4 w-4" /> : number}
      </div>
      <div className="pt-0.5">
        <p className={`text-sm font-semibold tracking-tight ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{title}</p>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ── Connect Panel ────────────────────────────────────────────────────────────

function ConnectInstagramPanel({ creatorId }: { creatorId: string }) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = () => {
    if (!INSTAGRAM_CLIENT_ID) {
      alert(
        'Instagram Client ID is not configured. Please add NEXT_PUBLIC_INSTAGRAM_CLIENT_ID to your environment variables.'
      );
      return;
    }

    setIsConnecting(true);

    const scope = [
      'instagram_business_basic',
      'instagram_business_manage_messages',
      'instagram_business_manage_comments',
    ].join(',');

    const params = new URLSearchParams({
      client_id: INSTAGRAM_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope,
      response_type: 'code',
      state: creatorId, // carry the UID through the OAuth flow
    });

    window.location.href = `https://www.instagram.com/oauth/authorize?${params.toString()}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* How it works */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: MessageCircle, title: 'Receive DM', desc: 'Someone sends you a message on Instagram' },
          { icon: Search, title: 'Match Keyword', desc: 'System checks your keyword rules instantly' },
          { icon: Zap, title: 'Auto Reply', desc: 'Sends your custom reply automatically' },
        ].map((step, i) => (
          <div
            key={i}
            className="group flex flex-col items-center text-center gap-4 rounded-2xl bg-card/30 backdrop-blur-md border border-white/5 p-6 hover:border-purple-500/30 hover:bg-card/50 hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300"
          >
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 group-hover:from-purple-500/20 group-hover:to-pink-500/20 flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110">
              <step.icon className="h-7 w-7 text-purple-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground tracking-tight">{step.title}</p>
              <p className="text-sm text-muted-foreground mt-1.5">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Setup steps */}
        <Card className="border-white/10 bg-card/40 backdrop-blur-xl shadow-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
          <CardContent className="p-8 relative">
            <h3 className="text-lg font-semibold tracking-tight mb-6 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" /> Quick Setup
            </h3>
            <div className="space-y-6">
              <StepRow
                number={1}
                title="Connect Instagram"
                desc="Securely authenticate via official OAuth"
              />
              <StepRow
                number={2}
                title="Create Rules"
                desc="Define keywords and auto-reply messages"
                done={false}
              />
              <StepRow
                number={3}
                title="Go Live"
                desc="Instantly reply to your audience 24/7"
                done={false}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Requirements note */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10"><AlertTriangle className="h-24 w-24 text-amber-500" /></div>
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0 relative z-10">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <div className="text-sm text-muted-foreground space-y-1.5 relative z-10">
              <p className="font-semibold text-amber-500 text-base">Requirements</p>
              <p className="leading-relaxed">
                Requires an <strong className="text-foreground">Instagram Professional account</strong>{' '}
                (Business or Creator) to access the messaging APIs.
              </p>
            </div>
          </div>

          {/* Connect button */}
          <div className="space-y-3">
            <Button
              size="lg"
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 hover:from-fuchsia-500 hover:via-purple-500 hover:to-pink-500 border-0 text-white shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] transition-all duration-300 h-16 rounded-xl text-base font-semibold"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  Redirecting to Instagram...
                </>
              ) : (
                <>
                  <Instagram className="mr-3 h-6 w-6" />
                  Connect Instagram Account
                </>
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Secured by Meta OAuth. We never see your password.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Media Picker ─────────────────────────────────────────────────────────────

function MediaPicker({ accessToken, selectedId, onSelect }: { accessToken: string; selectedId: string; onSelect: (m: IGMedia) => void }) {
  const [media, setMedia] = useState<IGMedia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMedia() {
      try {
        const res = await fetch(`https://graph.instagram.com/v21.0/me/media?fields=id,media_type,media_url,thumbnail_url,permalink,caption&access_token=${accessToken}&limit=12`);
        if (res.ok) {
          const data = await res.json();
          setMedia(data.data || []);
        }
      } finally {
        setLoading(false);
      }
    }
    loadMedia();
  }, [accessToken]);

  if (loading) {
    return <div className="flex justify-center p-4 border border-white/5 rounded-lg bg-background/40"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (media.length === 0) {
    return <div className="p-4 border border-white/5 rounded-lg bg-background/40 text-center text-sm text-muted-foreground">No recent posts found.</div>;
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 snap-x custom-scrollbar w-full min-w-0">
      {media.map(m => {
        const imgUrl = m.thumbnail_url || m.media_url;
        const isSelected = selectedId === m.id;
        return (
          <div 
            key={m.id} 
            onClick={() => onSelect(m)}
            title={m.caption || 'Instagram Post'}
            className={`relative flex-shrink-0 w-28 h-28 rounded-xl overflow-hidden cursor-pointer snap-start border-2 transition-all duration-300 ${isSelected ? 'border-purple-500 ring-4 ring-purple-500/20 scale-95' : 'border-white/5 hover:border-white/20 hover:scale-105'}`}
          >
            {imgUrl ? (
               <img src={imgUrl} alt="Post" className="w-full h-full object-cover" />
            ) : (
               <div className="w-full h-full bg-card/50 flex items-center justify-center"><ImageIcon className="h-6 w-6 text-muted-foreground" /></div>
            )}
            {m.media_type === 'VIDEO' && (
               <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md rounded-md p-1">
                 <Zap className="h-3 w-3 text-white" />
               </div>
            )}
            {isSelected && (
              <div className="absolute inset-0 bg-purple-500/30 backdrop-blur-[2px] flex items-center justify-center transition-all duration-300">
                <div className="bg-purple-500 text-white rounded-full p-1.5 shadow-lg scale-110 animate-in zoom-in duration-200">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Rules Manager ────────────────────────────────────────────────────────────

function RulesManager({
  creatorId,
  account,
  onDisconnect,
  mode,
}: {
  creatorId: string;
  account: InstagramAccount;
  onDisconnect: () => void;
  mode: AutomationMode;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoDMRule | null>(null);
  const [keyword, setKeyword] = useState('');
  const [matchType, setMatchType] = useState<MatchType>('contains');
  const [triggerType, setTriggerType] = useState<TriggerType>(mode === 'comment_reply' ? 'comment_specific' : 'dm');
  const [mediaId, setMediaId] = useState<string>('');
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [reply, setReply] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Firestore query — filtered by creator_id AND trigger_type matching current mode
  const rulesQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
          collection(firestore, 'instagram_rules'),
          where('creator_id', '==', creatorId),
          where('trigger_type', '==', mode === 'comment_reply' ? 'comment_specific' : 'dm'),
        )
        : null,
    [firestore, creatorId, mode]
  );
  const { data: rules, isLoading } = useCollection<AutoDMRule>(rulesQuery);

  const enabledCount = useMemo(() => rules?.filter(r => r.enabled).length ?? 0, [rules]);
  const totalCount = rules?.length ?? 0;

  const isTokenExpired = account.token_expires_at < Date.now();

  // ── Helpers ────────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setKeyword('');
    setMatchType('contains');
    setTriggerType(mode === 'comment_reply' ? 'comment_specific' : 'dm');
    setMediaId('');
    setMediaUrl('');
    setReply('');
    setEnabled(true);
    setEditingRule(null);
    setShowForm(false);
  }, [mode]);

  const openEdit = useCallback((rule: AutoDMRule) => {
    setKeyword(rule.keyword);
    setMatchType(rule.match_type || 'contains');
    setTriggerType(rule.trigger_type || 'dm');
    setMediaId(rule.media_id || '');
    setMediaUrl(rule.media_url || '');
    setReply(rule.reply);
    setEnabled(rule.enabled);
    setEditingRule(rule);
    setShowForm(true);
  }, []);

  // ── CRUD ───────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!keyword.trim() || !reply.trim()) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Keyword and reply are required.' });
      return;
    }
    if (!firestore) return;

    setIsSaving(true);
    try {
      if (editingRule) {
        await updateDoc(doc(firestore, 'instagram_rules', editingRule.id), {
          keyword: keyword.trim(),
          match_type: matchType,
          trigger_type: triggerType,
          media_id: mediaId,
          media_url: mediaUrl,
          reply: reply.trim(),
          enabled,
        });
        toast({ title: 'Rule updated', description: `"${keyword.trim()}" rule has been updated.` });
      } else {
        await addDoc(collection(firestore, 'instagram_rules'), {
          creator_id: creatorId,
          ig_user_id: account.ig_user_id,
          ig_username: account.username,
          keyword: keyword.trim(),
          match_type: matchType,
          trigger_type: triggerType,
          media_id: mediaId,
          media_url: mediaUrl,
          reply: reply.trim(),
          enabled,
          created_at: serverTimestamp(),
        });
        toast({ title: 'Rule created', description: `Auto-reply for "${keyword.trim()}" is now active.` });
      }
      resetForm();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message ?? 'Failed to save rule.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (rule: AutoDMRule) => {
    if (!firestore) return;
    setTogglingIds(prev => new Set(prev).add(rule.id));
    try {
      await updateDoc(doc(firestore, 'instagram_rules', rule.id), { enabled: !rule.enabled });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to toggle rule.' });
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(rule.id);
        return next;
      });
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'instagram_rules', ruleId));
      toast({ title: 'Rule deleted', description: 'The auto-reply rule has been removed.' });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete rule.' });
    }
  };

  const handleDisconnect = async () => {
    if (!firestore) return;
    setIsDisconnecting(true);
    try {
      await deleteDoc(doc(firestore, 'instagram_accounts', creatorId));
      toast({ title: 'Disconnected', description: 'Your Instagram account has been disconnected.' });
      onDisconnect();
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to disconnect account.' });
    } finally {
      setIsDisconnecting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
    

      {/* Stats row */}
      {totalCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
            <Zap className="h-3 w-3 mr-1" />
            {enabledCount} Active
          </Badge>
          <Badge variant="secondary" className="bg-slate-500/15 text-slate-400 border-slate-500/30">
            {totalCount} Total Rules
          </Badge>
        </div>
      )}

      {/* Add Button */}
      {!showForm && (
        <Button
          onClick={() => setShowForm(true)}
          className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 border-0 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-[1.01] transition-all"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Auto-Reply Rule
        </Button>
      )}

      {/* Create / Edit Form */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); else setShowForm(true); }}>
        <DialogContent className="w-[95vw] sm:max-w-xl sm:w-full p-4 sm:p-6 rounded-2xl border-purple-500/20 shadow-lg shadow-purple-500/5 max-h-[90vh] flex flex-col">
          <DialogHeader className="pb-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-purple-400" />
              </div>
              <DialogTitle className="text-base">
                {editingRule ? 'Edit Rule' : 'New Auto-Reply Rule'}
              </DialogTitle>
            </div>
            <DialogDescription className="sr-only">
              Configure your auto-reply settings here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2 w-full min-w-0 flex-1 overflow-y-auto custom-scrollbar px-1 pb-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="auto-dm-keyword" className="text-sm font-medium">
                  Keyword
                </Label>
                <Input
                  id="auto-dm-keyword"
                  placeholder="e.g. price, collab, info"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  className="bg-background/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auto-dm-match-type" className="text-sm font-medium">
                  Match Type
                </Label>
                <Select value={matchType} onValueChange={v => setMatchType(v as MatchType)}>
                  <SelectTrigger id="auto-dm-match-type" className="bg-background/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MATCH_TYPE_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <cfg.icon className="h-3.5 w-3.5" />
                          {cfg.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{(MATCH_TYPE_CONFIG[matchType] || MATCH_TYPE_CONFIG.contains).description}</p>
              </div>
            </div>

            {/* Trigger source is locked to the selected mode — show a read-only pill instead of a dropdown */}
            <div className="space-y-2 pt-2">
              <Label className="text-sm font-medium">Trigger Source</Label>
              <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-background/40 px-3 py-2.5">
                {React.createElement(
                  TRIGGER_TYPE_CONFIG[mode === 'comment_reply' ? 'comment_specific' : 'dm'].icon,
                  { className: 'h-4 w-4 text-purple-400 flex-shrink-0' }
                )}
                <span className="text-sm font-medium">
                  {TRIGGER_TYPE_CONFIG[mode === 'comment_reply' ? 'comment_specific' : 'dm'].label}
                </span>
                <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 border-purple-500/30 text-purple-400">
                  Locked to mode
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{TRIGGER_TYPE_CONFIG[mode === 'comment_reply' ? 'comment_specific' : 'dm'].description}</p>
            </div>

            {triggerType === 'comment_specific' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1 w-full min-w-0">
                <Label className="text-sm font-medium">Select a Post or Reel</Label>
                <MediaPicker 
                  accessToken={account.access_token} 
                  selectedId={mediaId} 
                  onSelect={(m) => {
                    setMediaId(m.id);
                    setMediaUrl(m.permalink);
                  }} 
                />
                {!mediaId && <p className="text-xs text-amber-400">Please select a post to trigger this rule.</p>}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <Label htmlFor="auto-dm-reply" className="text-sm font-medium">
                Auto Reply Message
              </Label>
              <Textarea
                id="auto-dm-reply"
                placeholder="Type the message to send automatically when the keyword matches..."
                value={reply}
                onChange={e => setReply(e.target.value)}
                className="bg-background/60 min-h-[100px] resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{reply.length}/1000</p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/5 bg-background/40 p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`h-4 w-4 ${enabled ? 'text-emerald-400' : 'text-muted-foreground'}`} />
                <Label htmlFor="auto-dm-enabled" className="text-sm font-medium cursor-pointer">
                  {enabled ? 'Rule is active' : 'Rule is paused'}
                </Label>
              </div>
              <Switch id="auto-dm-enabled" checked={enabled} onCheckedChange={setEnabled} />
            </div>

            {/* Preview */}
            {keyword.trim() && reply.trim() && (
              <div className="rounded-xl border border-purple-500/15 bg-purple-500/5 p-4 space-y-3">
                <p className="text-xs font-medium text-purple-400 uppercase tracking-wider">Preview</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={(MATCH_TYPE_CONFIG[matchType] || MATCH_TYPE_CONFIG.contains).color}>
                      {React.createElement((MATCH_TYPE_CONFIG[matchType] || MATCH_TYPE_CONFIG.contains).icon, { className: 'h-3 w-3 mr-1' })}
                      {(MATCH_TYPE_CONFIG[matchType] || MATCH_TYPE_CONFIG.contains).label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">When message</span>
                    <span className="font-medium text-purple-300">
                      {matchType === 'exact' && `is "${keyword.trim()}"`}
                      {matchType === 'contains' && `contains "${keyword.trim()}"`}
                      {matchType === 'starts_with' && `starts with "${keyword.trim()}"`}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <ArrowRight className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground whitespace-pre-wrap">{reply.trim()}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2 mt-4">
              <Button variant="outline" onClick={resetForm} className="w-full sm:flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !keyword.trim() || !reply.trim() || (triggerType === 'comment_specific' && !mediaId)}
                className="w-full sm:flex-1 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 border-0 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingRule ? (
                  'Update Rule'
                ) : (
                  'Create Rule'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rules List */}
      {isLoading ? (
        <div className="rounded-xl border border-white/8 overflow-hidden divide-y divide-white/5">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 px-4 py-4 animate-pulse">
              <div className="h-8 w-8 rounded-lg bg-muted/50 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-muted/50 rounded-md" />
                <div className="h-3 w-48 bg-muted/30 rounded" />
              </div>
              <div className="h-5 w-12 bg-muted/30 rounded-full hidden sm:block" />
              <div className="h-5 w-10 bg-muted/30 rounded-full hidden md:block" />
              <div className="h-5 w-8 bg-muted/40 rounded-full" />
              <div className="w-20" />
            </div>
          ))}
        </div>
      ) : rules && rules.length > 0 ? (
        <div className="rounded-xl border border-white/8 overflow-hidden divide-y divide-white/5 bg-background/40">
          {/* Column headers */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-white/[0.02]">
            <div className="w-8" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex-1">Keyword</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground hidden sm:block w-28 text-center">Match</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground hidden md:block w-20 text-center">Source</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground w-16 text-center">Status</span>
            <div className="w-20" />
          </div>

          {rules.map((rule, index) => {
            const mtConfig = MATCH_TYPE_CONFIG[rule.match_type] || MATCH_TYPE_CONFIG.contains;
            const tType = rule.trigger_type || 'dm';
            const trigConfig = TRIGGER_TYPE_CONFIG[tType] || TRIGGER_TYPE_CONFIG.dm;
            const isToggling = togglingIds.has(rule.id);

            return (
              <div
                key={rule.id}
                className={`group relative flex items-center gap-3 px-4 py-4 transition-all duration-200 ${
                  rule.enabled
                    ? 'hover:bg-purple-500/5'
                    : 'opacity-50 hover:opacity-70 hover:bg-white/[0.02]'
                }`}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                {/* Left accent bar */}
                <div
                  className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full transition-all duration-300 group-hover:top-0 group-hover:bottom-0 ${
                    rule.enabled ? 'bg-gradient-to-b from-fuchsia-500 to-purple-600' : 'bg-muted/40'
                  }`}
                />

                {/* Trigger source icon */}
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                    rule.enabled
                      ? 'bg-gradient-to-br from-fuchsia-500/15 to-purple-600/15 group-hover:from-fuchsia-500/25 group-hover:to-purple-600/25'
                      : 'bg-muted/30'
                  }`}
                  title={trigConfig.label}
                >
                  <trigConfig.icon
                    className={`h-4 w-4 ${rule.enabled ? 'text-purple-400' : 'text-muted-foreground'}`}
                  />
                </div>

                {/* Keyword + reply preview */}
                <div className="flex-1 min-w-0">
                  <span
                    className={`inline-block font-mono text-sm font-semibold px-2 py-0.5 rounded-md ${
                      rule.enabled
                        ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                        : 'bg-muted/30 text-muted-foreground border border-white/5'
                    }`}
                  >
                    {rule.keyword}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1 leading-relaxed">
                    <span className="text-purple-400/60 mr-1">↳</span>
                    {rule.reply}
                  </p>
                </div>

                {/* Match type badge */}
                <div className="hidden sm:flex justify-center w-28">
                  <Badge variant="outline" className={`text-[10px] px-2 py-0.5 gap-1 ${mtConfig.color}`}>
                    {React.createElement(mtConfig.icon, { className: 'h-2.5 w-2.5' })}
                    {mtConfig.label}
                  </Badge>
                </div>

                {/* Source pill */}
                <div className="hidden md:flex justify-center w-20">
                  <span className="text-[10px] text-muted-foreground bg-white/5 border border-white/8 px-2 py-0.5 rounded-full">
                    {trigConfig.short}
                  </span>
                </div>

                {/* Enable/disable toggle */}
                <div className="w-16 flex justify-center">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={() => handleToggle(rule)}
                    disabled={isToggling}
                    aria-label={`Toggle rule "${rule.keyword}"`}
                    className="scale-90"
                  />
                </div>

                {/* Row actions — appear on hover */}
                <div className="w-20 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg hover:bg-purple-500/10 hover:text-purple-400"
                    onClick={() => openEdit(rule)}
                    title="Edit rule"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-muted-foreground"
                        title="Delete rule"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Rule</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the auto-reply rule for &ldquo;{rule.keyword}&rdquo;?
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(rule.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}

          {/* List footer */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.015]">
            <span className="text-[11px] text-muted-foreground">
              {enabledCount} of {totalCount} rule{totalCount !== 1 ? 's' : ''} active
            </span>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] text-muted-foreground">
                {mode === 'comment_reply' ? 'Monitoring Comments' : 'Monitoring DMs'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        !showForm && (
          <Card className="border-dashed border-white/10">
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-fuchsia-500/10 via-purple-500/10 to-orange-500/10 flex items-center justify-center">
                  <Bot className="h-8 w-8 text-purple-400/60" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">No Auto-Reply Rules Yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                    Create your first keyword rule to automatically respond to Instagram DMs. Perfect for handling
                    FAQs, pricing inquiries, and more.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowForm(true)}
                  className="border-purple-500/20 hover:bg-purple-500/5 hover:border-purple-500/30"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Rule
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      )}

        {/* Connected Account Card */}
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 via-purple-600 to-orange-500 flex items-center justify-center flex-shrink-0">
            <Instagram className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm">@{account.username}</p>
              <Badge className="text-[10px] px-1.5 py-0 bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                <ShieldCheck className="h-2.5 w-2.5 mr-1" />
                Connected
              </Badge>
              {isTokenExpired && (
                <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/15 text-amber-400 border-amber-500/30">
                  Token Expired
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {account.account_type} · Connected{' '}
              {new Date(account.connected_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="flex-shrink-0 text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4 mr-1.5" />
                Disconnect
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect Instagram?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove your Instagram connection. Your existing rules will be preserved but no longer
                  active until you reconnect.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDisconnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Info tip */}
      {totalCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/15 bg-amber-500/5 px-4 py-3">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p className="font-medium text-amber-400">How rules are applied</p>
            <p>Rules are checked in order (oldest first). The first matching rule&apos;s reply is sent. Rules only fire for accounts authenticated via the connected Instagram above.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Root Component ───────────────────────────────────────────────────────────

interface AutoDMCardProps {
  creatorId: string;
  /** Increment this counter from the parent to force a reload after OAuth callback */
  triggerReload?: number;
}

export function AutoDMCard({ creatorId, triggerReload }: AutoDMCardProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedMode, setSelectedMode] = useState<AutomationMode | null>(null);
  const [account, setAccount] = useState<InstagramAccount | null | undefined>(undefined); // undefined = loading
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Load connected account from Firestore ──────────────────────────────
  const loadAccount = useCallback(async () => {
    if (!firestore) return;
    setFetchError(null);
    try {
      const snap = await getDoc(doc(firestore, 'instagram_accounts', creatorId));
      setAccount(snap.exists() ? (snap.data() as InstagramAccount) : null);
    } catch (err: any) {
      setFetchError(err.message);
      setAccount(null);
    }
  }, [firestore, creatorId]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount, triggerReload]);

  const handleBack = useCallback(() => setSelectedMode(null), []);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-0">
      {/* Shared hero banner */}
      <HeroBanner
        connectedAccount={account ?? null}
        mode={selectedMode}
        onBack={selectedMode ? handleBack : undefined}
      />

      {/* ── Step 0: Mode selection ── */}
      {!selectedMode && (
        <AutomationModeSelector onSelect={setSelectedMode} />
      )}

      {/* ── Step 1+: Mode selected ── */}
      {selectedMode && (
        <>
          {/* Loading */}
          {account === undefined && (
            <Card className="border-white/5">
              <CardContent className="p-8 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {fetchError && (
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">{fetchError}</p>
                <Button size="sm" variant="outline" onClick={loadAccount} className="ml-auto">
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Not connected → show connect panel */}
          {account === null && !fetchError && (
            <ConnectInstagramPanel creatorId={creatorId} />
          )}

          {/* Connected → show rules manager */}
          {account && !fetchError && (
            <RulesManager
              key={selectedMode}
              creatorId={creatorId}
              account={account}
              mode={selectedMode}
              onDisconnect={() => setAccount(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
