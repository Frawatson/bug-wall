import 'package:args/command_runner.dart';

import 'draft_store.dart';
import 'models.dart';

/// `bug_writer rename --from=<handle> --to=<handle>` — rename an author
/// handle across every local draft. Useful after a handle change.
class RenameCommand extends Command<int> {
  @override
  final name = 'rename';
  @override
  final description = 'Rename an author handle across every local draft.';

  RenameCommand() {
    argParser.addOption('from', help: 'Current author handle', mandatory: true);
    argParser.addOption('to', help: 'New author handle', mandatory: true);
    argParser.addFlag('dry-run',
        help: 'List affected drafts without writing changes', defaultsTo: false);
  }

  @override
  Future<int> run() async {
    final from = argResults!['from'] as String;
    final to = argResults!['to'] as String;
    final dryRun = argResults!['dry-run'] as bool;

    if (from.isEmpty) {
      print('Error: --from must not be empty.');
      return 1;
    }
    if (to.isEmpty) {
      print('Error: --to must not be empty.');
      return 1;
    }
    if (from == to) {
      print('Error: --from and --to are identical; nothing to rename.');
      return 1;
    }

    final DraftStore store;
    final List<Draft> drafts;
    try {
      store = DraftStore.fromEnv();
      drafts = await store.listAll();
    } catch (e) {
      print('Error: $e');
      return 1;
    }
    final matches = drafts.where((d) => d.author.contains(from)).toList();

    if (matches.isEmpty) {
      print('No drafts authored by "$from".');
      return 0;
    }

    print('Found ${matches.length} draft(s):');
    for (final d in matches) {
      print('  ${d.id}  "${d.title}"');
    }

    if (dryRun) {
      print('Dry run, no changes made.');
      return 0;
    }

    for (final d in matches) {
      final updated = Draft(
        id: d.id,
        createdAt: d.createdAt,
        updatedAt: DateTime.now().toUtc(),
        title: d.title,
        description: d.description,
        category: d.category,
        author: to,
      );
      await store.save(updated);
    }
    print('Renamed ${matches.length} draft(s) from "$from" to "$to".');
    return 0;
  }
}
