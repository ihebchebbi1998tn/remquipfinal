<?php
/**
 * Professional HTML email bodies (fragments). Plain-text fallbacks included.
 * All public functions return array{html: string, text: string}.
 */

function remquip_email_layout(string $preheader, string $title, string $innerHtml): string
{
    $pre = htmlspecialchars($preheader, ENT_QUOTES, 'UTF-8');
    $tit = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
    return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width">'
        . '<title>' . $tit . '</title></head>'
        . '<body style="margin:0;padding:0;background:#0f1419;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">'
        . '<span style="display:none;font-size:1px;color:#0f1419;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">'
        . $pre . '</span>'
        . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f1419;padding:24px 12px;">'
        . '<tr><td align="center">'
        . '<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#1a222c;border-radius:8px;overflow:hidden;border:1px solid #2a3441;">'
        . '<tr><td style="padding:28px 32px;background:linear-gradient(135deg,#1e2630 0%,#141a22 100%);border-bottom:3px solid #e85d04;">'
        . '<p style="margin:0;font-size:20px;font-weight:700;letter-spacing:0.08em;color:#f8fafc;">REMQUIP</p>'
        . '<p style="margin:8px 0 0;font-size:13px;color:#94a3b8;">Heavy-duty truck &amp; trailer parts</p></td></tr>'
        . '<tr><td style="padding:32px;color:#e2e8f0;font-size:15px;line-height:1.6;">'
        . '<h1 style="margin:0 0 16px;font-size:22px;color:#f8fafc;font-weight:600;">' . $tit . '</h1>'
        . $innerHtml
        . '</td></tr>'
        . '<tr><td style="padding:20px 32px;background:#141a22;border-top:1px solid #2a3441;font-size:12px;color:#64748b;">'
        . 'This message was sent by REMQUIP. If you did not expect it, you can ignore this email.</td></tr>'
        . '</table></td></tr></table></body></html>';
}

function remquip_tpl_password_reset(array $v): array
{
    $name = htmlspecialchars($v['name'] ?? 'there', ENT_QUOTES, 'UTF-8');
    $link = htmlspecialchars($v['reset_link'] ?? '#', ENT_QUOTES, 'UTF-8');
    $mins = (int)($v['expires_minutes'] ?? 60);
    $inner = '<p style="margin:0 0 16px;">Hi ' . $name . ',</p>'
        . '<p style="margin:0 0 20px;">We received a request to reset your account password. Click the button below to choose a new password. This link expires in <strong>' . $mins . ' minutes</strong>.</p>'
        . '<p style="margin:24px 0;"><a href="' . $link . '" style="display:inline-block;padding:14px 28px;background:#e85d04;color:#0f1419;text-decoration:none;font-weight:700;border-radius:4px;">Reset password</a></p>'
        . '<p style="margin:0 0 12px;font-size:13px;color:#94a3b8;">If the button does not work, copy and paste this URL into your browser:</p>'
        . '<p style="margin:0;word-break:break-all;font-size:12px;color:#cbd5e1;">' . $link . '</p>';
    $html = remquip_email_layout('Reset your REMQUIP password', 'Password reset', $inner);
    $text = "Hi {$v['name']},\n\nReset your password: {$v['reset_link']}\n\nThis link expires in {$mins} minutes.\n\n— REMQUIP";
    return ['html' => $html, 'text' => $text];
}

function remquip_tpl_order_new_admin(array $v): array
{
    $num = htmlspecialchars($v['order_number'] ?? '', ENT_QUOTES, 'UTF-8');
    $total = htmlspecialchars($v['total'] ?? '', ENT_QUOTES, 'UTF-8');
    $oid = htmlspecialchars($v['order_id'] ?? '', ENT_QUOTES, 'UTF-8');
    $inner = '<p style="margin:0 0 16px;">A new order has been placed on the storefront.</p>'
        . '<table role="presentation" cellspacing="0" cellpadding="8" style="width:100%;border-collapse:collapse;font-size:14px;">'
        . '<tr><td style="border-bottom:1px solid #2a3441;color:#94a3b8;">Order #</td><td style="border-bottom:1px solid #2a3441;"><strong>' . $num . '</strong></td></tr>'
        . '<tr><td style="border-bottom:1px solid #2a3441;color:#94a3b8;">Total</td><td style="border-bottom:1px solid #2a3441;">' . $total . '</td></tr>'
        . '<tr><td style="color:#94a3b8;">Order ID</td><td style="font-size:12px;word-break:break-all;">' . $oid . '</td></tr></table>';
    $html = remquip_email_layout('New order ' . $num, 'New order received', $inner);
    $text = "New order\nOrder #: {$v['order_number']}\nTotal: {$v['total']}\nOrder ID: {$v['order_id']}";
    return ['html' => $html, 'text' => $text];
}

function remquip_tpl_order_shipped_customer(array $v): array
{
    $num = htmlspecialchars($v['order_number'] ?? '', ENT_QUOTES, 'UTF-8');
    $carrier = isset($v['carrier']) ? htmlspecialchars((string)$v['carrier'], ENT_QUOTES, 'UTF-8') : '';
    $track = isset($v['tracking']) ? htmlspecialchars((string)$v['tracking'], ENT_QUOTES, 'UTF-8') : '';
    $inner = '<p style="margin:0 0 16px;">Good news — your order <strong>' . $num . '</strong> has shipped.</p>';
    if ($carrier !== '' && $track !== '') {
        $inner .= '<table role="presentation" cellspacing="0" cellpadding="8" style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px;">'
            . '<tr><td style="border-bottom:1px solid #2a3441;color:#94a3b8;width:120px;">Carrier</td><td style="border-bottom:1px solid #2a3441;">' . $carrier . '</td></tr>'
            . '<tr><td style="color:#94a3b8;">Tracking</td><td><strong>' . $track . '</strong></td></tr></table>';
    } elseif ($track !== '') {
        $inner .= '<p style="margin:12px 0 0;">Tracking: <strong>' . $track . '</strong></p>';
    }
    $inner .= '<p style="margin:24px 0 0;font-size:14px;">Thank you for choosing REMQUIP.</p>';
    $html = remquip_email_layout('Your order ' . $num . ' has shipped', 'Your order has shipped', $inner);
    $t = "Order {$v['order_number']} has shipped.\n";
    if (!empty($v['carrier']) && !empty($v['tracking'])) {
        $t .= "Carrier: {$v['carrier']}\nTracking: {$v['tracking']}\n";
    }
    $t .= "\n— REMQUIP";
    return ['html' => $html, 'text' => $t];
}

