
'use client';

import { useCollection, useFirestore, useUser, useMemoFirebase, addDocumentNonBlocking, useDoc, updateDocumentNonBlocking, useStorage } from "@/firebase";
import { collection, query, orderBy, serverTimestamp, doc, addDoc } from "firebase/firestore";
import type { Group, Message, User as UserType } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, X, File as FileIcon, CornerDownRight, Smile } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

interface ChatInterfaceProps {
    groupId: string;
}

function MessageBubble({ message, isOwnMessage, onReply, onReact, currentUserId }: { message: Message, isOwnMessage: boolean, onReply: (message: Message) => void, onReact: (message: Message, emoji: string) => void, currentUserId: string | undefined }) {
    const isImage = message.attachment?.type === 'image';
    const hasText = !!message.text;

    const reactions = Object.entries(message.reactions || {});

    return (
        <div className={cn("group flex items-start gap-2.5 w-full", isOwnMessage ? "justify-end" : "justify-start")}>
            {!isOwnMessage && (
                <Avatar className="h-8 w-8">
                    <AvatarImage src={message.senderAvatar} />
                    <AvatarFallback>{message.senderName.charAt(0)}</AvatarFallback>
                </Avatar>
            )}

            {isOwnMessage && (
                <div className="hidden group-hover:flex items-center gap-1 self-center transition-opacity order-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onReply(message)}><CornerDownRight className="h-4 w-4" /></Button>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Smile className="h-4 w-4" /></Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 border-0 w-auto">
                            <EmojiPicker onEmojiClick={(emojiData: EmojiClickData) => onReact(message, emojiData.emoji)} />
                        </PopoverContent>
                    </Popover>
                </div>
            )}

            <div className={cn(
                "flex flex-col max-w-xs md:max-w-md relative",
                isOwnMessage ? "items-end order-2" : "items-start"
            )}>
                {!isOwnMessage && <p className="text-xs text-primary font-bold mb-1">{message.senderName}</p>}

                {message.replyTo && (
                    <div className="text-xs bg-muted/50 border-l-2 border-primary/50 px-2 py-1 rounded-t-md w-full">
                        <p className="font-bold text-primary">{message.replyTo.senderName}</p>
                        <p className="text-muted-foreground truncate">{message.replyTo.textSnippet}</p>
                    </div>
                )}

                <div className={cn(
                    "rounded-lg px-4 py-2",
                    isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted",
                    isImage && !hasText ? "p-1 bg-transparent" : "",
                    message.replyTo && 'rounded-t-none'
                )}>
                    {isImage && message.attachment && (
                        <a href={message.attachment.url} target="_blank" rel="noopener noreferrer">
                            <Image
                                src={message.attachment.url}
                                alt={message.attachment.name}
                                width={250}
                                height={250}
                                className="rounded-md object-cover"
                            />
                        </a>
                    )}
                    {message.attachment?.type === 'file' && (
                        <a href={message.attachment.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-md bg-background/20">
                            <FileIcon className="h-6 w-6 flex-shrink-0" />
                            <span className="text-sm font-medium truncate">{message.attachment.name}</span>
                        </a>
                    )}
                    {hasText && <p className="text-sm break-words">{message.text}</p>}
                </div>
                {reactions.length > 0 && (
                    <div className="flex gap-1 mt-1 px-1">
                        {reactions.map(([emoji, userIds]) => (
                            <button
                                key={emoji}
                                onClick={() => onReact(message, emoji)}
                                className={cn(
                                    "px-2 py-0.5 rounded-full text-xs flex items-center gap-1 transition-colors",
                                    userIds.includes(currentUserId || '') ? "bg-primary/20 border border-primary/50" : "bg-muted hover:bg-muted/80 border border-transparent"
                                )}
                            >
                                <span>{emoji}</span>
                                <span>{userIds.length}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {!isOwnMessage && (
                <div className="hidden group-hover:flex items-center gap-1 self-center transition-opacity">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Smile className="h-4 w-4" /></Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 border-0 w-auto">
                            <EmojiPicker onEmojiClick={(emojiData: EmojiClickData) => onReact(message, emojiData.emoji)} />
                        </PopoverContent>
                    </Popover>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onReply(message)}><CornerDownRight className="h-4 w-4" /></Button>
                </div>
            )}


            {isOwnMessage && (
                <Avatar className="h-8 w-8 order-3">
                    <AvatarImage src={message.senderAvatar} />
                    <AvatarFallback>{message.senderName.charAt(0)}</AvatarFallback>
                </Avatar>
            )}
        </div>
    );
}

export function ChatInterface({ groupId }: ChatInterfaceProps) {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();
    const [newMessage, setNewMessage] = useState("");
    const [attachment, setAttachment] = useState<File | null>(null);
    const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [replyTo, setReplyTo] = useState<Message | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messageInputRef = useRef<HTMLInputElement>(null);

    const messagesQuery = useMemoFirebase(
        () => (user && firestore && groupId ? query(collection(firestore, `groups/${groupId}/messages`), orderBy("createdAt", "asc")) : null),
        [user, firestore, groupId]
    );
    const { data: messages, isLoading: messagesLoading, error: messagesError } = useCollection<Message>(messagesQuery);

    const { data: userDoc, isLoading: userDocLoading } = useDoc<UserType>(useMemoFirebase(() => (user ? doc(firestore, `users/${user.uid}`) : null), [user, firestore]));

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAttachment(file);
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setAttachmentPreview(reader.result as string);
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!firestore || !storage || !user || !userDoc || (!newMessage.trim() && !attachment)) return;

        setIsSending(true);

        let attachmentData: Message['attachment'] | undefined = undefined;

        if (attachment) {
            const storageRef = ref(storage, `chat-attachments/${groupId}/${Date.now()}-${attachment.name}`);
            try {
                const snapshot = await uploadBytes(storageRef, attachment);
                const downloadURL = await getDownloadURL(snapshot.ref);
                attachmentData = {
                    url: downloadURL,
                    type: attachment.type.startsWith('image/') ? 'image' : 'file',
                    name: attachment.name,
                };
            } catch (error) {
                console.error("File upload failed:", error);
                setIsSending(false);
                return;
            }
        }

        const messagePayload: any = {
            groupId: groupId,
            senderId: user.uid,
            senderName: userDoc.name,
            createdAt: serverTimestamp(),
            reactions: {},
        };

        // Only add senderAvatar if logoUrl exists
        if (userDoc.logoUrl) {
            messagePayload.senderAvatar = userDoc.logoUrl;
        }

        if (newMessage.trim()) {
            messagePayload.text = newMessage.trim();
        }

        if (attachmentData) {
            messagePayload.attachment = attachmentData;
        }

        if (replyTo) {
            messagePayload.replyTo = {
                messageId: replyTo.id,
                senderName: replyTo.senderName,
                textSnippet: replyTo.text?.substring(0, 70) || (replyTo.attachment?.name || 'Attachment'),
            }
        }

        const messagesColRef = collection(firestore, `groups/${groupId}/messages`);

        try {
            await addDoc(messagesColRef, messagePayload);
            setNewMessage("");
            setAttachment(null);
            setAttachmentPreview(null);
            setReplyTo(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setIsSending(false);
        }
    }

    const handleReply = (message: Message) => {
        setReplyTo(message);
        messageInputRef.current?.focus();
    }

    const handleReaction = (message: Message, emoji: string) => {
        if (!firestore || !user) return;

        const messageRef = doc(firestore, `groups/${groupId}/messages`, message.id);
        const currentReactions = message.reactions || {};
        const userList = currentReactions[emoji] || [];

        if (userList.includes(user.uid)) {
            // User is removing their reaction
            const updatedUserList = userList.filter(uid => uid !== user.uid);
            if (updatedUserList.length === 0) {
                delete currentReactions[emoji];
            } else {
                currentReactions[emoji] = updatedUserList;
            }
        } else {
            // User is adding a new reaction
            currentReactions[emoji] = [...userList, user.uid];
        }

        updateDocumentNonBlocking(messageRef, { reactions: currentReactions });
    };

    const isLoading = isUserLoading || messagesLoading || userDocLoading;

    // Handle permission errors gracefully
    if (messagesError) {
        return (
            <div className="flex flex-col h-full bg-card items-center justify-center p-8 text-center">
                <div className="text-destructive mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-destructive">Access Denied</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                    You don&apos;t have permission to access this chat. This may happen if you&apos;re not a member of this group.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[600px] bg-card rounded-lg border">
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {isLoading && (!messages || messages.length === 0) ? (
                    <div className="space-y-4">
                        <div className="flex items-end gap-2">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-16 w-48 rounded-lg" />
                        </div>
                        <div className="flex items-end gap-2 justify-end">
                            <Skeleton className="h-12 w-32 rounded-lg" />
                        </div>
                        <div className="flex items-end gap-2">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-10 w-64 rounded-lg" />
                        </div>
                    </div>
                ) : messages && messages.length > 0 ? (
                    messages.map(msg => (
                        <MessageBubble
                            key={msg.id}
                            message={msg}
                            isOwnMessage={msg.senderId === user?.uid}
                            onReply={handleReply}
                            onReact={handleReaction}
                            currentUserId={user?.uid}
                        />
                    ))
                ) : (
                    <div className="text-center text-muted-foreground pt-10">
                        <p>No messages yet.</p>
                        <p className="text-sm">Start the conversation!</p>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t bg-background space-y-2">
                {replyTo && (
                    <div className="bg-muted p-2 rounded-md flex justify-between items-center text-sm">
                        <div className="border-l-2 border-primary pl-2">
                            <p className="font-semibold">Replying to {replyTo.senderName}</p>
                            <p className="text-muted-foreground truncate">{replyTo.text?.substring(0, 70) || 'Attachment'}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyTo(null)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}
                {attachment && (
                    <div className="relative w-28 h-28 p-2 border rounded-lg">
                        {attachment.type.startsWith('image/') && attachmentPreview ? (
                            <Image src={attachmentPreview} alt="Preview" fill style={{ objectFit: 'cover' }} className="rounded-md" />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <FileIcon className="h-8 w-8 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground mt-1 truncate">{attachment.name}</p>
                            </div>
                        )}
                        <button
                            onClick={() => {
                                setAttachment(null);
                                setAttachmentPreview(null);
                                if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                            className="absolute -top-2 -right-2 bg-muted rounded-full p-1 text-foreground hover:bg-destructive"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isSending}>
                        <Paperclip className="h-5 w-5" />
                    </Button>
                    <Input
                        ref={messageInputRef}
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        disabled={isSending}
                    />
                    <Button type="submit" size="icon" disabled={isSending || (!newMessage.trim() && !attachment)}>
                        <Send className="h-5 w-5" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
