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

/** Gradient hero banner – reused in both states */
function HeroBanner({ connectedAccount }: { connectedAccount?: InstagramAccount | null }) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-6 mb-6">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600/25 via-purple-600/20 to-orange-500/15" />
      <div className="absolute top-0 right-0 w-56 h-56 bg-gradient-to-bl from-pink-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-purple-600/10 to-transparent rounded-full blur-2xl pointer-events-none" />

      <div className="relative flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-fuchsia-500 via-purple-600 to-orange-500 flex items-center justify-center shadow-xl shadow-purple-500/30">
            <Bot className="h-7 w-7 text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center shadow-md">
            <Instagram className="h-2.5 w-2.5 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold tracking-tight">Instagram Auto DM</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {connectedAccount
              ? `Connected as @${connectedAccount.username}`
              : 'Connect your Instagram to enable auto-replies'}
          </p>
        </div>
        {connectedAccount && (
          <Badge className="flex-shrink-0 bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hidden sm:flex">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Authenticated
          </Badge>
        )}
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
    <div className="flex items-start gap-3">
      <div
        className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5 transition-colors ${done
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
          }`}
      >
        {done ? '✓' : number}
      </div>
      <div>
        <p className={`text-sm font-medium ${done ? 'line-through text-muted-foreground' : ''}`}>{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
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
    <div className="space-y-6">
      {/* How it works */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: MessageCircle, title: 'Receive DM', desc: 'Someone sends you a message on Instagram' },
          { icon: Search, title: 'Match Keyword', desc: 'System checks your keyword rules instantly' },
          { icon: Zap, title: 'Auto Reply', desc: 'Sends your custom reply automatically' },
        ].map((step, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-xl bg-background/60 backdrop-blur-sm border border-white/5 p-3 hover:border-purple-500/20 hover:bg-background/80 transition-all"
          >
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <step.icon className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium">{step.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Setup steps */}
      <Card className="border-purple-500/15 bg-purple-500/5">
        <CardContent className="p-5 space-y-4">
          <p className="text-sm font-semibold text-purple-300">Setup Steps</p>
          <div className="space-y-4">
            <StepRow
              number={1}
              title="Connect your Instagram account"
              desc="Authenticate via Instagram's official OAuth — we never see your password"
            />
            <StepRow
              number={2}
              title="Create keyword rules"
              desc="Set the keywords and the messages to auto-send"
              done={false}
            />
            <StepRow
              number={3}
              title="Go live"
              desc="Your rules start matching incoming DMs immediately"
              done={false}
            />
          </div>
        </CardContent>
      </Card>

      {/* Requirements note */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-amber-400">Requirements</p>
          <p>
            Auto-DM requires an <strong className="text-foreground">Instagram Professional account</strong>{' '}
            (Business or Creator) and the{' '}
            <strong className="text-foreground">instagram_business_manage_messages</strong> & <strong className="text-foreground">instagram_business_manage_comments</strong> permissions.
          </p>
        </div>
      </div>

      {/* Connect button */}
      <Button
        size="lg"
        onClick={handleConnect}
        disabled={isConnecting}
        className="w-full bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 hover:from-fuchsia-700 hover:via-purple-700 hover:to-pink-700 border-0 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-[1.01] transition-all h-12"
      >
        {isConnecting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Redirecting to Instagram...
          </>
        ) : (
          <>
            <Instagram className="mr-2 h-5 w-5" />
            Connect Instagram Account
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        We only request permissions required for messaging. Your credentials are secured via Meta OAuth.
      </p>
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
    <div className="flex gap-3 overflow-x-auto pb-4 snap-x custom-scrollbar">
      {media.map(m => {
        const imgUrl = m.thumbnail_url || m.media_url;
        const isSelected = selectedId === m.id;
        return (
          <div 
            key={m.id} 
            onClick={() => onSelect(m)}
            title={m.caption || 'Instagram Post'}
            className={`relative flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden cursor-pointer snap-start border-2 transition-all ${isSelected ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-transparent hover:border-white/20'}`}
          >
            {imgUrl ? (
               <img src={imgUrl} alt="Post" className="w-full h-full object-cover" />
            ) : (
               <div className="w-full h-full bg-muted flex items-center justify-center"><ImageIcon className="h-6 w-6 text-muted-foreground" /></div>
            )}
            {m.media_type === 'VIDEO' && <Zap className="absolute top-1 right-1 h-4 w-4 text-white drop-shadow-md" />}
            {isSelected && (
              <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                <div className="bg-purple-500 text-white rounded-full p-1"><CheckCircle2 className="h-4 w-4" /></div>
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
}: {
  creatorId: string;
  account: InstagramAccount;
  onDisconnect: () => void;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoDMRule | null>(null);
  const [keyword, setKeyword] = useState('');
  const [matchType, setMatchType] = useState<MatchType>('contains');
  const [triggerType, setTriggerType] = useState<TriggerType>('dm');
  const [mediaId, setMediaId] = useState<string>('');
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [reply, setReply] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Firestore query — keyed by creator_id (= Firebase UID)
  const rulesQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
          collection(firestore, 'instagram_rules'),
          where('creator_id', '==', creatorId),
        )
        : null,
    [firestore, creatorId]
  );
  const { data: rules, isLoading } = useCollection<AutoDMRule>(rulesQuery);

  const enabledCount = useMemo(() => rules?.filter(r => r.enabled).length ?? 0, [rules]);
  const totalCount = rules?.length ?? 0;

  const isTokenExpired = account.token_expires_at < Date.now();

  // ── Helpers ────────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setKeyword('');
    setMatchType('contains');
    setTriggerType('dm');
    setMediaId('');
    setMediaUrl('');
    setReply('');
    setEnabled(true);
    setEditingRule(null);
    setShowForm(false);
  }, []);

  const openEdit = useCallback((rule: AutoDMRule) => {
    setKeyword(rule.keyword);
    setMatchType(rule.match_type);
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
      {showForm && (
        <Card className="border-purple-500/20 shadow-lg shadow-purple-500/5 animate-in slide-in-from-top-2 duration-300">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                </div>
                <CardTitle className="text-base">
                  {editingRule ? 'Edit Rule' : 'New Auto-Reply Rule'}
                </CardTitle>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <p className="text-xs text-muted-foreground">{MATCH_TYPE_CONFIG[matchType].description}</p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="auto-dm-trigger-type" className="text-sm font-medium">
                Trigger Source
              </Label>
              <Select value={triggerType} onValueChange={v => setTriggerType(v as TriggerType)}>
                <SelectTrigger id="auto-dm-trigger-type" className="bg-background/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRIGGER_TYPE_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <cfg.icon className="h-4 w-4 text-purple-400" />
                        <span>{cfg.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{TRIGGER_TYPE_CONFIG[triggerType].description}</p>
            </div>

            {triggerType === 'comment_specific' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
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
                    <Badge variant="outline" className={MATCH_TYPE_CONFIG[matchType].color}>
                      {React.createElement(MATCH_TYPE_CONFIG[matchType].icon, { className: 'h-3 w-3 mr-1' })}
                      {MATCH_TYPE_CONFIG[matchType].label}
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

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={resetForm} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !keyword.trim() || !reply.trim() || (triggerType === 'comment_specific' && !mediaId)}
                className="flex-1 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 border-0 text-white"
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
          </CardContent>
        </Card>
      )}

      {/* Rules List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 bg-muted rounded" />
                    <div className="h-3 w-2/3 bg-muted rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : rules && rules.length > 0 ? (
        <div className="space-y-3">
          {rules.map((rule, index) => {
            const mtConfig = MATCH_TYPE_CONFIG[rule.match_type] || MATCH_TYPE_CONFIG.contains;
            const tType = rule.trigger_type || 'dm';
            const trigConfig = TRIGGER_TYPE_CONFIG[tType] || TRIGGER_TYPE_CONFIG.dm;
            const isToggling = togglingIds.has(rule.id);

            return (
              <Card
                key={rule.id}
                className={`group transition-all duration-300 hover:shadow-md ${rule.enabled
                    ? 'border-white/10 hover:border-purple-500/20'
                    : 'border-white/5 opacity-60 hover:opacity-80'
                  }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${rule.enabled
                          ? 'bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20'
                          : 'bg-muted/50'
                        }`}
                      title={trigConfig.label}
                    >
                      <trigConfig.icon
                        className={`h-5 w-5 ${rule.enabled ? 'text-purple-400' : 'text-muted-foreground'}`}
                      />
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">&ldquo;{rule.keyword}&rdquo;</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${mtConfig.color}`}>
                          {React.createElement(mtConfig.icon, { className: 'h-2.5 w-2.5 mr-1' })}
                          {mtConfig.label}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-slate-500/10 text-slate-300 border-slate-500/20">
                          {trigConfig.short}
                        </Badge>
                        {rule.enabled ? (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          >
                            Active
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 bg-slate-500/15 text-slate-400 border-slate-500/30"
                          >
                            Paused
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                        ↳ {rule.reply}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => handleToggle(rule)}
                        disabled={isToggling}
                        aria-label={`Toggle rule "${rule.keyword}"`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => openEdit(rule)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
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
                </CardContent>
              </Card>
            );
          })}
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

      {/* Info tip */}
      {totalCount > 0 && (
        <Card className="bg-amber-500/5 border-amber-500/15">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-amber-400">How rules are applied</p>
              <p>
                When an Instagram DM arrives, rules are checked in order (oldest first). The first matching rule&apos;s
                reply is sent. Rules only fire for accounts authenticated via the connected Instagram above.
              </p>
            </div>
          </CardContent>
        </Card>
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

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-0">
      {/* Shared hero banner */}
      <HeroBanner connectedAccount={account ?? null} />

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
          creatorId={creatorId}
          account={account}
          onDisconnect={() => setAccount(null)}
        />
      )}
    </div>
  );
}
