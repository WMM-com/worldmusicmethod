import jsPDF from 'jspdf';

export function generateReferralGuide(): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const addPage = () => {
    doc.addPage();
    y = 20;
  };

  const checkPage = (needed: number) => {
    if (y + needed > 270) addPage();
  };

  const heading = (text: string, size = 16) => {
    checkPage(15);
    doc.setFontSize(size);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(text, margin, y);
    y += size * 0.6 + 4;
  };

  const subheading = (text: string) => {
    checkPage(12);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text(text, margin, y);
    y += 8;
  };

  const body = (text: string, indent = 0) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    checkPage(lines.length * 5 + 2);
    doc.text(lines, margin + indent, y);
    y += lines.length * 5 + 2;
  };

  const bullet = (text: string, indent = 5) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(text, contentWidth - indent - 5);
    checkPage(lines.length * 5 + 2);
    doc.text('•', margin + indent, y);
    doc.text(lines, margin + indent + 5, y);
    y += lines.length * 5 + 2;
  };

  const tableRow = (cols: string[], widths: number[], isHeader = false) => {
    checkPage(8);
    doc.setFontSize(9);
    doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
    doc.setTextColor(isHeader ? 30 : 60, isHeader ? 30 : 60, isHeader ? 30 : 60);
    
    if (isHeader) {
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y - 4, contentWidth, 7, 'F');
    }
    
    let x = margin;
    cols.forEach((col, i) => {
      const lines = doc.splitTextToSize(col, widths[i] - 2);
      doc.text(lines[0] || '', x + 1, y);
      x += widths[i];
    });
    y += 6;
  };

  const separator = () => {
    y += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  };

  // ===== TITLE =====
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('Referral System', margin, y);
  y += 8;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Complete Guide', margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, y);
  y += 10;
  separator();

  // ===== SECTION 1: WHAT'S WORKING =====
  heading('1. Current State — What\'s Working');

  const statusWidths = [75, 55, 40];
  tableRow(['Component', 'Details', 'Status'], statusWidths, true);
  tableRow(['Referral code generation', '8-char unique codes', '✓ Working'], statusWidths);
  tableRow(['Cookie tracking', '?ref=CODE → 10-day cookie', '✓ Working'], statusWidths);
  tableRow(['Link referral on signup', 'Auto-links in AuthContext', '✓ Working'], statusWidths);
  tableRow(['Signup milestones', '$10 bonus at 5/10/20/50/100', '✓ Working'], statusWidths);
  tableRow(['Credit storage', 'user_credits table (USD cents)', '✓ Working'], statusWidths);
  tableRow(['Credit transaction log', 'Full history of changes', '✓ Working'], statusWidths);
  tableRow(['Credit display in UI', 'Account → Invite Friends', '✓ Working'], statusWidths);
  tableRow(['Credit at checkout', 'Toggle + currency conversion', '✓ Working'], statusWidths);
  tableRow(['Free credit checkout', '100% credit bypass Stripe', '✓ Working'], statusWidths);
  tableRow(['Partial credit discount', 'Reduces payment intent', '✓ Working'], statusWidths);
  tableRow(['Invite Friends UI', 'Profile + Account + share', '✓ Working'], statusWidths);
  y += 4;

  // ===== SECTION 2: HOW IT WORKS =====
  separator();
  heading('2. How the Referral Flow Works');

  subheading('Step 1: Sharing');
  body('User goes to Profile → "Invite Friends" button or Account → Invite Friends sidebar. Copies their unique referral link and shares via Copy, Twitter/X, WhatsApp, or Email.');
  y += 2;

  subheading('Step 2: Clicking');
  body('Visitor clicks the referral link. The ?ref= parameter is detected by the ReferralTracker component. The referral code is saved in a browser cookie (lasts 10 days).');
  y += 2;

  subheading('Step 3: Signing Up');
  body('Visitor creates an account. On signup, AuthContext calls linkReferralOnSignup() which:');
  bullet('Validates the referral code exists and hasn\'t expired');
  bullet('Links the new user to the referrer in the referrals table');
  bullet('Checks and awards any signup milestones ($10 bonus per 5 signups)');
  bullet('Clears the referral cookie');
  y += 2;

  subheading('Step 4: Earning Credits (⚠ Partially Missing)');
  bullet('Working: $10 milestone bonuses on signup counts (5, 10, 20, 50, 100)');
  bullet('Missing: Commission credits when referred user makes a purchase (needs Stripe webhook)');
  y += 2;

  subheading('Step 5: Spending Credits');
  body('At checkout, CreditPaymentSection appears if user has credits. User toggles "Use Referral Credit". Credits convert from USD to regional currency. If 100% covered: free checkout. If partial: reduces Stripe amount.');

  // ===== SECTION 3: WHERE THINGS ARE STORED =====
  separator();
  heading('3. Where Things Are Stored');

  subheading('Database Tables');
  const dbWidths = [50, 55, 65];
  tableRow(['Table', 'Purpose', 'Key Columns'], dbWidths, true);
  tableRow(['referrals', 'Tracks referral relationships', 'referrer_id, referred_user_id, code, status'], dbWidths);
  tableRow(['user_credits', 'Current balance per user', 'user_id, balance (USD cents)'], dbWidths);
  tableRow(['credit_transactions', 'Full credit change history', 'user_id, amount, type, description'], dbWidths);
  y += 4;

  subheading('UI Locations');
  const uiWidths = [70, 100];
  tableRow(['What', 'Where'], uiWidths, true);
  tableRow(['Referral link & share', 'Profile → "Invite Friends" button'], uiWidths);
  tableRow(['Credit balance & stats', 'Account → "Invite Friends" sidebar'], uiWidths);
  tableRow(['Credit at checkout', 'Checkout → "Use Referral Credit" toggle'], uiWidths);
  y += 4;

  subheading('Backend Functions');
  const fnWidths = [75, 95];
  tableRow(['Function', 'Purpose'], fnWidths, true);
  tableRow(['link-referral', 'Links signup to referrer, checks milestones'], fnWidths);
  tableRow(['create-payment-intent', 'Handles credit deduction for partial purchases'], fnWidths);
  tableRow(['complete-free-credit-checkout', 'Handles 100% credit-covered purchases'], fnWidths);
  y += 4;

  subheading('Database Functions (PostgreSQL)');
  tableRow(['Function', 'Purpose'], fnWidths, true);
  tableRow(['link_referred_signup()', 'Validates code, links user, prevents self-referral'], fnWidths);
  tableRow(['check_and_award_signup_milestone()', 'Awards $10 at 5/10/20/50/100 milestones'], fnWidths);
  tableRow(['award_referral_credit()', 'Generic: adds credits and logs transaction'], fnWidths);

  // ===== SECTION 4: WHAT'S MISSING =====
  addPage();
  heading('4. What\'s Missing');

  subheading('4.1 Stripe Webhook for Purchase Conversion Credits');
  body('Problem: When a referred user makes their first purchase, the referrer should earn commission credits (200% of first month subscription, 30% of course price). This requires knowing when a payment succeeds.');
  y += 2;
  body('Solution: A Stripe webhook endpoint that listens for checkout.session.completed and invoice.payment_succeeded events. The webhook would:');
  bullet('Receive payment event from Stripe');
  bullet('Look up if the paying user was referred by someone');
  bullet('Calculate the referral commission');
  bullet('Call award_referral_credit() to credit the referrer');
  y += 4;

  subheading('4.2 Applying Credits to Existing Subscriptions');
  body('Problem: If a user has credits and an active subscription, those credits should automatically discount their next subscription invoice.');
  y += 2;
  body('Solution: On invoice.payment_succeeded webhook, check if subscriber has credits and create a Stripe credit note or customer balance adjustment on the next invoice.');
  y += 4;

  // ===== SECTION 5: STRIPE WEBHOOK SETUP =====
  separator();
  heading('5. Stripe Webhook — Setup Guide');

  subheading('What is a Stripe Webhook?');
  body('A webhook is a URL that Stripe calls automatically when events happen (e.g., a payment succeeds). It lets your backend react to payments in real-time.');
  y += 2;

  subheading('What You Need It For');
  bullet('Detecting when a referred user completes a purchase → award referral commission');
  bullet('Applying credits to subscription invoices automatically');
  y += 2;

  subheading('How to Get the Webhook Secret');
  body('1. Go to Stripe Dashboard → Developers → Webhooks');
  body('2. Click "Add endpoint"');
  body('3. Enter endpoint URL:');
  body('   https://bfwvjhrokucqjcbeufwk.supabase.co/functions/v1/stripe-webhook', 5);
  body('4. Select events:');
  bullet('checkout.session.completed', 10);
  bullet('invoice.payment_succeeded', 10);
  body('5. Click "Add endpoint"');
  body('6. Click "Reveal" next to "Signing secret"');
  body('7. Copy the whsec_... value');
  y += 2;

  subheading('How to Add It to the Project');
  body('Provide the whsec_... value to Lovable AI when prompted. It will be securely stored as the STRIPE_WEBHOOK_SECRET environment variable.');

  // ===== SECTION 6: CREDIT REWARDS =====
  separator();
  heading('6. Credit Reward Structure');

  const rewardWidths = [65, 55, 50];
  tableRow(['Trigger', 'Reward', 'Status'], rewardWidths, true);
  tableRow(['Every 5 referral signups', '$10 milestone bonus', '✓ Working'], rewardWidths);
  tableRow(['Referred user buys subscription', '200% of 1st month price', '⚠ Needs webhook'], rewardWidths);
  tableRow(['Referred user buys course', '30% of course price', '⚠ Needs webhook'], rewardWidths);

  // ===== SECTION 7: SECRETS =====
  y += 6;
  heading('7. Required Secrets');

  const secretWidths = [65, 65, 40];
  tableRow(['Secret Name', 'Purpose', 'Status'], secretWidths, true);
  tableRow(['STRIPE_SECRET_KEY', 'Payment intents & customers', '✓ Configured'], secretWidths);
  tableRow(['STRIPE_WEBHOOK_SECRET', 'Verify webhook signatures', '✗ Needs adding'], secretWidths);

  // ===== SECTION 8: NEXT STEPS =====
  y += 6;
  separator();
  heading('8. Next Steps (In Order)');

  body('1. Create Stripe Webhook Endpoint in Stripe Dashboard (see Section 5)');
  body('2. Add STRIPE_WEBHOOK_SECRET to project secrets');
  body('3. Ask Lovable to build the stripe-webhook edge function');
  body('4. Add subscription credit application logic');
  body('5. Test end-to-end: Share link → Signup → Purchase → Credits awarded → Credits spent');

  return doc;
}
