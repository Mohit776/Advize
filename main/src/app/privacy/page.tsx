
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicyPage() {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
          Privacy Policy
        </h1>
        <p className="mt-2 text-muted-foreground">Last Updated: July 22, 2024</p>
      </div>
      <Card>
        <CardContent className="prose prose-invert prose-sm md:prose-base max-w-none pt-6 space-y-4 text-muted-foreground">
          <p>
            Welcome to Advize ("we," "our," or "us"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform connecting brands and creators.
          </p>

          <h2 className="text-xl font-semibold text-foreground pt-4">1. Information We Collect</h2>
          <p>We may collect information about you in a variety of ways. The information we may collect on the platform includes:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Personal Data:</strong> Personally identifiable information, such as your name, email address, and demographic information (like your location and content categories), that you voluntarily give to us when you register with the platform.
            </li>
            <li>
              <strong>Profile Data for Creators:</strong> Information you provide for your public profile, including your bio, social media links, and portfolio items.
            </li>
            <li>
              <strong>Profile Data for Businesses:</strong> Information you provide for your business profile, such as brand name, industry, website, and company description.
            </li>
             <li>
              <strong>Financial Data:</strong> Data related to your payment methods (e.g., bank account, UPI ID) that we may collect when you set up your wallet for payouts. We do not store full payment card numbers; all transactions are processed by secure third-party payment processors.
            </li>
            <li>
              <strong>Data from Social Networks:</strong> We may collect information from your social networking sites, including your username, profile picture, and analytics data (views, likes, comments) for content submitted to campaigns.
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground pt-4">2. How We Use Your Information</h2>
          <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the platform to:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Create and manage your account.</li>
            <li>Facilitate collaboration between creators and businesses.</li>
            <li>Process payments and transactions.</li>
            <li>Analyze campaign performance and provide analytics.</li>
            <li>Communicate with you regarding your account or campaigns.</li>
            <li>Compile anonymous statistical data and analysis for internal use or with third parties.</li>
            <li>Monitor and analyze usage and trends to improve your experience with the platform.</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground pt-4">3. Disclosure of Your Information</h2>
          <p>We do not share your personal information with third parties except as described in this Privacy Policy. We may share information we have collected about you in certain situations:</p>
           <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Public Profiles:</strong> Your creator or business profile will be publicly visible to other users of the platform to facilitate collaborations.
            </li>
            <li>
              <strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law.
            </li>
            <li>
              <strong>Third-Party Service Providers:</strong> We may share your information with third parties that perform services for us or on our behalf, including payment processing, data analysis, and hosting services.
            </li>
          </ul>

           <h2 className="text-xl font-semibold text-foreground pt-4">4. Security of Your Information</h2>
          <p>We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.</p>

          <h2 className="text-xl font-semibold text-foreground pt-4">5. Your Rights and Choices</h2>
          <p>You may at any time review or change the information in your account or terminate your account by:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Logging into your account settings and updating your account.</li>
            <li>Contacting us using the contact information provided below.</li>
          </ul>
           <p className="pt-2">Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases. However, some information may be retained in our files to prevent fraud, troubleshoot problems, assist with any investigations, enforce our Terms of Service and/or comply with legal requirements.</p>

          <h2 className="text-xl font-semibold text-foreground pt-4">6. Contact Us</h2>
          <p>If you have questions or comments about this Privacy Policy, please contact us at:</p>
          <p className="pl-4">Advize Team<br />Email: contact@advize.in</p>
        </CardContent>
      </Card>
    </div>
  );
}
