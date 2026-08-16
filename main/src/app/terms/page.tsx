
import { Card, CardContent } from '@/components/ui/card';

export default function TermsOfServicePage() {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
          Terms of Service
        </h1>
        <p className="mt-2 text-muted-foreground">Last Updated: July 22, 2024</p>
      </div>
      <Card>
        <CardContent className="prose prose-invert prose-sm md:prose-base max-w-none pt-6 space-y-4 text-muted-foreground">
          <p>
            Welcome to Advize. These Terms of Service ("Terms") govern your use of our platform and services. By accessing or using Advize, you agree to be bound by these Terms.
          </p>

          <h2 className="text-xl font-semibold text-foreground pt-4">1. Accounts</h2>
          <p>When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our service. You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password.</p>

          <h2 className="text-xl font-semibold text-foreground pt-4">2. User Conduct</h2>
          <p>You agree not to use the service to:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Post any information that is abusive, threatening, obscene, defamatory, libelous, or racially, sexually, religiously, or otherwise objectionable and offensive.</li>
            <li>Violate any applicable laws or regulations.</li>
            <li>Infringe on the intellectual property rights of others.</li>
            <li>Engage in any fraudulent activity, including misrepresenting your identity or affiliation.</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground pt-4">3. Content</h2>
          <p>Our platform allows creators and businesses to post content for campaigns. You retain all of your ownership rights in your content, but you are required to grant us and other users of the platform certain rights to that content. By submitting content, you grant Advize a worldwide, non-exclusive, royalty-free license to use, reproduce, and display such content in connection with the service.</p>

          <h2 className="text-xl font-semibold text-foreground pt-4">4. Intellectual Property</h2>
          <p>The service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of Advize and its licensors. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Advize.</p>
          
          <h2 className="text-xl font-semibold text-foreground pt-4">5. Termination</h2>
          <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the service will immediately cease.</p>

          <h2 className="text-xl font-semibold text-foreground pt-4">6. Limitation of Liability</h2>
          <p>In no event shall Advize, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service.</p>

           <h2 className="text-xl font-semibold text-foreground pt-4">7. Governing Law</h2>
          <p>These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions.</p>

          <h2 className="text-xl font-semibold text-foreground pt-4">8. Changes to Terms</h2>
          <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.</p>

          <h2 className="text-xl font-semibold text-foreground pt-4">9. Contact Us</h2>
          <p>If you have any questions about these Terms, please contact us at:</p>
          <p className="pl-4">Advize Team<br />Email: contact@advize.in</p>
        </CardContent>
      </Card>
    </div>
  );
}