function remquip_tpl_new_customer_admin(array $v): array
{
    $company = htmlspecialchars($v['company'] ?? '', ENT_QUOTES, 'UTF-8');
    $email = htmlspecialchars($v['email'] ?? '', ENT_QUOTES, 'UTF-8');
    $inner = '<p style="margin:0 0 16px;">A new customer record was created from the storefront or admin.</p>'
        . '<table role="presentation" cellspacing="0" cellpadding="8" style="width:100%;border-collapse:collapse;">'
        . '<tr><td style="color:#94a3b8;width:100px;">Company</td><td><strong>' . $company . '</strong></td></tr>'
        . '<tr><td style="color:#94a3b8;">Email</td><td>' . $email . '</td></tr></table>';
    $html = remquip_email_layout('New customer ' . $email, 'New customer', $inner);
    $text = "New customer\nCompany: {$v['company']}\nEmail: {$v['email']}";
    return ['html' => $html, 'text' => $text];
}

function remquip_tpl_low_stock_admin(array $v): array
{
    $sku = htmlspecialchars($v['sku'] ?? '', ENT_QUOTES, 'UTF-8');
    $name = htmlspecialchars($v['name'] ?? '', ENT_QUOTES, 'UTF-8');
    $avail = htmlspecialchars((string)($v['available'] ?? ''), ENT_QUOTES, 'UTF-8');
    $reorder = htmlspecialchars((string)($v['reorder'] ?? ''), ENT_QUOTES, 'UTF-8');
    $inner = '<p style="margin:0 0 16px;">Inventory has fallen at or below the reorder level.</p>'
        . '<table role="presentation" cellspacing="0" cellpadding="8" style="width:100%;border-collapse:collapse;font-size:14px;">'
        . '<tr><td style="color:#94a3b8;">SKU</td><td><strong>' . $sku . '</strong></td></tr>'
        . '<tr><td style="color:#94a3b8;">Product</td><td>' . $name . '</td></tr>'
        . '<tr><td style="color:#94a3b8;">Available</td><td>' . $avail . '</td></tr>'
        . '<tr><td style="color:#94a3b8;">Reorder level</td><td>' . $reorder . '</td></tr></table>';
    $html = remquip_email_layout('Low stock: ' . $sku, 'Low stock alert', $inner);
    $text = "Low stock\nSKU: {$v['sku']}\nProduct: {$v['name']}\nAvailable: {$v['available']}\nReorder: {$v['reorder']}";
    return ['html' => $html, 'text' => $text];
}

function remquip_tpl_order_status_customer(array $v): array
{
    $num = htmlspecialchars($v['order_number'] ?? '', ENT_QUOTES, 'UTF-8');
    $status = htmlspecialchars($v['status'] ?? '', ENT_QUOTES, 'UTF-8');
    $inner = '<p style="margin:0 0 16px;">Your order <strong>' . $num . '</strong> status is now: <strong style="color:#e85d04;">' . $status . '</strong>.</p>'
        . '<p style="margin:0;font-size:14px;">You can sign in to your account or contact us if you have questions.</p>';
    $html = remquip_email_layout('Order ' . $num . ' — ' . $status, 'Order status update', $inner);
    $text = "Order {$v['order_number']} status is now: {$v['status']}.\n\n— REMQUIP";
    return ['html' => $html, 'text' => $text];
}

function remquip_tpl_order_paid_customer(array $v): array
{
    $num = htmlspecialchars($v['order_number'] ?? '', ENT_QUOTES, 'UTF-8');
    $total = htmlspecialchars($v['total'] ?? '', ENT_QUOTES, 'UTF-8');
    
    $inner = '<p style="margin:0 0 16px;">Great news! We have successfully received your payment for order <strong>' . $num . '</strong>.</p>'
        . '<p style="margin:0 0 16px;">We are now preparing your order for shipment. You will receive another email with tracking information once it leaves our warehouse.</p>'
        . '<table role="presentation" cellspacing="0" cellpadding="8" style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px;margin-bottom:24px;">'
        . '<tr><td style="border-bottom:1px solid #2a3441;color:#94a3b8;width:120px;">Order #</td><td style="border-bottom:1px solid #2a3441;"><strong>' . $num . '</strong></td></tr>'
        . '<tr><td style="color:#94a3b8;">Total Paid</td><td><strong>' . $total . '</strong></td></tr></table>'
        . '<p style="margin:24px 0 0;font-size:14px;">Thank you for shopping with REMQUIP.</p>';
        
    $html = remquip_email_layout('Payment confirmed for order ' . $num, 'Payment Successful', $inner);
    $text = "Payment confirmed for order {$num}.\nTotal Paid: {$total}\n\nWe are now preparing your order for shipment.\n\n— REMQUIP";
    
    return ['html' => $html, 'text' => $text];
}
