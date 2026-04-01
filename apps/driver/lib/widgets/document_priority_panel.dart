import 'package:flutter/material.dart';

import '../services/document_priority_helper.dart';

class DocumentPriorityPanel extends StatelessWidget {
  const DocumentPriorityPanel({
    required this.title,
    required this.subtitle,
    required this.policies,
    required this.trailingLabelBuilder,
    this.onPolicyTap,
    this.maxItems = 3,
    this.leadingIcon = Icons.upload_file_outlined,
    this.wrapInCard = true,
    this.backgroundColor = const Color(0xFFF8FAFC),
    this.borderColor = const Color(0xFFD7E2F0),
    super.key,
  });

  final String title;
  final String subtitle;
  final List<Map<String, dynamic>> policies;
  final String Function(String? priority) trailingLabelBuilder;
  final ValueChanged<Map<String, dynamic>>? onPolicyTap;
  final int maxItems;
  final IconData leadingIcon;
  final bool wrapInCard;
  final Color backgroundColor;
  final Color borderColor;

  @override
  Widget build(BuildContext context) {
    final content = Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: const TextStyle(color: Color(0xFF52606D), height: 1.4),
          ),
          const SizedBox(height: 12),
          ...policies.take(maxItems).map((policy) {
            final priority = policy['priority']?.toString();
            final color = DocumentPriorityHelper.priorityColor(priority);
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: onPolicyTap == null ? null : () => onPolicyTap!(policy),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: color.withValues(alpha: 0.18)),
                  ),
                  child: Row(
                    children: [
                      Icon(leadingIcon, color: color),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          policy['label']?.toString() ??
                              policy['category']?.toString() ??
                              'Required document',
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        trailingLabelBuilder(priority),
                        style: TextStyle(
                          color: color,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                      if (onPolicyTap != null) ...[
                        const SizedBox(width: 8),
                        Icon(
                          Icons.arrow_forward_ios_rounded,
                          size: 14,
                          color: color,
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );

    if (!wrapInCard) {
      return Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: borderColor),
        ),
        child: content,
      );
    }

    return Card(
      color: backgroundColor,
      child: content,
    );
  }
}
