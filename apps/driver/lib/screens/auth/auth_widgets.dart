import 'package:flutter/material.dart';

class AuthPalette {
  static const primary = Color(0xFF15304A);
  static const accent = Color(0xFF2F80ED);
  static const headline = Color(0xFF102A43);
  static const body = Color(0xFF52606D);
  static const border = Color(0xFFD7E2F0);
  static const surface = Color(0xFFF8FAFC);
  static const scaffold = Color(0xFFF3F6FA);
  static const accentSurface = Color(0xFFE8F1FB);
}

class AuthScaffold extends StatelessWidget {
  const AuthScaffold({
    required this.child,
    this.title,
    this.subtitle,
    this.maxWidth = 520,
    this.showBackButton,
    this.onBackPressed,
    this.headerTrailing,
    super.key,
  });

  final Widget child;
  final String? title;
  final String? subtitle;
  final double maxWidth;
  final bool? showBackButton;
  final VoidCallback? onBackPressed;
  final Widget? headerTrailing;

  @override
  Widget build(BuildContext context) {
    final canGoBack = showBackButton ?? Navigator.of(context).canPop();

    return Scaffold(
      backgroundColor: AuthPalette.scaffold,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: maxWidth),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      if (canGoBack)
                        IconButton.filledTonal(
                          onPressed: onBackPressed ??
                              () => Navigator.of(context).maybePop(),
                          icon: const Icon(Icons.arrow_back_rounded),
                          tooltip: 'Back',
                        )
                      else
                        const SizedBox(width: 48, height: 48),
                      if (headerTrailing != null)
                        headerTrailing!
                      else
                        const SizedBox(width: 48, height: 48),
                    ],
                  ),
                  Center(
                    child: Container(
                      width: 96,
                      height: 96,
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(28),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x140F172A),
                            blurRadius: 28,
                            offset: Offset(0, 14),
                          ),
                        ],
                      ),
                      child: Image.asset('assets/branding/tikur-abay-logo.png'),
                    ),
                  ),
                  if (title != null) ...[
                    const SizedBox(height: 24),
                    Text(
                      title!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: AuthPalette.headline,
                      ),
                    ),
                  ],
                  if (subtitle != null) ...[
                    const SizedBox(height: 10),
                    Text(
                      subtitle!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: AuthPalette.body,
                        fontSize: 14,
                        height: 1.5,
                      ),
                    ),
                  ],
                  const SizedBox(height: 28),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: child,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class AuthSectionTitle extends StatelessWidget {
  const AuthSectionTitle(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: AuthPalette.headline,
      ),
    );
  }
}

class AuthMutedText extends StatelessWidget {
  const AuthMutedText(
    this.text, {
    this.center = false,
    this.fontSize = 13,
    this.height = 1.45,
    super.key,
  });

  final String text;
  final bool center;
  final double fontSize;
  final double height;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      textAlign: center ? TextAlign.center : TextAlign.start,
      style: TextStyle(
        color: AuthPalette.body,
        fontSize: fontSize,
        height: height,
      ),
    );
  }
}

class AuthPrimaryButton extends StatelessWidget {
  const AuthPrimaryButton({
    required this.label,
    required this.onPressed,
    this.loading = false,
    this.loadingLabel,
    super.key,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final String? loadingLabel;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: loading ? null : onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: AuthPalette.primary,
        padding: const EdgeInsets.symmetric(vertical: 16),
      ),
      child: Text(loading ? (loadingLabel ?? label) : label),
    );
  }
}

class AuthInfoBanner extends StatelessWidget {
  const AuthInfoBanner({
    required this.text,
    this.icon = Icons.info_outline,
    this.foregroundColor = AuthPalette.primary,
    this.backgroundColor = AuthPalette.accentSurface,
    this.borderColor,
    super.key,
  });

