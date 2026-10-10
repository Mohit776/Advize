
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bell, KeyRound, User, FileText, Shield, Trash2 } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
} from "@/components/ui/alert-dialog";
import { useAuth, useFirestore, useUser } from '@/firebase';
import { deleteDoc, doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { deleteUser } from 'firebase/auth';
import Link from 'next/link';


export default function SettingsPage() {
    const { user } = useUser();
    const auth = useAuth();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleDeleteAccount = async () => {
        const currentUser = auth.currentUser;
        if (!user || !currentUser) {
            toast({ variant: "destructive", title: "Error", description: "You must be logged in to delete your account." });
            return;
        }

        setIsLoading(true);

        try {
            // IMPORTANT: Delete Firestore data BEFORE deleting the auth user.
            // This ensures the user is still authenticated for the database operations.
            const userDocRef = doc(firestore, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const role = userData.role;

                // Delete the role-specific profile document
                const profileDocRef = doc(firestore, `users/${user.uid}/${role}Profile`, user.uid);
                if ((await getDoc(profileDocRef)).exists()) {
                    await deleteDoc(profileDocRef);
                }
                
                // Delete the main user document
                await deleteDoc(userDocRef);
            }
            
            // Now, delete the auth user record.
            await deleteUser(currentUser);

            toast({
                title: "Account Deleted",
                description: "Your account has been permanently deleted.",
            });

            router.push('/');

        } catch (error: any) {
            console.error("Failed to delete account:", error);
            if (error.code === 'auth/requires-recent-login') {
                toast({
                    variant: "destructive",
                    title: "Re-authentication Required",
                    description: "This is a security-sensitive action. Please log out and log back in before deleting your account.",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Deletion Failed",
                    description: error.message || "An error occurred while deleting your account. Please try again.",
                });
            }
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="w-full max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline">Settings</h1>
                <p className="text-muted-foreground">Manage your account and preferences.</p>
            </div>
            <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                <AccordionItem value="item-1">
                    <AccordionTrigger className="text-lg font-semibold font-headline">
                        <div className="flex items-center gap-3">
                            <User className="w-5 h-5" /> Account
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <Card className="border-none shadow-none">
                            <CardHeader>
                                <CardTitle className="text-base">Account Information</CardTitle>
                                <CardDescription>This information is private and will not be shown on your public profile.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input id="name" defaultValue={user?.displayName || ''} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input id="email" type="email" defaultValue={user?.email || ''} disabled />
                                </div>
                                <Button size="sm">Save Changes</Button>
                            </CardContent>
                        </Card>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                     <AccordionTrigger className="text-lg font-semibold font-headline">
                        <div className="flex items-center gap-3">
                            <KeyRound className="w-5 h-5" /> Password
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <Card className="border-none shadow-none">
                            <CardHeader>
                                <CardTitle className="text-base">Change Password</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="current-password">Current Password</Label>
                                    <Input id="current-password" type="password" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="new-password">New Password</Label>
                                    <Input id="new-password" type="password" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                                    <Input id="confirm-password" type="password" />
                                </div>
                                <Button size="sm">Update Password</Button>
                            </CardContent>
                        </Card>
                    </AccordionContent>
                </AccordionItem>
                 <AccordionItem value="item-3">
                    <AccordionTrigger className="text-lg font-semibold font-headline">
                        <div className="flex items-center gap-3">
                            <Bell className="w-5 h-5" /> Notifications
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                       <Card className="border-none shadow-none">
                         <CardHeader>
                            <CardTitle className="text-base">Notification Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <p className="text-muted-foreground">Notification settings coming soon!</p>
                        </CardContent>
                    </Card>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                    <AccordionTrigger className="text-lg font-semibold font-headline">
                        <div className="flex items-center gap-3">
                            <Shield className="w-5 h-5" /> Legal & Information
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                       <Card className="border-none shadow-none">
                         <CardHeader>
                            <CardTitle className="text-base">Policies</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <Button asChild variant="outline" size="sm">
                               <Link href="/privacy">
                                <Shield className="mr-2 h-4 w-4" />
                                View Privacy Policy
                               </Link>
                           </Button>
                            <Button asChild variant="outline" size="sm">
                               <Link href="/terms">
                                <FileText className="mr-2 h-4 w-4" />
                                View Terms of Service
                               </Link>
                           </Button>
                        </CardContent>
                    </Card>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5" className="border-b-0">
                    <AccordionTrigger className="text-lg font-semibold text-destructive hover:no-underline">
                        <div className="flex items-center gap-3">
                            <Trash2 className="w-5 h-5" /> Delete Account
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                       <Card className="border-none shadow-none">
                         <CardHeader>
                            <CardTitle className="text-base text-destructive">Permanently Delete Account</CardTitle>
                            <CardDescription>This action is not reversible. All your data will be permanently removed. Please be certain.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" disabled={isLoading}>
                                        {isLoading ? 'Deleting...' : 'I understand, delete my account'}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete your
                                        account and all associated data from our servers.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteAccount} disabled={isLoading} className="bg-destructive hover:bg-destructive/90">
                                        Continue
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
}
