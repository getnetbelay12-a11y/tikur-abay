import 'package:flutter/material.dart';

class DetailListCard extends StatelessWidget {
  const DetailListCard({
    required this.title,
    required this.subtitle,
    this.leading,
    this.onTap,
    this.contentPadding = const EdgeInsets.all(16),
    super.key,
  });

  final String title;
  final String subtitle;
  final Widget? leading;
  final VoidCallback? onTap;
  final EdgeInsets contentPadding;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        onTap: onTap,
        leading: leading,
        contentPadding: contentPadding,
        title: Text(title),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Text(subtitle),
        ),
      ),
    );
  }
}
