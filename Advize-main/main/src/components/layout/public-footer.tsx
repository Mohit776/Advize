
import { Mail, Phone, Instagram, Linkedin } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Separator } from '@/components/ui/separator';

export function PublicFooter() {
  return (
    <footer className="bg-background border-t border-border/50" id="contact">
      <div className="container py-8 md:py-12 px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="space-y-4 md:col-span-4">
            <Logo />
            <p className="text-sm text-muted-foreground max-w-sm">
              Transparent, data-driven influencer campaigns built on trust.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 md:col-span-8 md:grid-cols-3">
            <div className="space-y-4">
              <h4 className="font-headline font-semibold text-foreground">Company</h4>
              <ul className="space-y-2">
                <li><Link href="/#about" className="text-sm text-muted-foreground hover:text-foreground">About Us</Link></li>
                <li><Link href="/#faq" className="text-sm text-muted-foreground hover:text-foreground">FAQ</Link></li>
                <li><Link href="#contact" className="text-sm text-muted-foreground hover:text-foreground">Contact</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-headline font-semibold text-foreground">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms of Service</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-headline font-semibold text-foreground">Connect</h4>
              <ul className="space-y-2">
                <li><a href="mailto:contact@advize.in" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><Mail size={16} /> contact@advize.in</a></li>
                <li><a href="tel:+919140600553" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><Phone size={16} /> +91 9140600553</a></li>
                <li><Link href="https://www.instagram.com/advi.zofficial?igsh=MWNsOGl6NjJzdGMzcw==" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><Instagram size={16} /> Instagram</Link></li>
                <li><Link href="https://www.linkedin.com/in/advize-team-515603398/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><Linkedin size={16} /> LinkedIn</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <Separator className="my-8 bg-border/50" />
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-center text-muted-foreground">&copy; {new Date().getFullYear()} Advize. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
