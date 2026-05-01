import 'dart:io';

import 'package:args/command_runner.dart';

import 'db_writer.dart';
import 'draft_store.dart';
import 'models.dart';
import 'validators.dart';

DraftStore _store() => DraftStore.fromEnv();

class NewCommand extends Command<int> {
  @override
  final name = 'new';
  @override
  final description = 'Start a new local draft.';

  NewCommand() {
    argParser.addOption('title', help: 'Draft title');
    argParser.addOption('category',
        allowed: Category.values.map((c) => c.name),
        help: 'One of: ${Category.values.map((c) => c.name).join(', ')}');
    argParser.addOption('author', help: 'Your handle');
  }

  @override
  Future<int> run() async {
    final store = _store();
    final categoryName = argResults!['category'] as String?;
    final draft = await store.create(
      title: (argResults!['title'] as String?) ?? '',
      author: (argResults!['author'] as String?) ?? '',
      category: categoryName != null ? Category.fromName(categoryName) : null,
    );
    print('Created draft: ${draft.id}');
    print('  ${store.dir.path}${Platform.pathSeparator}${draft.id}.md');
    print('Edit it, then run: bug_writer validate ${draft.id}');
    return 0;
  }
}

class ListCommand extends Command<int> {
  @override
  final name = 'list';
  @override
  final description = 'List local drafts, newest first.';

  @override
  Future<int> run() async {
    final drafts = await _store().listAll();
    if (drafts.isEmpty) {
      print('No drafts.');
      return 0;
    }
    print('${drafts.length} draft(s):');
    for (final d in drafts) {
      final cat = d.category?.name ?? '<no-category>';
      final title = d.title.isEmpty ? '<no-title>' : d.title;
      print('  ${d.id}  $cat  "$title"');
    }
    return 0;
  }
}

class ValidateCommand extends Command<int> {
  @override
  final name = 'validate';
  @override
  final description = 'Validate a draft against the same rules the web form uses.';

  @override
  Future<int> run() async {
    final rest = argResults!.rest;
    if (rest.isEmpty) {
      throw UsageException('validate requires a draft id', '');
    }
    final id = rest.first;
    final draft = await _store().load(id);
    if (draft == null) {
      stderr.writeln('Draft not found: $id');
      return 1;
    }
    final errors = BugValidator.validateDraft(draft);
    if (errors.isEmpty) {
      print('✅ Draft "${draft.title}" is valid.');
      return 0;
    }
    print('❌ ${errors.length} error(s):');
    for (final e in errors) {
      print('  - $e');
    }
    return 1;
  }
}

class SubmitCommand extends Command<int> {
  @override
  final name = 'submit';
  @override
  final description = 'Validate and submit a draft to the Bug Wall database.';

  SubmitCommand() {
    argParser.addFlag('keep',
        help: 'Keep the local draft after submission', defaultsTo: false);
  }

  @override
  Future<int> run() async {
    final rest = argResults!.rest;
    if (rest.isEmpty) {
      throw UsageException('submit requires a draft id', '');
    }
    final id = rest.first;
    final store = _store();
    final draft = await store.load(id);
    if (draft == null) {
      stderr.writeln('Draft not found: $id');
      return 1;
    }
    final Bug bug;
    try {
      bug = BugValidator.toBug(draft);
    } on ValidationError catch (e) {
      stderr.writeln('Cannot submit: $e');
      return 1;
    }
    final assignedId = await DbWriter().insertBug(bug);
    print('Submitted as bug #$assignedId — "${bug.title}"');
    if (!(argResults!['keep'] as bool)) {
      await store.delete(id);
      print('Deleted local draft.');
    }
    return 0;
  }
}
