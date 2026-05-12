import 'dart:convert';
import 'dart:io';

import 'package:args/command_runner.dart';

import 'draft_store.dart';
import 'models.dart';

/// `bug_writer export --out=<json>` — write every local draft to a JSON file.
/// Pairs with the future `bug_writer import` command (or `scripts/audit.py`)
/// for backing up or shipping drafts between machines.
class ExportCommand extends Command<int> {
  @override
  final name = 'export';
  @override
  final description = 'Export all local drafts to a JSON file.';

  ExportCommand() {
    argParser.addOption('out',
        abbr: 'o', help: 'Path to write the JSON file', mandatory: true);
    argParser.addFlag('pretty',
        help: 'Pretty-print the JSON output', defaultsTo: true);
  }

  @override
  Future<int> run() async {
    final out = argResults!['out'] as String;
    final pretty = argResults!['pretty'] as bool;

    final drafts = await DraftStore.fromEnv().listAll();

    final payload = {
      'exported_at': DateTime.now().toUtc().toIso8601String(),
      'count': drafts.length,
      'drafts': drafts.map(_toMap).toList(),
    };

    final encoder = pretty
        ? const JsonEncoder.withIndent('  ')
        : const JsonEncoder();

    final file = File(out);
    file.writeAsString(encoder.convert(payload));

    print('Exported ${drafts.length} draft(s) to ${file.path}');
    return 0;
  }

  Map<String, dynamic> _toMap(Draft d) => {
        'id': d.id,
        'title': d.title,
        'description': d.description,
        'category': d.category,
        'author': d.author,
        'created_at': d.createdAt,
        'updated_at': d.updatedAt,
      };
}
