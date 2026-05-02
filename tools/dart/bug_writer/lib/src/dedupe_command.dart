import 'package:args/command_runner.dart';

import 'draft_store.dart';
import 'models.dart';

/// `bug_writer dedupe` — find drafts that share the same (title, author) and
/// remove all but one copy. Useful after re-importing the same JSON snapshot
/// twice or after merging draft folders from two machines.
///
/// By default the oldest copy of each duplicate group is kept. Pass
/// `--keep-newest` to keep the most recently updated copy instead. Pass
/// `--dry-run` to preview the deletions without touching the filesystem.
class DedupeCommand extends Command<int> {
  @override
  final name = 'dedupe';
  @override
  final description =
      'Find and remove duplicate drafts (same title and author).';

  DedupeCommand() {
    argParser.addFlag('dry-run',
        help: 'List duplicates without deleting', defaultsTo: false);
    argParser.addFlag('keep-newest',
        help: 'Keep the newest copy of each duplicate group (default: oldest)',
        defaultsTo: false);
  }

  @override
  Future<int> run() async {
    final dryRun = argResults!['dry-run'] as bool;
    final keepNewest = argResults!['keep-newest'] as bool;

    final store = DraftStore.fromEnv();
    final drafts = await store.listAll();

    final groups = <String, List<Draft>>{};
    for (final d in drafts) {
      final key = '${d.title}|${d.author}';
      groups.putIfAbsent(key, () => []).add(d);
    }

    final duplicates = groups.values.where((g) => g.length > 1).toList();

    if (duplicates.isEmpty) {
      print('No duplicates found.');
      return 0;
    }

    var deletedCount = 0;
    for (final group in duplicates) {
      group.sort((a, b) => a.createdAt.compareTo(b.createdAt));

      final keeper = keepNewest ? group.last : group.first;
      final toDelete = group.where((d) => d.id != keeper.id).toList();

      print('Group "${keeper.title}" by @${keeper.author}: '
          'keeping ${keeper.id}, '
          '${dryRun ? "would delete" : "deleting"} ${toDelete.length} duplicate(s)');

      deletedCount += toDelete.length;
      if (!dryRun) {
        for (final d in toDelete) {
          try {
            await store.delete(d.id);
          } catch (e) {
            print('  Warning: failed to delete ${d.id}: $e');
            deletedCount--;
          }
        }
      }
    }

    final verb = dryRun ? 'Would delete' : 'Deleted';
    print('$verb $deletedCount duplicate(s) across ${duplicates.length} group(s).');
    return 0;
  }
}
