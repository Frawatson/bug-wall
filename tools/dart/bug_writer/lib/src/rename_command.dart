import 'package:args/command_runner.dart';

import 'draft_store.dart';
import 'models.dart';
import 'template.dart';

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
      print('Nothing to do: --from and --to are the same value.');
      return 0;
    }

    final store = DraftStore.fromEnv();
    // TODO: needs DraftStore.listByAuthor(handle) or a streaming/paginated API
    // to avoid loading the full draft corpus into memory. For now, load all and filter.
    final drafts = await store.listAll();
    // Use exact matching to avoid matching unrelated authors (e.g. empty string matches all).
    final matches = drafts.where((d) => d.author == from).toList();

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

    final now = DateTime.now().toUtc();
    final updated = matches
        .map((d) => Draft(
              id: d.id,
              createdAt: d.createdAt,
              updatedAt: now,
              title: d.title,
              description: d.description,
              category: d.category,
              author: to,
            ))
        .toList();
    // TODO: needs DraftStore.saveAll(List<Draft>) bulk-write API to reduce to a single write operation.
    await Future.wait(updated.map((d) => store.save(d)));
    print('Renamed ${matches.length} draft(s) from "$from" to "$to".');
    return 0;
  }
}
