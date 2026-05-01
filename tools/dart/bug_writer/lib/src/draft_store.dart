import 'dart:io';
import 'dart:math';

import 'models.dart';
import 'template.dart';

/// File-backed draft store. Each draft is a single Markdown file under
/// `<bugwall_home>/drafts/<id>.md`.
class DraftStore {
  final Directory dir;
  final Random _rng;

  DraftStore(this.dir, {Random? rng}) : _rng = rng ?? Random();

  factory DraftStore.fromEnv() {
    final sep = Platform.pathSeparator;
    final base = Platform.environment['BUGWALL_HOME'] ??
        '${Platform.environment['HOME'] ?? Platform.environment['USERPROFILE'] ?? '.'}$sep.bugwall';
    return DraftStore(Directory('$base${sep}drafts'));
  }

  Future<void> ensureDir() async {
    if (!await dir.exists()) {
      await dir.create(recursive: true);
    }
  }

  String _newId() {
    final now = DateTime.now().toUtc();
    final ts = now.toIso8601String().replaceAll(RegExp(r'[^0-9]'), '');
    final stem = ts.substring(0, 14); // YYYYMMDDHHMMSS
    final suffix = _rng.nextInt(1 << 24).toRadixString(16).padLeft(6, '0');
    return 'draft-$stem-$suffix';
  }

  Future<Draft> create({
    String title = '',
    String description = '',
    Category? category,
    String author = '',
  }) async {
    await ensureDir();
    final now = DateTime.now().toUtc();
    // Re-roll if the (vanishingly unlikely) collision happens.
    String id = _newId();
    while (await File('${dir.path}${Platform.pathSeparator}$id.md').exists()) {
      id = _newId();
    }
    final draft = Draft(
      id: id,
      createdAt: now,
      updatedAt: now,
      title: title,
      description: description,
      category: category,
      author: author,
    );
    await save(draft);
    return draft;
  }

  Future<void> save(Draft d) async {
    await ensureDir();
    final file = File('${dir.path}${Platform.pathSeparator}${d.id}.md');
    await file.writeAsString(TemplateParser.fromDraft(d));
  }

  Future<Draft?> load(String id) async {
    final file = File('${dir.path}${Platform.pathSeparator}$id.md');
    if (!await file.exists()) return null;
    final content = await file.readAsString();
    final doc = TemplateParser.parse(content);
    final stat = await file.stat();
    // Use mtime as a fallback "when was this draft last touched"; the real
    // created_at lives in the frontmatter and TemplateParser.toDraft prefers it.
    return TemplateParser.toDraft(id, stat.modified, doc);
  }

  Future<List<Draft>> listAll() async {
    if (!await dir.exists()) return const [];
    final results = <Draft>[];
    await for (final entry in dir.list()) {
      if (entry is! File) continue;
      final name = entry.uri.pathSegments.last;
      if (!name.endsWith('.md')) continue;
      final id = name.substring(0, name.length - '.md'.length);
      final draft = await load(id);
      if (draft != null) results.add(draft);
    }
    results.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return results;
  }

  Future<bool> delete(String id) async {
    final file = File('${dir.path}${Platform.pathSeparator}$id.md');
    if (await file.exists()) {
      await file.delete();
      return true;
    }
    return false;
  }
}