  final String text;
  final IconData icon;
  final Color foregroundColor;
  final Color backgroundColor;
  final Color? borderColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(14),
        border: borderColor == null ? null : Border.all(color: borderColor!),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: foregroundColor),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                color: foregroundColor,
                fontWeight: FontWeight.w600,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class AuthFeedback {
  static void showMessage(BuildContext context, String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  static Future<void> showSupportInfo(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text(
                  'Customer Login Help',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AuthPalette.headline,
                  ),
                ),
                SizedBox(height: 10),
                AuthMutedText(
                  'Use your phone number in international format like +2519XXXXXXXX or use your email if phone login is not available.',
                ),
                SizedBox(height: 10),
                AuthMutedText(
                  'OTP codes are valid for 5 minutes. If the code does not arrive, use Resend Code or go back and correct the phone or email.',
                ),
                SizedBox(height: 10),
                AuthMutedText(
                  'For demo support, contact the Tikur Abay operations desk.',
                ),
                SizedBox(height: 12),
                _SupportInfoRow(
                  icon: Icons.email_outlined,
                  label: 'Email',
                  value: 'support@tikurabay.local',
                ),
                SizedBox(height: 8),
                _SupportInfoRow(
                  icon: Icons.phone_outlined,
                  label: 'Phone',
                  value: '+251 11 667 7000',
                ),
                SizedBox(height: 8),
                _SupportInfoRow(
                  icon: Icons.support_agent_outlined,
                  label: 'Help with',
                  value: 'OTP, account access, quotes, and booking setup',
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class AuthSupportLink extends StatelessWidget {
  const AuthSupportLink({super.key});

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: () => AuthFeedback.showSupportInfo(context),
      child: const Text('Need help? Contact support'),
    );
  }
}

class _SupportInfoRow extends StatelessWidget {
  const _SupportInfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: AuthPalette.primary),
        const SizedBox(width: 10),
        SizedBox(
          width: 72,
          child: Text(
            label,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              color: AuthPalette.headline,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(color: AuthPalette.body, height: 1.4),
          ),
        ),
      ],
    );
  }
}

class RoleChoiceCard extends StatelessWidget {
  const RoleChoiceCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.filled = false,
    super.key,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    final background = filled ? AuthPalette.primary : Colors.white;
    final foreground = filled ? Colors.white : AuthPalette.primary;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Ink(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: filled ? Colors.transparent : const Color(0xFFD7E2F0),
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x0F0F172A),
              blurRadius: 18,
              offset: Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: filled
                    ? Colors.white.withValues(alpha: 0.14)
                    : AuthPalette.accentSurface,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: foreground),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: foreground,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: filled
                          ? Colors.white.withValues(alpha: 0.82)
                          : AuthPalette.body,
                      fontSize: 13,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            Icon(Icons.arrow_forward, color: foreground),
          ],
        ),
      ),
    );
  }
}

class AuthTextField extends StatelessWidget {
  const AuthTextField({
    this.controller,
    required this.label,
    this.hint,
    this.keyboardType,
    this.readOnly = false,
    this.maxLines = 1,
    this.prefixIcon,
    this.onTap,
    this.obscureText = false,
    super.key,
  });

  final TextEditingController? controller;
  final String label;
  final String? hint;
  final TextInputType? keyboardType;
  final bool readOnly;
  final int maxLines;
  final Widget? prefixIcon;
  final VoidCallback? onTap;
  final bool obscureText;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      readOnly: readOnly,
      maxLines: maxLines,
      onTap: onTap,
      obscureText: obscureText,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: prefixIcon,
        filled: true,
        fillColor: AuthPalette.surface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AuthPalette.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AuthPalette.border),
        ),
      ),
    );
  }
}

class UploadStatusTile extends StatelessWidget {
  const UploadStatusTile({
    required this.title,
    required this.status,
    required this.actionLabel,
    required this.onPressed,
    this.priorityLabel,
    this.priorityColor,
    this.backgroundColor,
    this.borderColor,
    this.iconData,
    this.secondaryActionLabel,
    this.onSecondaryPressed,
    this.tertiaryActionLabel,
    this.onTertiaryPressed,
    super.key,
  });

  final String title;
  final String status;
  final String actionLabel;
  final VoidCallback onPressed;
  final String? priorityLabel;
  final Color? priorityColor;
  final Color? backgroundColor;
  final Color? borderColor;
  final IconData? iconData;
  final String? secondaryActionLabel;
  final VoidCallback? onSecondaryPressed;
  final String? tertiaryActionLabel;
  final VoidCallback? onTertiaryPressed;

  @override
  Widget build(BuildContext context) {
    final accentColor = priorityColor ?? const Color(0xFF15304A);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: backgroundColor ?? const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: borderColor ?? const Color(0xFFD7E2F0)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: accentColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              iconData ?? Icons.upload_file_outlined,
              color: accentColor,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF102A43),
                        ),
                      ),
                    ),
                    if (priorityLabel != null) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: accentColor.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          priorityLabel!,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: accentColor,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  status,
                  style: const TextStyle(
                    color: Color(0xFF52606D),
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisSize: MainAxisSize.min,
            children: [
              FilledButton.tonal(
                onPressed: onPressed,
                child: Text(actionLabel),
              ),
              if (secondaryActionLabel != null &&
                  onSecondaryPressed != null) ...[
                const SizedBox(height: 6),
                TextButton(
                  onPressed: onSecondaryPressed,
                  child: Text(secondaryActionLabel!),
                ),
              ],
              if (tertiaryActionLabel != null && onTertiaryPressed != null) ...[
                const SizedBox(height: 2),
                TextButton(
                  onPressed: onTertiaryPressed,
                  child: Text(tertiaryActionLabel!),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
