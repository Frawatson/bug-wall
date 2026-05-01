import 'models.dart';

/// A parsed front-matter document: a fields map plus the body that followed it.
class FrontmatterDoc {
  final Map<String, String> fields;
  final String body;

  FrontmatterDoc({required this.fields, required this.body});
}

/// A tiny YAML-ish parser for `--- key: value --- body` documents. Keeps the
/// dependency footprint zero — no real YAML, no quoting, no nesting. Values
/// that contain newlines or fence sequences are rejected at serialise time
/// to keep round-trips honest.
class TemplateParser {
  static const _fence = '---';

  static FrontmatterDoc parse(String content) {
    final lines = content.split('\n');
    if (lines.isEmpty || lines.first.trim() != _fence) {
      return FrontmatterDoc(fields: const {}, body: content);
    }
    final fields = <String, String>{};
    var i = 1;
    while (i < lines.length && lines[i].trim() != _fence) {
      final line = lines[i];
      final colon = line.indexOf(':');
      if (colon > 0) {
        final key = line.substring(0, colon).trim();
        final value = line.substring(colon + 1).trim();
        fields[key] = value;
      }
      i++;
    }
    if (i >= lines.length) {
      return FrontmatterDoc(fields: const {}, body: content);
    }
    final body = lines.sublist(i + 1).join('\n').trim();
    return FrontmatterDoc(fields: fields, body: body);
  }

  static String serialize(FrontmatterDoc doc) {
    final sb = StringBuffer();
    sb.writeln(_fence);
    doc.fields.forEach((k, v) {
      _checkInlineValue(k, v);
      sb.writeln('$k: $v');
    });
    sb.writeln(_fence);
    sb.writeln();
    sb.write(doc.body);
    return sb.toString();
  }

  static void _checkInlineValue(String key, String value) {
    if (value.contains('\n') || value.contains('\r')) {
      throw FormatException(
          'frontmatter value for "$key" cannot contain newlines');
    }
    if (value.trim() == _fence) {
      throw FormatException(
          'frontmatter value for "$key" cannot be the fence "---"');
    }
  }

  static Draft toDraft(String id, DateTime fallbackCreatedAt, FrontmatterDoc doc) {
    final createdAt = _parseIso(doc.fields['created_at']) ?? fallbackCreatedAt;
    final updatedAt = _parseIso(doc.fields['updated_at']) ?? createdAt;
    final categoryName = doc.fields['category'];
    return Draft(
      id: id,
      createdAt: createdAt,
      updatedAt: updatedAt,
      title: doc.fields['title'] ?? '',
      description: doc.body,
      category: (categoryName != null && categoryName.isNotEmpty)
          ? Category.fromName(categoryName)
          : null,
      author: doc.fields['author'] ?? '',
    );
  }

  static DateTime? _parseIso(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    return DateTime.tryParse(raw);
  }

  static String fromDraft(Draft d) {
    final fields = <String, String>{
      'title': d.title,
      'category': d.category?.name ?? '',
      'author': d.author,
      'created_at': d.createdAt.toIso8601String(),
      'updated_at': d.updatedAt.toIso8601String(),
    };
    return serialize(FrontmatterDoc(fields: fields, body: d.description));
  }
}
